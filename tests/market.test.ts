import { describe, expect, it, vi } from "vitest";
import { KieHttpClient } from "../src/http.js";
import { createAndMaybeWaitForMarketTask } from "../src/market.js";
import type { KieConfig, MarketModelRecord } from "../src/types.js";

const config: KieConfig = {
  apiKey: "test-key",
  apiBaseUrl: "https://api.test",
  uploadBaseUrl: "https://upload.test",
  pollIntervalMs: 1,
  pollTimeoutMs: 10,
  allowLocalFileUploads: false
};

const models: MarketModelRecord[] = [{
  title: "Test",
  model_values: ["test/video"],
  request_required: ["model", "input"],
  input_fields: [{ name: "prompt", required: true, type: "string" }],
  source_url: "https://docs.kie.ai/test",
  source_file: "test.md"
}];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("Market task creation", () => {
  it("preserves an accepted task ID when waiting times out", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 200, data: { taskId: "paid_task_123" } }))
      .mockResolvedValue(jsonResponse({ code: 200, data: { status: "generating" } })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    const result = await createAndMaybeWaitForMarketTask({
      client,
      config,
      kind: "video",
      model: "test/video",
      input: { prompt: "test video" },
      waitForResult: true,
      timeoutMs: 5,
      intervalMs: 1,
      marketModels: models
    });

    expect(result).toMatchObject({
      taskId: "paid_task_123",
      status: "wait_failed",
      warning: expect.stringContaining("kie_get_creation")
    });
  });
});
