import type { KieConfig, KiePollPlan } from "./types.js";

const DEFAULT_API_BASE_URL = "https://api.kie.ai";
const DEFAULT_UPLOAD_BASE_URL = "https://kieai.redpandaai.co";
const DEFAULT_POLL_INTERVAL_MS = 2500;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_FIRST_DELAY_MS = 600;
const DEFAULT_POLL_MAX_INTERVAL_MS = 8000;
const DEFAULT_POLL_EASE_AFTER_MS = 90 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 20 * 1000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 8;
const DEFAULT_SUBMISSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_RESULT_CACHE_TTL_MS = 30 * 60 * 1000;

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): KieConfig {
  const pollIntervalMs = readPositiveInteger("KIE_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS);

  return {
    apiKey: process.env.KIE_API_KEY,
    apiBaseUrl: process.env.KIE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    uploadBaseUrl: process.env.KIE_UPLOAD_BASE_URL ?? DEFAULT_UPLOAD_BASE_URL,
    webhookHmacKey: process.env.KIE_WEBHOOK_HMAC_KEY,
    pollIntervalMs,
    pollTimeoutMs: readPositiveInteger("KIE_POLL_TIMEOUT_MS", DEFAULT_POLL_TIMEOUT_MS),
    pollFirstDelayMs: readPositiveInteger("KIE_POLL_FIRST_DELAY_MS", DEFAULT_POLL_FIRST_DELAY_MS),
    pollMaxIntervalMs: readPositiveInteger("KIE_POLL_MAX_INTERVAL_MS", DEFAULT_POLL_MAX_INTERVAL_MS),
    pollEaseAfterMs: readPositiveInteger("KIE_POLL_EASE_AFTER_MS", DEFAULT_POLL_EASE_AFTER_MS),
    requestTimeoutMs: readPositiveInteger("KIE_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS),
    maxConcurrentRequests: readPositiveInteger("KIE_MAX_CONCURRENT_REQUESTS", DEFAULT_MAX_CONCURRENT_REQUESTS),
    toolProfile: process.env.KIE_TOOL_PROFILE === "full" ? "full" : "standard",
    submissionTtlMs: readPositiveInteger("KIE_SUBMISSION_TTL_MS", DEFAULT_SUBMISSION_TTL_MS),
    resultCacheTtlMs: readPositiveInteger("KIE_RESULT_CACHE_TTL_MS", DEFAULT_RESULT_CACHE_TTL_MS),
    prewarmConnection: process.env.KIE_PREWARM_CONNECTION !== "false",
    allowLocalFileUploads: process.env.KIE_ALLOW_LOCAL_FILE_UPLOADS === "true",
    localUploadRoot: process.env.KIE_LOCAL_UPLOAD_ROOT?.trim() || undefined,
    docsDataDir: process.env.KIE_DOCS_DATA_DIR
  };
}

/**
 * Build the poll schedule for one wait. A per-call intervalMs override stays authoritative:
 * the fast first probe never overshoots it and the long-task ceiling never drops below it.
 */
export function pollPlanFromConfig(config: KieConfig, intervalMs?: number): KiePollPlan {
  const steadyIntervalMs = intervalMs ?? config.pollIntervalMs;
  return {
    intervalMs: steadyIntervalMs,
    firstDelayMs: Math.min(config.pollFirstDelayMs ?? DEFAULT_POLL_FIRST_DELAY_MS, steadyIntervalMs),
    maxIntervalMs: Math.max(config.pollMaxIntervalMs ?? DEFAULT_POLL_MAX_INTERVAL_MS, steadyIntervalMs),
    easeAfterMs: config.pollEaseAfterMs ?? DEFAULT_POLL_EASE_AFTER_MS,
    requestTimeoutMs: config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  };
}

export function requireApiKey(config: KieConfig): string {
  if (!config.apiKey) {
    throw new Error("KIE_API_KEY is required for this live KIE API tool.");
  }

  return config.apiKey;
}
