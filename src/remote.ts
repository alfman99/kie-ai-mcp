import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { landingPage } from "./landing.js";
import { KieHttpClient } from "./http.js";
import { createKieMcpServer, UploadPathSchema } from "./server.js";
import { TaskStore } from "./task-store.js";
import type { KieConfig } from "./types.js";

/** JSON-RPC error codes reused for transport-level failures. */
const INVALID_REQUEST = -32600;

export const MCP_PATH = "/mcp";
export const UPLOAD_PATH = "/upload";
export const HEALTH_PATH = "/healthz";
export const LANDING_PATH = "/";

/** KIE's own documented ceiling for a stream upload. Refused before a byte is forwarded. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const DEFAULT_UPLOAD_PATH = "agent-uploads";

/**
 * How long a tenant's task store survives without traffic. Long enough that idempotency keys and
 * cached results still work across a client's calls, short enough that idle keys are released.
 */
const TENANT_IDLE_TTL_MS = 60 * 60 * 1000;
const TENANT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_TENANTS = 500;

export function apiKeyFromHeaders(headers: IncomingMessage["headers"]): string | undefined {
  const authorization = headerValue(headers.authorization);
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    const bearer = match?.[1]?.trim();
    if (bearer) {
      return bearer;
    }
  }

  const explicit = headerValue(headers["x-kie-api-key"]);
  return explicit?.trim() || undefined;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Config for one caller: their key, and every local-filesystem affordance disabled. A hosted relay
 * must never read files from the server's disk on a remote caller's behalf.
 */
export function tenantConfig(baseConfig: KieConfig, apiKey: string, uploadIngestUrl?: string): KieConfig {
  return {
    ...baseConfig,
    apiKey,
    allowLocalFileUploads: false,
    localUploadRoot: undefined,
    uploadIngestUrl,
    // Each request opens its own short-lived server; prewarming would fire a HEAD per request.
    prewarmConnection: false
  };
}

function tenantId(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

type TenantEntry = { store: TaskStore; lastUsedAt: number };

/** Per-caller task stores, keyed by a hash of the API key so raw keys are never used as map keys. */
export class TenantRegistry {
  private readonly tenants = new Map<string, TenantEntry>();
  private lastSweepAt = Date.now();

  constructor(private readonly config: KieConfig) {}

  storeFor(apiKey: string): TaskStore {
    this.sweep();
    const id = tenantId(apiKey);
    const existing = this.tenants.get(id);
    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing.store;
    }

    const store = new TaskStore({
      submissionTtlMs: this.config.submissionTtlMs ?? 30 * 60 * 1000,
      resultTtlMs: this.config.resultCacheTtlMs ?? 30 * 60 * 1000,
      maxEntries: 500
    });
    this.tenants.set(id, { store, lastUsedAt: Date.now() });
    this.evictOverflow();
    return store;
  }

  get size(): number {
    return this.tenants.size;
  }

  private sweep(): void {
    const now = Date.now();
    if (now - this.lastSweepAt < TENANT_SWEEP_INTERVAL_MS) {
      return;
    }
    this.lastSweepAt = now;
    for (const [id, entry] of this.tenants) {
      if (now - entry.lastUsedAt > TENANT_IDLE_TTL_MS) {
        this.tenants.delete(id);
      }
    }
  }

  /** Drop the least recently used tenants so a burst of distinct keys cannot grow the map forever. */
  private evictOverflow(): void {
    if (this.tenants.size <= MAX_TENANTS) {
      return;
    }
    const ordered = [...this.tenants].sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt);
    for (const [id] of ordered.slice(0, this.tenants.size - MAX_TENANTS)) {
      this.tenants.delete(id);
    }
  }
}

function sendHtml(res: ServerResponse, status: number, body: string, includeBody: boolean): void {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  if (includeBody) {
    res.end(body);
  } else {
    res.end();
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendRpcError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, {
    jsonrpc: "2.0",
    error: { code: INVALID_REQUEST, message },
    id: null
  });
}

/** Extract the boundary token from a `multipart/form-data` content type, if that is what it is. */
export function multipartBoundary(contentType: string | undefined): string | undefined {
  if (!contentType || !/^\s*multipart\/form-data\b/i.test(contentType)) {
    return undefined;
  }
  const match = /;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  return match?.[1] ?? match?.[2];
}

/**
 * Render extra form fields as a multipart prefix using the caller's own boundary.
 *
 * A multipart body is just concatenated parts, so prepending well-formed ones to the incoming
 * stream lets the relay add `uploadPath` and `fileName` without parsing or buffering the file.
 */
