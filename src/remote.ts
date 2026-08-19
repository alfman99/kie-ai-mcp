import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { landingPage } from "./landing.js";
import { createKieMcpServer } from "./server.js";
import { TaskStore } from "./task-store.js";
import type { KieConfig } from "./types.js";

/** JSON-RPC error codes reused for transport-level failures. */
const INVALID_REQUEST = -32600;

export const MCP_PATH = "/mcp";
export const HEALTH_PATH = "/healthz";
export const LANDING_PATH = "/";

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
export function tenantConfig(baseConfig: KieConfig, apiKey: string): KieConfig {
  return {
    ...baseConfig,
    apiKey,
    allowLocalFileUploads: false,
    localUploadRoot: undefined,
    remoteRelay: true,
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

export type RemoteHandlerOptions = {
  config?: KieConfig;
  fetchImpl?: typeof fetch;
  /** Server-side gate in front of the relay, from KIE_REMOTE_ACCESS_TOKEN. */
  accessToken?: string;
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

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // A human who typed the bare hostname gets a page explaining what this is; every other path
    // stays a machine-facing JSON endpoint.
    if (url.pathname === LANDING_PATH && (req.method === "GET" || req.method === "HEAD")) {
      sendHtml(res, 200, landingPage(MCP_PATH), req.method === "GET");
      return;
    }

    if (url.pathname === HEALTH_PATH) {
      sendJson(res, 200, { status: "ok", transport: "streamable-http", tenants: registry.size });
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
    const server = createKieMcpServer(tenantConfig(config, apiKey), options.fetchImpl, registry.storeFor(apiKey));

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
