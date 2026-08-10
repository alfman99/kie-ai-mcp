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

  it("reports normalized poll progress without changing the task result", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "generating", progress: 35 } }))
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "success", progress: 100 } })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);
    const updates: unknown[] = [];

    const result = await waitForMarketTask({
      client,
      taskId: "task_progress",
      intervalMs: 1,
      timeoutMs: 100,
      onProgress: (update) => {
        updates.push(update);
      }
    });

    expect(result).toMatchObject({ data: { status: "success", progress: 100 } });
    expect(updates).toEqual([
      expect.objectContaining({ taskId: "task_progress", status: "generating", progress: 35, pollCount: 1, terminal: false }),
      expect.objectContaining({ taskId: "task_progress", status: "success", progress: 100, pollCount: 2, terminal: true })
    ]);
  });

  it("retries temporary status-check failures without resubmitting work", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary network failure"))
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "success", progress: 100 } })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);
    const updates: Array<{ status: string; error?: string }> = [];

    const result = await waitForMarketTask({
      client,
      taskId: "task_retry",
      intervalMs: 1,
      timeoutMs: 100,
      onProgress: (update) => {
        updates.push(update);
      }
    });

    expect(result).toMatchObject({ data: { status: "success" } });
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(2);
    expect(updates).toEqual([
      expect.objectContaining({ status: "retrying", error: "Temporary network failure" }),
      expect.objectContaining({ status: "success" })
    ]);
  });

  it("does not retry permanent KIE status errors", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 401, msg: "Bad API key", data: null }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_auth", intervalMs: 1, timeoutMs: 100 })
    ).rejects.toMatchObject({ name: "KieApiError", status: 401 });
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight status request when the client cancels", async () => {
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);
    const controller = new AbortController();
    const waiting = waitForMarketTask({
      client,
      taskId: "task_in_flight",
      intervalMs: 1,
      timeoutMs: 1_000,
      signal: controller.signal
    });

    setTimeout(() => controller.abort(), 5);
    await expect(waiting).rejects.toThrow("client cancelled the request");
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight status request when the wait timeout expires", async () => {
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_timeout", intervalMs: 1, timeoutMs: 10 })
    ).rejects.toThrow("Timed out waiting for KIE task task_timeout");
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(1);
  });

  it("stops polling when the client cancels the request", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);
    const controller = new AbortController();
    controller.abort();

    await expect(
      waitForMarketTask({
        client,
        taskId: "task_cancelled",
        intervalMs: 1,
        timeoutMs: 100,
        signal: controller.signal
      })
    ).rejects.toThrow("client cancelled the request");
    expect(vi.mocked(fetchImpl)).not.toHaveBeenCalled();
  });
});
