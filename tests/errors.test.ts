import { describe, expect, it } from "vitest";
import { classifyError, KieApiError, normalizeError } from "../src/errors.js";

describe("error classification", () => {
  it.each([
    [new KieApiError("Bad API key", { status: 401 }), "auth", false],
    [new KieApiError("Insufficient credits", { status: 402 }), "credits", false],
    [new KieApiError("Too many requests", { status: 429 }), "rate_limit", true],
    [new KieApiError("Server exploded", { status: 503 }), "server", true],
    [new KieApiError("Gateway timeout", { status: 504 }), "timeout", true],
    [new KieApiError("prompt is required", { status: 400 }), "input", false],
    [new KieApiError("balance too low", { status: 400 }), "credits", false],
    [new Error("Timed out waiting for KIE task task_1 after 1000ms."), "timeout", true],
    [new Error("Stopped waiting for KIE task task_1 because the client cancelled the request."), "cancelled", false],
    [new Error("fetch failed"), "network", true],
    [new Error("Seedance 2 lastFrameUrl requires firstFrameUrl."), "input", false]
  ])("classifies %s", (error, category, retryable) => {
    expect(classifyError(error)).toMatchObject({ category, retryable });
  });

  it("gives every error an actionable next step", () => {
    const normalized = normalizeError(new KieApiError("Too many requests", { status: 429, retryAfterMs: 2000 }));

    expect(normalized).toMatchObject({
      name: "KieApiError",
      status: 429,
      retryAfterMs: 2000,
      category: "rate_limit",
      retryable: true
    });
    expect(String(normalized.nextStep).length).toBeGreaterThan(0);
  });

  it("never resubmits after a timeout, because the paid task is still running", () => {
    expect(classifyError(new Error("Timed out waiting for KIE task task_9 after 600000ms.")).nextStep).toContain(
      "kie_get_creation"
    );
  });
});
