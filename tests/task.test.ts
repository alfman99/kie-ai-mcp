import { describe, expect, it, vi } from "vitest";
import { KieHttpClient } from "../src/http.js";
import { getMarketTask, waitForMarketTask } from "../src/task.js";
import type { KieConfig } from "../src/types.js";

const config: KieConfig = {
  apiKey: "test-key",
  apiBaseUrl: "https://api.test",
  uploadBaseUrl: "https://upload.test",
  pollIntervalMs: 1,
  pollTimeoutMs: 100,
  allowLocalFileUploads: false
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

describe("task helpers", () => {
  it("parses resultJson while preserving the raw field", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        code: 200,
        msg: "success",
        data: {
          status: "success",
          resultJson: JSON.stringify({ resultUrls: ["https://example.com/a.png"] })
        }
      })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    const result = await getMarketTask(client, "task_123");

    expect(result).toMatchObject({
      data: {
        status: "success",
        resultJson: JSON.stringify({ resultUrls: ["https://example.com/a.png"] }),
        parsedResultJson: { resultUrls: ["https://example.com/a.png"] }
      }
    });
  });

  it("waits until terminal task status", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "generating" } }))
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "success" } })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    const result = await waitForMarketTask({ client, taskId: "task_123", intervalMs: 1, timeoutMs: 100 });

    expect(result).toMatchObject({ data: { status: "success" } });
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(2);
  });
});
