import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bundledManifest from "./data/docs_manifest.json" with { type: "json" };
import bundledEndpointIndex from "./data/endpoint_index.json" with { type: "json" };
import bundledMarketRegistry from "./data/market_model_registry.json" with { type: "json" };
import bundledOpenapiCatalog from "./data/openapi_endpoint_catalog.json" with { type: "json" };
import type { DocsManifestRecord, JsonObject, MarketModelRecord } from "./types.js";

type MarketRegistryFile = {
  models: MarketModelRecord[];
  count: number;
};

export type CatalogRegistry = {
  marketModels: MarketModelRecord[];
  openapiEndpointCatalog: JsonObject;
  endpointMentionIndex: JsonObject;
  docsManifest: DocsManifestRecord;
  source: "bundled" | "external";
  dataDirectory?: string;
};

function readJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load KIE catalog file ${filePath}: ${detail}`);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertOfficialSource(sourceUrl: string, context: string): void {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error(`${context} has an invalid source URL: ${sourceUrl}`);
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.kie.ai") {
    throw new Error(`${context} must reference official https://docs.kie.ai/ documentation: ${sourceUrl}`);
  }
}

function validateCatalogRegistry(registry: CatalogRegistry): CatalogRegistry {
  const manifest = registry.docsManifest;
  if (
    manifest.schemaVersion !== 2 ||
    manifest.sourceIndex !== "https://docs.kie.ai/llms.txt" ||
    manifest.sourceHost !== "docs.kie.ai" ||
    manifest.failures !== 0
  ) {
    throw new Error("KIE catalog manifest failed its provenance or completeness checks.");
  }
  if (manifest.marketModelCount !== registry.marketModels.length) {
    throw new Error(
      `KIE catalog count mismatch: manifest=${manifest.marketModelCount}, registry=${registry.marketModels.length}.`
    );
  }
  for (const correction of manifest.schemaCorrections) {
    assertOfficialSource(correction.sourceUrl, "Schema correction");
  }
  for (const correction of manifest.endpointCorrections) {
    assertOfficialSource(correction.sourceUrl, "Endpoint correction");
  }

  const openapiEndpoints = Array.isArray(registry.openapiEndpointCatalog.endpoints)
    ? registry.openapiEndpointCatalog.endpoints
    : [];
  if (manifest.operationCount !== openapiEndpoints.length) {
    throw new Error(
      `KIE operation count mismatch: manifest=${manifest.operationCount}, catalog=${openapiEndpoints.length}.`
    );
  }
  for (const endpoint of openapiEndpoints) {
    const sourceUrl = isRecord(endpoint) && typeof endpoint.source_url === "string" ? endpoint.source_url : "";
    assertOfficialSource(sourceUrl, "OpenAPI endpoint");
  }

  const endpointMentions = Array.isArray(registry.endpointMentionIndex.endpoints)
    ? registry.endpointMentionIndex.endpoints
    : [];
  for (const mention of endpointMentions) {
    const sourceUrl = isRecord(mention) && typeof mention.url === "string" ? mention.url : "";
    assertOfficialSource(sourceUrl, "Endpoint mention");
  }

  const modelIds = new Set<string>();
  for (const record of registry.marketModels) {
    assertOfficialSource(record.source_url, `Market model "${record.title}"`);
    if (record.model_values.length === 0) {
      throw new Error(`Market model "${record.title}" has no model identifier.`);
    }
    for (const modelId of record.model_values) {
      if (modelId.length === 0 || modelId !== modelId.trim()) {
        throw new Error(`Market model "${record.title}" has an invalid model identifier: "${modelId}".`);
      }
      if (modelIds.has(modelId)) {
        throw new Error(`Duplicate Market model identifier in catalog: ${modelId}`);
      }
      modelIds.add(modelId);
    }

    const fieldNames = new Set<string>();
    for (const field of record.input_fields) {
      if (field.name.length === 0 || field.name !== field.name.trim()) {
        throw new Error(`Market model "${record.title}" has an invalid input field name: "${field.name}".`);
      }
      if (fieldNames.has(field.name)) {
        throw new Error(`Market model "${record.title}" has a duplicate input field: ${field.name}`);
      }
      fieldNames.add(field.name);
    }
  }

  return registry;
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const bundledCatalogRegistry = validateCatalogRegistry({
  marketModels: (bundledMarketRegistry as unknown as MarketRegistryFile).models,
  openapiEndpointCatalog: bundledOpenapiCatalog as JsonObject,
  endpointMentionIndex: bundledEndpointIndex as JsonObject,
  docsManifest: bundledManifest as DocsManifestRecord,
  source: "bundled"
});

export function loadCatalogRegistry(dataDirectory?: string): CatalogRegistry {
  if (!dataDirectory) {
    return bundledCatalogRegistry;
  }

  const directory = resolve(dataDirectory);
  const manifest = readJsonFile(resolve(directory, "docs_manifest.json")) as DocsManifestRecord;
  const marketRegistryText = readFileSync(resolve(directory, "market_model_registry.json"), "utf8");
  const openapiCatalogText = readFileSync(resolve(directory, "openapi_endpoint_catalog.json"), "utf8");
  const endpointIndexText = readFileSync(resolve(directory, "endpoint_index.json"), "utf8");
  const expectedHashes = manifest.artifactSha256;
  if (
    !expectedHashes ||
    sha256(marketRegistryText) !== expectedHashes.market_model_registry ||
    sha256(openapiCatalogText) !== expectedHashes.openapi_endpoint_catalog ||
    sha256(endpointIndexText) !== expectedHashes.endpoint_index
  ) {
    throw new Error("External KIE catalog artifact hashes do not match docs_manifest.json.");
  }

  const marketRegistry = JSON.parse(marketRegistryText) as MarketRegistryFile;
  return validateCatalogRegistry({
    marketModels: marketRegistry.models,
    openapiEndpointCatalog: JSON.parse(openapiCatalogText) as JsonObject,
    endpointMentionIndex: JSON.parse(endpointIndexText) as JsonObject,
    docsManifest: manifest,
    source: "external",
    dataDirectory: directory
  });
}

export const marketModels = bundledCatalogRegistry.marketModels;
export const openapiEndpointCatalog = bundledCatalogRegistry.openapiEndpointCatalog;
export const endpointMentionIndex = bundledCatalogRegistry.endpointMentionIndex;
export const docsManifest = bundledCatalogRegistry.docsManifest;

export function findMarketModel(model: string, records: MarketModelRecord[] = marketModels): MarketModelRecord | undefined {
  return records.find((record) => record.model_values.includes(model));
}

export function summarizeMarketModel(record: MarketModelRecord): Record<string, unknown> {
  return {
    title: record.title,
    operationId: record.operationId,
    modelValues: record.model_values,
    requiredInputFields: record.input_fields.filter((field) => field.required).map((field) => field.name),
    optionalInputFields: record.input_fields.filter((field) => !field.required).map((field) => field.name),
    sourceUrl: record.source_url
  };
}

export function validateMarketInput(
  model: string,
  input: Record<string, unknown>,
  records: MarketModelRecord[] = marketModels
): void {
  const record = findMarketModel(model, records);
  if (!record) {
    return;
  }

  const missing = record.input_fields
    .filter((field) => field.required)
    .map((field) => field.name)
    .filter((fieldName) => input[fieldName] === undefined || input[fieldName] === null || input[fieldName] === "");

  if (missing.length > 0) {
    throw new Error(`Missing required input field(s) for ${model}: ${missing.join(", ")}`);
  }
}
