import { describe, expect, it, vi } from "vitest";
import { KieHttpClient } from "../src/http.js";
import { getMarketTask, getMarketTaskCached, healthyDelayMs, waitForMarketTask } from "../src/task.js";
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

describe("poll scheduling", () => {
  const plan = {
    intervalMs: 2500,
    firstDelayMs: 600,
    maxIntervalMs: 8000,
    easeAfterMs: 90_000,
    requestTimeoutMs: 20_000
  };

  it("ramps quickly to the steady cadence so short jobs are not held back", () => {
    expect(healthyDelayMs(plan, 1, 0)).toBe(600);
    expect(healthyDelayMs(plan, 2, 600)).toBe(1200);
    expect(healthyDelayMs(plan, 3, 1800)).toBe(2400);
    expect(healthyDelayMs(plan, 4, 4200)).toBe(2500);
  });

  it("holds the steady cadence flat while a task is still running", () => {
    const delays = [5, 10, 20, 30].map((poll) => healthyDelayMs(plan, poll, 60_000));
    expect(delays).toEqual([2500, 2500, 2500, 2500]);
  });

  it("eases toward the ceiling only for clearly long renders, and never past it", () => {
    expect(healthyDelayMs(plan, 40, 180_000)).toBe(3750);
    expect(healthyDelayMs(plan, 80, 270_000)).toBe(5625);
    expect(healthyDelayMs(plan, 200, 900_000)).toBe(8000);
  });

  it("never exceeds a caller-supplied interval override", () => {
    const tight = { ...plan, intervalMs: 400, firstDelayMs: 400, maxIntervalMs: 400 };
    expect(healthyDelayMs(tight, 1, 0)).toBe(400);
    expect(healthyDelayMs(tight, 25, 600_000)).toBe(400);
  });

  it("keeps polling at the steady rate instead of backing off between healthy checks", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ code: 200, msg: "success", data: { status: "generating" } })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_steady", intervalMs: 20, timeoutMs: 300 })
    ).rejects.toThrow("Timed out waiting for KIE task task_steady");

    // A 1.5x backoff on healthy polls could only reach about six checks in this window.
    expect(vi.mocked(fetchImpl).mock.calls.length).toBeGreaterThanOrEqual(10);
  });

  it("honours Retry-After when KIE rate limits a status check", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 429, msg: "Too many requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "0" }
        })
      )
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "success" } })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);
    const updates: Array<{ status: string; error?: string }> = [];

    const result = await waitForMarketTask({
      client,
      taskId: "task_429",
      intervalMs: 1,
      timeoutMs: 500,
      onProgress: (update) => {
        updates.push(update);
      }
    });

    expect(result).toMatchObject({ data: { status: "success" } });
    expect(updates[0]).toMatchObject({ status: "retrying" });
  });

  it("survives more consecutive transient failures than the old three-strike limit", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const mocked = vi.mocked(fetchImpl);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      mocked.mockRejectedValueOnce(new Error("Temporary network failure"));
    }
    mocked.mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { status: "success" } }));
    const client = new KieHttpClient(config, fetchImpl);

    const result = await waitForMarketTask({ client, taskId: "task_flaky", intervalMs: 1, timeoutMs: 2_000 });

    expect(result).toMatchObject({ data: { status: "success" } });
    expect(mocked.mock.calls.length).toBe(5);
  });
});

describe("status reported through the envelope code", () => {
  function codeResponse(code: number, msg: string): Response {
    return new Response(JSON.stringify({ code, msg, data: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  it("stops waiting when code 501 says generation failed", async () => {
    const fetchImpl = vi.fn(async () => codeResponse(501, "Generation Failed")) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    const result = await waitForMarketTask({ client, taskId: "task_501", intervalMs: 1, timeoutMs: 500 });

    expect(result).toMatchObject({ data: { state: "fail", failCode: "501" } });
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(1);
  });

  it("stops waiting when code 408 says the upstream produced nothing", async () => {
    const fetchImpl = vi.fn(async () => codeResponse(408, "Upstream timeout")) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_408", intervalMs: 1, timeoutMs: 500 })
    ).resolves.toMatchObject({ data: { state: "fail", failCode: "408" } });
  });

  it("rides out the gap before a freshly created task becomes queryable", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(codeResponse(422, "recordInfo is null"))
      .mockResolvedValueOnce(codeResponse(404, "Task not found"))
      .mockResolvedValueOnce(jsonResponse({ code: 200, msg: "success", data: { state: "success" } })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    const result = await waitForMarketTask({ client, taskId: "task_new", intervalMs: 1, timeoutMs: 2000 });

    expect(result).toMatchObject({ data: { state: "success" } });
  });

  it("gives up on a task id KIE never learns about", async () => {
    const fetchImpl = vi.fn(async () => codeResponse(404, "Task not found")) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_ghost", intervalMs: 1, timeoutMs: 2000, notVisibleGraceMs: 10 })
    ).rejects.toThrow(/no record of task task_ghost/);
  });

  it("reports a not-yet-queryable task as waiting in a single snapshot", async () => {
    const fetchImpl = vi.fn(async () => codeResponse(422, "recordInfo is null")) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(getMarketTaskCached({ client, taskId: "task_snap" })).resolves.toMatchObject({
      data: { state: "waiting" }
    });
  });

  it("still surfaces an unusable API key instead of polling through it", async () => {
    const fetchImpl = vi.fn(async () => codeResponse(401, "Unauthorized")) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_401", intervalMs: 1, timeoutMs: 200 })
    ).rejects.toMatchObject({ name: "KieApiError", code: 401 });
  });

  it("names the last observed state when a wait times out", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ code: 200, msg: "success", data: { state: "queuing" } })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      waitForMarketTask({ client, taskId: "task_slow", intervalMs: 1, timeoutMs: 20 })
    ).rejects.toThrow(/last reported "queuing"/);
  });
});
