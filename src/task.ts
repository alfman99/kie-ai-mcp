import { KieApiError } from "./errors.js";
import { isTerminalStatus } from "./generations.js";
import type { KieHttpClient } from "./http.js";
import type { TaskStore } from "./task-store.js";
import type { KiePollPlan } from "./types.js";

const DEFAULT_FIRST_DELAY_MS = 600;
const DEFAULT_MAX_INTERVAL_MS = 8000;
const DEFAULT_EASE_AFTER_MS = 90 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 20 * 1000;
const MAX_ERROR_BACKOFF_MS = 30 * 1000;
const DEFAULT_MAX_CONSECUTIVE_ERRORS = 6;
const JITTER_RATIO = 0.12;

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

export async function getMarketTask(
  client: KieHttpClient,
  taskId: string,
  signal?: AbortSignal,
  timeoutMs?: number
): Promise<unknown> {
  const payload = await client.requestJson({
    method: "GET",
    path: "/api/v1/jobs/recordInfo",
    query: { taskId },
    signal,
    ...(timeoutMs !== undefined ? { timeoutMs } : {})
  });
  return parseResultJson(payload);
}

/**
 * Status check that serves finished tasks from memory. A terminal KIE task never changes, so a
 * repeated check costs nothing and returns instantly.
 */
export async function getMarketTaskCached(args: {
  client: KieHttpClient;
  taskId: string;
  store?: TaskStore;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<unknown> {
  const cached = args.store?.findResult(args.taskId);
  if (cached !== undefined) {
    return cached;
  }

  const payload = await getMarketTask(args.client, args.taskId, args.signal, args.timeoutMs);
  if (isTerminalPayload(payload)) {
    args.store?.rememberResult(args.taskId, payload);
  }
  return payload;
}

function statusOf(payload: unknown): string {
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>).data : undefined;
  const dataRecord = data && typeof data === "object" ? (data as Record<string, unknown>) : undefined;
  return String(dataRecord?.status ?? dataRecord?.state ?? "unknown").toLowerCase();
}

function isTerminalPayload(payload: unknown): boolean {
  return isTerminalStatus(statusOf(payload));
}

function resolvePlan(args: { intervalMs: number; plan?: Partial<KiePollPlan> }): KiePollPlan {
  const intervalMs = args.plan?.intervalMs ?? args.intervalMs;
  return {
    intervalMs,
    firstDelayMs: Math.min(args.plan?.firstDelayMs ?? DEFAULT_FIRST_DELAY_MS, intervalMs),
    maxIntervalMs: Math.max(args.plan?.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS, intervalMs),
    easeAfterMs: args.plan?.easeAfterMs ?? DEFAULT_EASE_AFTER_MS,
    requestTimeoutMs: args.plan?.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  };
}

/**
 * Delay before the next status check on a healthy poll.
 *
 * Short jobs get a fast ramp (~0.6s, 1.2s, ...) so an image or a voice line is returned almost
 * as soon as KIE finishes it. Once the ramp reaches the steady cadence it stays flat: growing the
 * interval while a task is still running only adds dead time between "done at KIE" and "reported
 * here". Only after `easeAfterMs` of a clearly long render does the interval drift toward
 * `maxIntervalMs`, which trades a few seconds of worst-case lag for far fewer requests.
 */
export function healthyDelayMs(plan: KiePollPlan, pollCount: number, elapsedMs: number): number {
  const ramped = Math.min(plan.intervalMs, plan.firstDelayMs * 2 ** Math.max(0, pollCount - 1));
  if (elapsedMs < plan.easeAfterMs) {
    return ramped;
  }

  const eased = plan.intervalMs * 1.5 ** ((elapsedMs - plan.easeAfterMs) / plan.easeAfterMs);
  return Math.min(plan.maxIntervalMs, Math.max(ramped, Math.round(eased)));
}

/** Spread concurrent waits so a 16-job batch does not hit KIE in one synchronized burst. */
function withJitter(ms: number): number {
  const spread = ms * JITTER_RATIO;
  return Math.max(1, Math.round(ms - spread + Math.random() * spread * 2));
}

function retryAfterMs(error: unknown): number | undefined {
  return error instanceof KieApiError && typeof error.retryAfterMs === "number" ? error.retryAfterMs : undefined;
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
  plan?: Partial<KiePollPlan>;
  maxConsecutiveErrors?: number;
  store?: TaskStore;
  onProgress?: (update: MarketTaskProgress) => Promise<void> | void;
  signal?: AbortSignal;
}): Promise<unknown> {
  const cached = args.store?.findResult(args.taskId);
  if (cached !== undefined) {
    await args.onProgress?.({
      taskId: args.taskId,
      status: statusOf(cached),
      progress: 100,
      pollCount: 0,
      elapsedMs: 0,
      terminal: true
    });
    return cached;
  }

  const started = Date.now();
  const plan = resolvePlan({ intervalMs: args.intervalMs, plan: args.plan });
  const maxConsecutiveErrors = args.maxConsecutiveErrors ?? DEFAULT_MAX_CONSECUTIVE_ERRORS;
  let errorBackoffMs = plan.intervalMs;
  let pollCount = 0;
  let consecutiveErrors = 0;

  while (Date.now() - started <= args.timeoutMs) {
    throwIfAborted(args.signal, args.taskId);
    pollCount += 1;
    const remainingAtPollStart = args.timeoutMs - (Date.now() - started);
    if (remainingAtPollStart <= 0) break;

    // Cap each request at its own deadline so one stalled socket cannot swallow the whole
    // wait budget; only a deadline that *is* the remaining budget ends the wait.
    const requestBudgetMs = Math.min(remainingAtPollStart, plan.requestTimeoutMs);
    const isFinalBudget = requestBudgetMs >= remainingAtPollStart;
    const request = deadlineSignal(args.signal, requestBudgetMs);
    let payload: unknown;
    try {
      payload = await getMarketTask(args.client, args.taskId, request.signal);
      consecutiveErrors = 0;
      errorBackoffMs = plan.intervalMs;
    } catch (error) {
      throwIfAborted(args.signal, args.taskId);
      if (request.timedOut() && isFinalBudget) break;
      if (!request.timedOut() && !isRetryableStatusError(error)) throw error;
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxConsecutiveErrors) throw error;
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
      // Honour Retry-After when KIE sends one; otherwise back off exponentially, but only
      // for errors. Healthy polls keep their steady cadence.
      const waitMs = retryAfterMs(error) ?? withJitter(errorBackoffMs);
      await sleep(Math.min(waitMs, remainingMs), args.signal, args.taskId);
      errorBackoffMs = Math.min(errorBackoffMs * 2, MAX_ERROR_BACKOFF_MS);
      continue;
    } finally {
      request.cleanup();
    }
    const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>).data : undefined;
    const dataRecord = data && typeof data === "object" ? (data as Record<string, unknown>) : undefined;
    const status = statusOf(payload);
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
      args.store?.rememberResult(args.taskId, payload);
      return payload;
    }

    const elapsedMs = Date.now() - started;
    const remainingMs = args.timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      break;
    }
    await sleep(
      Math.min(withJitter(healthyDelayMs(plan, pollCount, elapsedMs)), remainingMs),
      args.signal,
      args.taskId
    );
  }

  throw new Error(`Timed out waiting for KIE task ${args.taskId} after ${args.timeoutMs}ms.`);
}
