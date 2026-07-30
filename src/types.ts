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
  allowLocalFileUploads: boolean;
  docsDataDir?: string;
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
};

export type MarketModelField = {
  name: string;
  required: boolean;
  type?: string | null;
  format?: string | null;
  enum?: unknown[] | null;
  default?: unknown;
  description?: string | null;
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
};

export type ProductOperation = {
  family: string;
  operation: string;
  method: "GET" | "POST";
  path: string;
  description: string;
};