function multipartFieldPrefix(boundary: string, fields: Record<string, string | undefined>): Buffer {
  let rendered = "";
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    rendered += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  }
  return Buffer.from(rendered, "utf8");
}

function uploadTooLarge(maxBytes: number): string {
  const limit = maxBytes >= 1024 * 1024 ? `${Math.round(maxBytes / (1024 * 1024))}MB` : `${maxBytes} bytes`;
  return `Upload is larger than this server's ${limit} limit.`;
}

/** A file name is interpolated into a header, so anything that could break out of one is refused. */
function isSafeFileName(value: string): boolean {
  return value.length <= 255 && !/["\\/\r\n\u0000]/.test(value) && value !== "." && value !== "..";
}

/**
 * The request body, prefixed with the injected fields and cut off past `maxBytes`.
 *
 * Content-Length is checked before this runs; the counter here is the backstop for a chunked
 * upload that never declared its size.
 */
function cappedBody(req: IncomingMessage, prefix: Buffer, maxBytes: number): BodyInit {
  async function* chunks(): AsyncGenerator<Buffer> {
    yield prefix;
    let forwarded = 0;
    for await (const chunk of req) {
      forwarded += (chunk as Buffer).length;
      if (forwarded > maxBytes) {
        throw new Error(uploadTooLarge(maxBytes));
      }
      yield chunk as Buffer;
    }
  }
  return Readable.toWeb(Readable.from(chunks())) as unknown as BodyInit;
}

/**
 * The externally reachable origin of this deployment, used to tell agents where to POST files.
 * KIE_PUBLIC_URL wins; otherwise it is reconstructed from the proxy headers of the live request.
 */
export function publicBaseUrl(req: IncomingMessage, override?: string): string | undefined {
  if (override) {
    return override.replace(/\/+$/, "");
  }
  const host = firstHeaderEntry(req.headers["x-forwarded-host"]) ?? headerValue(req.headers.host);
  if (!host) {
    return undefined;
  }
  const forwardedProto = firstHeaderEntry(req.headers["x-forwarded-proto"]);
  const isLoopback = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host);
  return `${forwardedProto ?? (isLoopback ? "http" : "https")}://${host}`;
}

function firstHeaderEntry(value: string | string[] | undefined): string | undefined {
  return headerValue(value)?.split(",")[0]?.trim() || undefined;
}

