import { describe, expect, it } from "vitest";
import {
  findProductOperation,
  getProductOperationSchema,
  productOperations,
  validateProductOperationInput
} from "../src/products.js";
import openapiCatalog from "../src/data/openapi_endpoint_catalog.json" with { type: "json" };

describe("product operation registry", () => {
  it("covers the approved v1 product families", () => {
    const families = [...new Set(productOperations.map((operation) => operation.family))];

    expect(families).toEqual(expect.arrayContaining(["4o_image", "flux_kontext", "runway", "aleph", "suno", "veo"]));
    expect(findProductOperation("veo", "generate")).toMatchObject({
      method: "POST",
      path: "/api/v1/jobs/createTask"
    });
    expect(findProductOperation("suno", "voice_check")).toMatchObject({
      method: "POST",
      path: "/api/v1/jobs/createTask"
    });
  });

  it("keeps every curated operation aligned with the official docs snapshot", () => {
    const documented = new Set(
      openapiCatalog.endpoints.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`)
    );

    expect(productOperations.filter((operation) => !documented.has(`${operation.method} ${operation.path}`))).toEqual([]);
    for (const operation of productOperations) {
      expect(getProductOperationSchema(operation, openapiCatalog).source_url).toBe(operation.sourceUrl);
    }
  });

  it("returns and validates the exact official schema for curated operations", () => {
    const getDetails = findProductOperation("4o_image", "get_details");
    const generateVeo = findProductOperation("veo", "generate");
    expect(getDetails).toBeTruthy();
    expect(generateVeo).toBeTruthy();

    const schema = getProductOperationSchema(generateVeo!, openapiCatalog);
    expect(schema.source_url).toBe("https://docs.kie.ai/veo3-api/generate-veo-3-video.md");

    expect(() =>
      validateProductOperationInput({
        productOperation: getDetails!,
        query: {},
        body: undefined,
        catalog: openapiCatalog
      })
    ).toThrow(/query.taskId is required/);
    expect(() =>
      validateProductOperationInput({
        productOperation: getDetails!,
        query: { taskId: "task_123" },
        body: undefined,
        catalog: openapiCatalog
      })
    ).not.toThrow();
    expect(() =>
      validateProductOperationInput({
        productOperation: generateVeo!,
        query: {},
        body: { model: "veo-3-1", input: { prompt: "A calm ocean", generation_type: "NOT_REAL" } },
        catalog: openapiCatalog
      })
    ).toThrow(/body.input.generation_type must be one of/);
  });
});
