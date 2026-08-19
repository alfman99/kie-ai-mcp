export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, unknown>;

export type KieConfig = {
  apiKey?: string;
  apiBaseUrl: string;
  uploadBaseUrl: string;
  webhookHmacKey?: string;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  /** Delay before the first status re-check, so short jobs are not held behind a full interval. */
  pollFirstDelayMs?: number;
  /** Ceiling the interval eases toward once a task is clearly long-running. */
  pollMaxIntervalMs?: number;
  /** Elapsed wait time after which the interval starts easing toward pollMaxIntervalMs. */
  pollEaseAfterMs?: number;
  /** Per-HTTP-request deadline, so one stalled socket cannot consume the whole wait budget. */
  requestTimeoutMs?: number;
  /** Cap on simultaneous in-flight KIE requests across all parallel tasks. */
  maxConcurrentRequests?: number;
  /** New generation requests allowed per `generationRateWindowMs`. KIE documents 20 per 10s per account. */
  generationRateLimit?: number;
  /** Width of the generation rate-limit window. */
  generationRateWindowMs?: number;
  /** How many times a rate-limited (429) generation request is re-sent before giving up. */
  generationMaxRetries?: number;
  /** "standard" exposes the curated tool set; "full" adds the advanced escape-hatch tools. */
  toolProfile?: "standard" | "full";
  /** How long an idempotency key can replay its original submission. */
  submissionTtlMs?: number;
  /** How long a finished task result is served from memory instead of the network. */
  resultCacheTtlMs?: number;
  /** Open the API connection at startup so the first call skips the TLS handshake. */
  prewarmConnection?: boolean;
  allowLocalFileUploads: boolean;
  localUploadRoot?: string;
  docsDataDir?: string;
};

export type KiePollPlan = {
  intervalMs: number;
  firstDelayMs: number;
  maxIntervalMs: number;
  easeAfterMs: number;
  requestTimeoutMs: number;
};

export type KieApiEnvelope = {
  code?: number;
  msg?: string;
  success?: boolean;
  data?: unknown;
  [key: string]: unknown;
};

export type KieRequestOptions = {
  baseUrl?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  requireApiKey?: boolean;
  signal?: AbortSignal;
  /** Per-request deadline applied on top of any caller signal. */
  timeoutMs?: number;
  /**
   * Marks a request that creates a new generation task. KIE meters those separately from reads
   * (20 per 10 seconds per account), and rejects the excess outright instead of queueing it.
   */
  rateLimitClass?: "generation";
};

export type MarketModelField = {
  name: string;
  required: boolean;
  type?: string | null;
  format?: string | null;
  enum?: unknown[] | null;
  default?: unknown;
  description?: string | null;
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  minItems?: number | null;
  maxItems?: number | null;
  uniqueItems?: boolean | null;
  itemType?: string | null;
  itemFormat?: string | null;
  itemEnum?: unknown[] | null;
};

export type MarketModelRecord = {
  title: string;
  summary?: string;
  operationId?: string;
  model_values: string[];
  request_required: string[];
  input_fields: MarketModelField[];
  source_url: string;
  source_file: string;
};

export type DocsManifestRecord = {
  schemaVersion: number;
  generatedAt: string;
  sourceIndex: string;
  sourceHost: string;
  indexSha256: string;
  contentSha256: string;
  pageCount: number;
  openapiPageCount: number;
  operationCount: number;
  endpointPathCount: number;
  marketModelCount: number;
  failures: number;
  artifactSha256: {
    openapi_endpoint_catalog: string;
    market_model_registry: string;
    endpoint_index: string;
  };
  schemaCorrections: Array<{
    sourceUrl: string;
    schemaModelValues: string[];
    exampleModelValue: string;
    reason: string;
  }>;
  endpointCorrections: Array<{
    sourceUrl: string;
    path: string;
    schemaServers: string[];
    executableServer: string;
    reason: string;
  }>;
};

export type ProductOperation = {
  family: string;
  operation: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  /** True when calling this endpoint creates a new billable generation task. */
  creates?: boolean;
};
