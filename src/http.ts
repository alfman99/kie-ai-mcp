import { openAsBlob } from "node:fs";
import { realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, sep } from "node:path";
import { KieApiError } from "./errors.js";
import { requireApiKey } from "./config.js";
import type { KieApiEnvelope, KieConfig, KieRequestOptions } from "./types.js";

function joinUrl(baseUrl: string, path: string): URL {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase);
}

function appendQuery(url: URL, query?: KieRequestOptions["query"]): void {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Parse a Retry-After header in either delta-seconds or HTTP-date form. */
export function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const seconds = Number(headerValue.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

function assertKieSuccess(response: Response, payload: unknown): void {
  const envelope = payload && typeof payload === "object" ? (payload as KieApiEnvelope) : undefined;
  const code = typeof envelope?.code === "number" ? envelope.code : undefined;
  const success = typeof envelope?.success === "boolean" ? envelope.success : undefined;

  if (!response.ok || (code !== undefined && code !== 200) || success === false) {
    const msg = envelope?.msg ? String(envelope.msg) : response.statusText || "KIE API request failed";
    const retryAfterMs = parseRetryAfterMs(response.headers?.get?.("retry-after") ?? null);
    throw new KieApiError(msg, {
      status: response.status,
      code,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      response: payload
    });
  }
}

/**
 * Strict counting semaphore. Batch tools fan out dozens of tasks, each polling on its own
 * schedule; without a shared ceiling those bursts land on KIE at the same instant and earn
 * 429s, which cost far more time than the queueing does.
 */
class RequestGate {
  private active = 0;
  private readonly waiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  constructor(private readonly limit: number) {}

  async acquire(signal?: AbortSignal): Promise<void> {
    if (this.limit <= 0 || this.active < this.limit) {
      this.active += 1;
      return;
    }
    if (signal?.aborted) {
      throw new Error("Request cancelled before it reached KIE.");
    }

    await new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve: () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        },
        reject: (error: Error) => {
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        }
      };
      const onAbort = () => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        waiter.reject(new Error("Request cancelled before it reached KIE."));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.waiters.push(waiter);
    });
  }

  release(): void {
    const next = this.waiters.shift();
    if (next) {
      // Hand the slot straight over so `active` never dips below the real in-flight count.
      next.resolve();
      return;
    }
    this.active = Math.max(0, this.active - 1);
  }
}

/** Combine the caller signal with a per-request deadline without mutating either. */
function requestSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined
): { signal: AbortSignal | undefined; cleanup: () => void } {
  if (timeoutMs === undefined || timeoutMs <= 0) {
    return { signal, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    controller.abort(signal.reason);
  } else {
    signal?.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(
    () => controller.abort(new Error(`KIE request exceeded its ${timeoutMs}ms deadline.`)),
    timeoutMs
  );
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}

async function resolveLocalUploadPath(filePath: string, configuredRoot?: string): Promise<string> {
  if (!isAbsolute(filePath)) {
    throw new Error("Local media uploads require an absolute file path.");
  }
  if (!configuredRoot) {
    throw new Error(
      "KIE_LOCAL_UPLOAD_ROOT is required for local uploads. Choose one folder containing only media you intend to send to KIE."
    );
  }
  if (!isAbsolute(configuredRoot)) {
    throw new Error("KIE_LOCAL_UPLOAD_ROOT must be an absolute directory path.");
  }

  const [rootPath, canonicalFilePath] = await Promise.all([
    realpath(configuredRoot),
    realpath(filePath)
  ]);
  const pathFromRoot = relative(rootPath, canonicalFilePath);
  const escapesRoot =
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot);

  if (escapesRoot) {
    throw new Error("Local media uploads are limited to the configured KIE_LOCAL_UPLOAD_ROOT folder.");
  }

  return canonicalFilePath;
}

export class KieHttpClient {
  private readonly gate: RequestGate;

  constructor(private readonly config: KieConfig, private readonly fetchImpl: typeof fetch = fetch) {
    this.gate = new RequestGate(config.maxConcurrentRequests ?? 8);
  }

  async requestJson<T = unknown>(options: KieRequestOptions): Promise<T> {
    const url = joinUrl(options.baseUrl ?? this.config.apiBaseUrl, options.path);
    appendQuery(url, options.query);

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers
    };

    if (options.requireApiKey !== false) {
      headers.Authorization = `Bearer ${requireApiKey(this.config)}`;
    }

    const init: RequestInit = {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers,
      signal: options.signal
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const deadline = requestSignal(options.signal, options.timeoutMs);
    init.signal = deadline.signal;

    await this.gate.acquire(options.signal);
    try {
      const response = await this.fetchImpl(url, init);
      const payload = await parseResponse(response);
      assertKieSuccess(response, payload);
      return payload as T;
    } finally {
      this.gate.release();
      deadline.cleanup();
    }
  }

  async uploadFileStream(args: { filePath: string; uploadPath: string; fileName?: string }): Promise<unknown> {
    const apiKey = requireApiKey(this.config);
    const url = joinUrl(this.config.uploadBaseUrl, "/api/file-stream-upload");
    const canonicalFilePath = await resolveLocalUploadPath(args.filePath, this.config.localUploadRoot);
    const file = await openAsBlob(canonicalFilePath);
    const form = new FormData();
    form.set("file", file, args.fileName ?? basename(canonicalFilePath));
    form.set("uploadPath", args.uploadPath);
    if (args.fileName) {
      form.set("fileName", args.fileName);
    }

    await this.gate.acquire();
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        },
        body: form
      });
    } finally {
      this.gate.release();
    }

    const payload = await parseResponse(response);
    assertKieSuccess(response, payload);
    return payload;
  }
}
