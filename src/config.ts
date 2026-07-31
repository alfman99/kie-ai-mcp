import type { KieConfig } from "./types.js";

const DEFAULT_API_BASE_URL = "https://api.kie.ai";
const DEFAULT_UPLOAD_BASE_URL = "https://kieai.redpandaai.co";
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): KieConfig {
  return {
    apiKey: process.env.KIE_API_KEY,
    apiBaseUrl: process.env.KIE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    uploadBaseUrl: process.env.KIE_UPLOAD_BASE_URL ?? DEFAULT_UPLOAD_BASE_URL,
    webhookHmacKey: process.env.KIE_WEBHOOK_HMAC_KEY,
    pollIntervalMs: readPositiveInteger("KIE_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS),
    pollTimeoutMs: readPositiveInteger("KIE_POLL_TIMEOUT_MS", DEFAULT_POLL_TIMEOUT_MS),
    allowLocalFileUploads: process.env.KIE_ALLOW_LOCAL_FILE_UPLOADS === "true",
    localUploadRoot: process.env.KIE_LOCAL_UPLOAD_ROOT?.trim() || undefined,
    docsDataDir: process.env.KIE_DOCS_DATA_DIR
  };
}

export function requireApiKey(config: KieConfig): string {
  if (!config.apiKey) {
    throw new Error("KIE_API_KEY is required for this live KIE API tool.");
  }

  return config.apiKey;
}
