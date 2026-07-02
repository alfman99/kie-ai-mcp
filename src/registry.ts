import marketRegistry from "./data/market_model_registry.json" with { type: "json" };
import openapiCatalog from "./data/openapi_endpoint_catalog.json" with { type: "json" };
import endpointIndex from "./data/endpoint_index.json" with { type: "json" };
import type { JsonObject, MarketModelRecord } from "./types.js";

type MarketRegistryFile = {
  models: MarketModelRecord[];
  count: number;
};

export const marketModels = (marketRegistry as MarketRegistryFile).models;
export const openapiEndpointCatalog = openapiCatalog as JsonObject;
export const endpointMentionIndex = endpointIndex as JsonObject;

export function findMarketModel(model: string): MarketModelRecord | undefined {
  return marketModels.find((record) => record.model_values.includes(model));
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

export function validateMarketInput(model: string, input: Record<string, unknown>): void {
  const record = findMarketModel(model);
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

