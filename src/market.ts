import { pollPlanFromConfig } from "./config.js";
import { normalizeError } from "./errors.js";
import type { KieHttpClient } from "./http.js";
import { validateMarketInput } from "./registry.js";
import { submissionFingerprint, type TaskStore } from "./task-store.js";
import { waitForMarketTask, type MarketTaskProgress } from "./task.js";
import type { KieConfig, MarketModelRecord } from "./types.js";

export function extractTaskId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const envelope = payload as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object" ? (envelope.data as Record<string, unknown>) : undefined;
  const candidates = [envelope.taskId, envelope.task_id, data?.taskId, data?.task_id, data?.id];
  const taskId = candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
  return typeof taskId === "string" ? taskId : undefined;
}

export async function createMarketTask(args: {
  client: KieHttpClient;
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
  validateKnownModel?: boolean;
  marketModels: MarketModelRecord[];
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<unknown> {
  if (args.validateKnownModel ?? true) {
    validateMarketInput(args.model, args.input, args.marketModels);
  }

  return args.client.requestJson({
    method: "POST",
    path: "/api/v1/jobs/createTask",
    rateLimitClass: "generation",
    body: {
      model: args.model,
      ...(args.callBackUrl ? { callBackUrl: args.callBackUrl } : {}),
      input: args.input
    },
    signal: args.signal,
    ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {})
  });
}

export async function createAndMaybeWaitForMarketTask(args: {
  client: KieHttpClient;
  config: KieConfig;
  kind: "image" | "video" | "speech";
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
  waitForResult: boolean;
  intervalMs?: number;
  timeoutMs?: number;
  marketModels: MarketModelRecord[];
  store?: TaskStore;
  idempotencyKey?: string;
  onProgress?: (update: MarketTaskProgress) => Promise<void> | void;
  signal?: AbortSignal;
}): Promise<Record<string, unknown>> {
  const plan = pollPlanFromConfig(args.config, args.intervalMs);
  // A retried automated call must not pay for the same generation twice. With an idempotency
  // key, an identical submission returns the original task instead of creating a second one.
  const fingerprint = args.idempotencyKey
    ? submissionFingerprint({ model: args.model, input: args.input, idempotencyKey: args.idempotencyKey })
    : undefined;
  const submit = async () => {
    const payload = await createMarketTask({
      client: args.client,
      model: args.model,
      input: args.input,
      callBackUrl: args.callBackUrl,
      marketModels: args.marketModels,
      signal: args.signal,
      timeoutMs: plan.requestTimeoutMs
    });
    return { taskId: extractTaskId(payload), payload };
  };
  const submission = args.store
    ? await args.store.submitOnce(fingerprint, submit)
    : { ...(await submit()), deduplicated: false };
  const createTask = submission.payload;
  const taskId = submission.taskId;
  const base = {
    kind: args.kind,
    model: args.model,
    input: args.input,
    taskId,
    ...(submission.deduplicated ? { deduplicated: true } : {}),
    createTask
  };

  if (!args.waitForResult) {
    return {
      ...base,
      status: "submitted",
      nextStep: taskId ? "Call kie_get_creation with this taskId to retrieve the result." : undefined
    };
  }

  if (!taskId) {
    return {
      ...base,
      status: "submitted_without_task_id",
      warning: "KIE accepted the task request, but this server could not find a taskId in the response."
    };
  }

  try {
    return {
      ...base,
      status: "waited",
      result: await waitForMarketTask({
        client: args.client,
        taskId,
        intervalMs: plan.intervalMs,
        timeoutMs: args.timeoutMs ?? args.config.pollTimeoutMs,
        plan,
        store: args.store,
        onProgress: args.onProgress,
        signal: args.signal
      })
    };
  } catch (error) {
    return {
      ...base,
      status: "wait_failed",
      waitError: normalizeError(error),
      warning: `KIE accepted task ${taskId}, but waiting stopped. Use kie_get_creation with this taskId to continue.`
    };
  }
}
