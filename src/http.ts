import { readFile } from "node:fs/promises";
import { basename } from "node:path";
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

function assertKieSuccess(response: Response, payload: unknown): void {
  const envelope = payload && typeof payload === "object" ? (payload as KieApiEnvelope) : undefined;
  const code = typeof envelope?.code === "number" ? envelope.code : undefined;
  const success = typeof envelope?.success === "boolean" ? envelope.success : undefined;

  if (!response.ok || (code !== undefined && code !== 200) || success === false) {
    const msg = envelope?.msg ? String(envelope.msg) : response.statusText || "KIE API request failed";
    throw new KieApiError(msg, {
      status: response.status,
      code,
      response: payload
    });
  }
}

export class KieHttpClient {
  constructor(private readonly config: KieConfig, private readonly fetchImpl: typeof fetch = fetch) {}

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
      headers
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url, init);
    const payload = await parseResponse(response);
    assertKieSuccess(response, payload);
    return payload as T;
  }

  async uploadFileStream(args: { filePath: string; uploadPath: string; fileName?: string }): Promise<unknown> {
    const apiKey = requireApiKey(this.config);
    const url = joinUrl(this.config.uploadBaseUrl, "/api/file-stream-upload");
    const bytes = await readFile(args.filePath);
    const form = new FormData();
    form.set("file", new Blob([bytes]), args.fileName ?? basename(args.filePath));
    form.set("uploadPath", args.uploadPath);
    if (args.fileName) {
      form.set("fileName", args.fileName);
    }

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      body: form
    });

    const payload = await parseResponse(response);
    assertKieSuccess(response, payload);
    return payload;
  }
}

