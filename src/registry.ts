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
    manifest.schemaVersion !== 3 ||
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

  const errors: string[] = [];
  const fields = new Map(record.input_fields.map((field) => [field.name, field]));
  const missing = record.input_fields
    .filter((field) => field.required)
    .map((field) => field.name)
    .filter((fieldName) => input[fieldName] === undefined || input[fieldName] === null || input[fieldName] === "");

  if (missing.length > 0) {
    errors.push(`missing required field(s): ${missing.join(", ")}`);
  }

  if (record.input_fields.length > 0) {
    const unknown = Object.keys(input).filter((name) => !fields.has(name));
    if (unknown.length > 0) {
      errors.push(
        `unknown field(s): ${unknown.join(", ")} (refresh the official catalog or set validateKnownModel=false for forward compatibility)`
      );
    }
  }

  for (const [name, value] of Object.entries(input)) {
    const field = fields.get(name);
    if (!field || value === undefined || value === null) {
      continue;
    }

    const actualType = Array.isArray(value) ? "array" : typeof value;
    const typeMatches =
      !field.type ||
      (field.type === "integer"
        ? typeof value === "number" && Number.isInteger(value)
        : field.type === "number"
          ? typeof value === "number" && Number.isFinite(value)
          : field.type === "object"
            ? typeof value === "object" && !Array.isArray(value)
            : actualType === field.type);
    if (!typeMatches) {
      errors.push(`${name} must be ${field.type}; received ${actualType}`);
      continue;
    }

    if (field.enum && !field.enum.some((allowed) => Object.is(allowed, value))) {
      errors.push(`${name} must be one of ${field.enum.map((item) => JSON.stringify(item)).join(", ")}`);
    }

    if (typeof value === "number") {
      if (field.minimum != null && value < field.minimum) {
        errors.push(`${name} must be at least ${field.minimum}`);
      }
      if (field.maximum != null && value > field.maximum) {
        errors.push(`${name} must be at most ${field.maximum}`);
      }
      if (field.exclusiveMinimum != null && value <= field.exclusiveMinimum) {
        errors.push(`${name} must be greater than ${field.exclusiveMinimum}`);
      }
      if (field.exclusiveMaximum != null && value >= field.exclusiveMaximum) {
        errors.push(`${name} must be less than ${field.exclusiveMaximum}`);
      }
    }

    if (typeof value === "string") {
      if (field.minLength != null && value.length < field.minLength) {
        errors.push(`${name} must contain at least ${field.minLength} character(s)`);
      }
      if (field.maxLength != null && value.length > field.maxLength) {
        errors.push(`${name} must contain at most ${field.maxLength} character(s)`);
      }
      if (field.pattern) {
        try {
          if (!new RegExp(field.pattern).test(value)) {
            errors.push(`${name} must match the official pattern ${field.pattern}`);
          }
        } catch {
          // A malformed upstream pattern should not prevent use of the server.
        }
      }
      if (field.format === "uri" && !isAbsoluteHttpUrl(value)) {
        errors.push(`${name} must be an absolute HTTP(S) URL`);
      }
    }

    if (Array.isArray(value)) {
      if (field.minItems != null && value.length < field.minItems) {
        errors.push(`${name} must contain at least ${field.minItems} item(s)`);
      }
      if (field.maxItems != null && value.length > field.maxItems) {
        errors.push(`${name} must contain at most ${field.maxItems} item(s)`);
      }
      if (field.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
        errors.push(`${name} must contain unique items`);
      }
      value.forEach((item, index) => {
        const itemType = Array.isArray(item) ? "array" : typeof item;
        if (field.itemType && itemType !== field.itemType) {
          errors.push(`${name}[${index}] must be ${field.itemType}; received ${itemType}`);
        }
        if (field.itemEnum && !field.itemEnum.some((allowed) => Object.is(allowed, item))) {
          errors.push(`${name}[${index}] is not an allowed value`);
        }
        if (field.itemFormat === "uri" && (typeof item !== "string" || !isAbsoluteHttpUrl(item))) {
          errors.push(`${name}[${index}] must be an absolute HTTP(S) URL`);
        }
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid input for ${model}: ${errors.join("; ")}`);
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
