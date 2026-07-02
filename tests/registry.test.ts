import { describe, expect, it } from "vitest";
import { findMarketModel, marketModels, validateMarketInput } from "../src/registry.js";

describe("market registry", () => {
  it("loads docs-derived market model records", () => {
    expect(marketModels.length).toBeGreaterThanOrEqual(100);
    expect(findMarketModel("qwen2/text-to-image")).toBeTruthy();
  });

  it("validates required fields for known models", () => {
    expect(() => validateMarketInput("qwen2/text-to-image", {})).toThrow(/prompt/);
    expect(() => validateMarketInput("qwen2/text-to-image", { prompt: "a neon library" })).not.toThrow();
  });

  it("allows unknown models to pass through", () => {
    expect(() => validateMarketInput("new-provider/future-model", {})).not.toThrow();
  });
});

