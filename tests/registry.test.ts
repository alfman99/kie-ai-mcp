import { describe, expect, it } from "vitest";
import { findMarketModel, marketModels, validateMarketInput } from "../src/registry.js";

describe("market registry", () => {
  it("loads docs-derived market model records", () => {
    expect(marketModels.length).toBeGreaterThanOrEqual(100);
    expect(findMarketModel("qwen2/text-to-image")).toBeTruthy();
  });

  it("validates required fields and official JSON Schema constraints for known models", () => {
    expect(() => validateMarketInput("qwen2/text-to-image", {})).toThrow(/prompt/);
    expect(() => validateMarketInput("qwen2/text-to-image", { prompt: "a neon library" })).not.toThrow();
    expect(() =>
      validateMarketInput("elevenlabs/text-to-speech-turbo-2-5", {
        text: "Read this",
        speed: 1.3
      })
    ).toThrow(/speed must be at most 1.2/);
    expect(() =>
      validateMarketInput("gpt-image-2-image-to-image", {
        prompt: "Edit this",
        input_urls: Array.from({ length: 17 }, (_, index) => `https://example.com/${index}.png`)
      })
    ).toThrow(/input_urls must contain at most 16/);
    expect(() =>
      validateMarketInput("gpt-image-2-image-to-image", {
        prompt: "Edit this",
        input_urls: ["not-a-url"]
      })
    ).toThrow(/input_urls\[0\] must be an absolute HTTP\(S\) URL/);
  });

  it("rejects undocumented fields for known models with a forward-compatibility escape-hatch message", () => {
    expect(() =>
      validateMarketInput("qwen2/text-to-image", {
        prompt: "a neon library",
        invented_parameter: true
      })
    ).toThrow(/unknown field.*validateKnownModel=false/);
  });

  it("allows unknown models to pass through", () => {
    expect(() => validateMarketInput("new-provider/future-model", {})).not.toThrow();
  });
});
