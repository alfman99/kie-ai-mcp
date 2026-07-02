import { describe, expect, it } from "vitest";
import { findProductOperation, productOperations } from "../src/products.js";

describe("product operation registry", () => {
  it("covers the approved v1 product families", () => {
    const families = [...new Set(productOperations.map((operation) => operation.family))];

    expect(families).toEqual(expect.arrayContaining(["4o_image", "flux_kontext", "runway", "aleph", "suno", "veo"]));
    expect(findProductOperation("veo", "generate")).toMatchObject({
      method: "POST",
      path: "/api/v1/veo/generate"
    });
  });
});
