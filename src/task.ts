import { KieApiError } from "./errors.js";
import { isTerminalStatus } from "./generations.js";
import type { KieHttpClient } from "./http.js";

export type MarketTaskProgress = {
  taskId: string;
  status: string;
  progress?: number;
  pollCount: number;
  elapsedMs: number;
  terminal: boolean;
  error?: string;
};

function throwIfAborted(signal: AbortSignal | undefined, taskId: string): void {
  if (signal?.aborted) {
    throw new Error(`Stopped waiting for KIE task ${taskId} because the client cancelled the request.`);
  }
}

function sleep(ms: number, signal: AbortSignal | undefined, taskId: string): Promise<void> {
  if (!signal) return new Promise((resolve) => setTimeout(resolve, ms));
  throwIfAborted(signal, taskId);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new Error(`Stopped waiting for KIE task ${taskId} because the client cancelled the request.`));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function parseResultJson(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const envelope = payload as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object" ? (envelope.data as Record<string, unknown>) : undefined;
  const resultJson = data?.resultJson;
  if (typeof resultJson !== "string" || resultJson.length === 0) {
    return payload;
  }

  try {
    return {
      ...envelope,
      data: {
        ...data,
        parsedResultJson: JSON.parse(resultJson)
      }
    };
  } catch {
    return payload;
  }
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function getMarketTask(client: KieHttpClient, taskId: string, signal?: AbortSignal): Promise<unknown> {
  const payload = await client.requestJson({
    method: "GET",
    path: "/api/v1/jobs/recordInfo",
    query: { taskId },
    signal
  });
  return parseResultJson(payload);
}

function isRetryableStatusError(error: unknown): boolean {
  if (error instanceof KieApiError) {
    const codes = [error.status, error.code].filter((value): value is number => typeof value === "number");
    return codes.some((code) => [408, 425, 429].includes(code) || code >= 500);
  }
  if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) return false;
  return true;
}

function deadlineSignal(signal: AbortSignal | undefined, remainingMs: number): {
  signal: AbortSignal;
  timedOut: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let didTimeOut = false;
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    didTimeOut = true;
    controller.abort(new Error("KIE task status request exceeded the remaining wait time."));
  }, Math.max(1, remainingMs));
  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}

export async function waitForMarketTask(args: {
  client: KieHttpClient;
  taskId: string;
  intervalMs: number;
  timeoutMs: number;
  onProgress?: (update: MarketTaskProgress) => Promise<void> | void;
  signal?: AbortSignal;
}): Promise<unknown> {
  const started = Date.now();
  const maximumIntervalMs = Math.max(args.intervalMs, 30_000);
  let nextIntervalMs = args.intervalMs;
  let pollCount = 0;
  let consecutiveErrors = 0;

  while (Date.now() - started <= args.timeoutMs) {
    throwIfAborted(args.signal, args.taskId);
    pollCount += 1;
    const remainingAtPollStart = args.timeoutMs - (Date.now() - started);
    if (remainingAtPollStart <= 0) break;
    const request = deadlineSignal(args.signal, remainingAtPollStart);
    let payload: unknown;
    try {
      payload = await getMarketTask(args.client, args.taskId, request.signal);
      consecutiveErrors = 0;
    } catch (error) {
      throwIfAborted(args.signal, args.taskId);
      if (request.timedOut()) break;
      if (!isRetryableStatusError(error)) throw error;
      consecutiveErrors += 1;
      if (consecutiveErrors >= 3) throw error;
      await args.onProgress?.({
        taskId: args.taskId,
        status: "retrying",
        pollCount,
        elapsedMs: Date.now() - started,
        terminal: false,
        error: error instanceof Error ? error.message : String(error)
      });
      const remainingMs = args.timeoutMs - (Date.now() - started);
      if (remainingMs <= 0) break;
      await sleep(Math.min(nextIntervalMs, remainingMs), args.signal, args.taskId);
      nextIntervalMs = Math.min(Math.ceil(nextIntervalMs * 1.5), maximumIntervalMs);
      continue;
    } finally {
      request.cleanup();
    }
    const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>).data : undefined;
    const dataRecord = data && typeof data === "object" ? (data as Record<string, unknown>) : undefined;
    const status = String(dataRecord?.status ?? dataRecord?.state ?? "unknown").toLowerCase();
    const progressValue = optionalNumber(dataRecord?.progress);
    const terminal = isTerminalStatus(status);

    await args.onProgress?.({
      taskId: args.taskId,
      status,
      ...(progressValue !== undefined ? { progress: Math.max(0, Math.min(100, progressValue)) } : {}),
      pollCount,
      elapsedMs: Date.now() - started,
      terminal
    });

    if (terminal) {
      return payload;
    }

    const remainingMs = args.timeoutMs - (Date.now() - started);
    if (remainingMs <= 0) {
      break;
    }
    await sleep(Math.min(nextIntervalMs, remainingMs), args.signal, args.taskId);
    nextIntervalMs = Math.min(Math.ceil(nextIntervalMs * 1.5), maximumIntervalMs);
  }

  throw new Error(`Timed out waiting for KIE task ${args.taskId} after ${args.timeoutMs}ms.`);
}