function readPositiveInteger(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type RemoteHandlerOptions = {
  config?: KieConfig;
  fetchImpl?: typeof fetch;
  /** Server-side gate in front of the relay, from KIE_REMOTE_ACCESS_TOKEN. */
  accessToken?: string;
  /** Externally reachable origin, from KIE_PUBLIC_URL, when proxy headers cannot be trusted. */
  publicUrl?: string;
  /** Largest accepted upload, from KIE_MAX_UPLOAD_BYTES. Defaults to KIE's own 100MB ceiling. */
  maxUploadBytes?: number;
};

/**
 * A Node request listener that serves the MCP Streamable HTTP transport.
 *
 * Stateless by design: every POST builds its own server and transport, so many callers with
 * different KIE keys can use one deployment concurrently without sharing anything but the
 * per-caller task store.
 */
export function createRemoteHandler(options: RemoteHandlerOptions = {}) {
  const config = options.config ?? loadConfig();
  const registry = new TenantRegistry(config);
  const accessToken = options.accessToken ?? process.env.KIE_REMOTE_ACCESS_TOKEN?.trim() ?? undefined;
  const publicUrlOverride = options.publicUrl ?? process.env.KIE_PUBLIC_URL?.trim() ?? undefined;
  const maxUploadBytes = options.maxUploadBytes ?? readPositiveInteger("KIE_MAX_UPLOAD_BYTES", MAX_UPLOAD_BYTES);

  /** Both endpoints take the same credentials: the relay gate, then the caller's own KIE key. */
  function authorize(req: IncomingMessage): { apiKey: string } | { status: number; message: string } {
    if (accessToken && headerValue(req.headers["x-kie-access-token"])?.trim() !== accessToken) {
      return { status: 401, message: "Missing or invalid X-KIE-Access-Token header." };
    }
    // Deliberately no fallback to a server-side key: the relay only ever spends the caller's credits.
    const apiKey = apiKeyFromHeaders(req.headers);
    if (!apiKey) {
      return {
        status: 401,
        message:
          "Missing KIE API key. Send your own key as `Authorization: Bearer <KIE_API_KEY>` or `X-KIE-API-Key: <KIE_API_KEY>`."
      };
    }
    return { apiKey };
  }

  function uploadIngestUrl(req: IncomingMessage): string | undefined {
    const origin = publicBaseUrl(req, publicUrlOverride);
    return origin ? `${origin}${UPLOAD_PATH}` : undefined;
  }

  /**
   * Take a file straight off the wire and hand it to KIE under the caller's own key.
   *
   * This is the relay's answer to having no filesystem: an agent POSTs the bytes here instead of
   * pushing a base64 blob through its own context window. Nothing is stored on this server.
   */
  async function handleUpload(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      sendJson(res, 405, { error: `Upload files with POST ${UPLOAD_PATH}.` });
      return;
    }

    const auth = authorize(req);
    if ("status" in auth) {
      sendJson(res, auth.status, { error: auth.message });
      return;
    }

    const boundary = multipartBoundary(headerValue(req.headers["content-type"]));
    if (!boundary) {
      sendJson(res, 415, {
        error: `Send the file as multipart/form-data in a field named "file", for example: curl -X POST ${uploadIngestUrl(req) ?? UPLOAD_PATH} -H "Authorization: Bearer $KIE_API_KEY" -F file=@/path/to/media.png`
      });
      return;
    }

    const uploadPath = url.searchParams.get("uploadPath") ?? DEFAULT_UPLOAD_PATH;
    const parsedUploadPath = UploadPathSchema.safeParse(uploadPath);
    if (!parsedUploadPath.success) {
      sendJson(res, 400, {
        error: "Use a relative uploadPath without empty, current-directory, or parent-directory segments."
      });
      return;
    }

    const fileName = url.searchParams.get("fileName") ?? undefined;
    if (fileName !== undefined && !isSafeFileName(fileName)) {
      sendJson(res, 400, { error: "fileName must not contain quotes, slashes, or line breaks." });
      return;
    }

    const declaredLength = Number.parseInt(headerValue(req.headers["content-length"]) ?? "", 10);
    if (Number.isFinite(declaredLength) && declaredLength > maxUploadBytes) {
      sendJson(res, 413, { error: uploadTooLarge(maxUploadBytes) });
      return;
    }

    const client = new KieHttpClient(tenantConfig(config, auth.apiKey), options.fetchImpl);
    const prefix = multipartFieldPrefix(boundary, { uploadPath: parsedUploadPath.data, fileName });

    try {
      const payload = await client.uploadMultipartBody({
        body: cappedBody(req, prefix, maxUploadBytes),
        contentType: `multipart/form-data; boundary=${boundary}`
      });
      sendJson(res, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      const status = message === uploadTooLarge(maxUploadBytes) ? 413 : 502;
      if (!res.headersSent) {
        sendJson(res, status, { error: message });
      } else {
        res.end();
      }
    }
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // A human who typed the bare hostname gets a page explaining what this is; every other path
    // stays a machine-facing JSON endpoint.
    if (url.pathname === LANDING_PATH && (req.method === "GET" || req.method === "HEAD")) {
      sendHtml(res, 200, landingPage(MCP_PATH, UPLOAD_PATH), req.method === "GET");
      return;
    }

    if (url.pathname === HEALTH_PATH) {
      sendJson(res, 200, { status: "ok", transport: "streamable-http", tenants: registry.size });
      return;
    }

    if (url.pathname === UPLOAD_PATH) {
      await handleUpload(req, res, url);
      return;
    }

    if (url.pathname !== MCP_PATH) {
      sendJson(res, 404, { error: `Not found. The MCP endpoint is ${MCP_PATH}.` });
      return;
    }

    // Stateless mode has no server-held session to resume or terminate.
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      sendRpcError(res, 405, "This MCP endpoint is stateless: use POST for every JSON-RPC message.");
      return;
    }

    const auth = authorize(req);
    if ("status" in auth) {
      sendRpcError(res, auth.status, auth.message);
      return;
    }
    const apiKey = auth.apiKey;

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const ingestUrl = uploadIngestUrl(req);
    const server = createKieMcpServer(
      tenantConfig(config, apiKey, ingestUrl),
      options.fetchImpl,
      registry.storeFor(apiKey)
    );

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      if (!res.headersSent) {
        sendRpcError(res, 500, error instanceof Error ? error.message : "Internal server error.");
      } else {
        res.end();
      }
    }
  };
}
