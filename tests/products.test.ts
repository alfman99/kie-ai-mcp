import { describe, expect, it } from "vitest";
import { findProductOperation, productOperations } from "../src/products.js";
import openapiCatalog from "../src/data/openapi_endpoint_catalog.json" with { type: "json" };

describe("product operation registry", () => {
  it("covers the approved v1 product families", () => {
    const families = [...new Set(productOperations.map((operation) => operation.family))];

    expect(families).toEqual(expect.arrayContaining(["4o_image", "flux_kontext", "runway", "aleph", "suno", "veo"]));
    expect(findProductOperation("veo", "generate")).toMatchObject({
      method: "POST",
      path: "/api/v1/veo/generate"
    });
    expect(findProductOperation("suno", "voice_check")).toMatchObject({
      method: "POST",
      path: "/api/v1/voice/check-voice"
    });
  });

  it("keeps every curated operation aligned with the official docs snapshot", () => {
    const documented = new Set(
      openapiCatalog.endpoints.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`)
    );

    expect(productOperations.filter((operation) => !documented.has(`${operation.method} ${operation.path}`))).toEqual([]);
  });
});
