/**
 * Single source of truth for how a KIE Market task reports "done", "failed", or "still working".
 *
 * Everything here is derived from the official contract in
 * https://docs.kie.ai/market/common/get-task-detail.md (GET /api/v1/jobs/recordInfo), which
 * documents both the `data.state` enum and the envelope `code` values the same 200 response can
 * carry. Reading only one of the two is what makes a finished-but-failed task look like it is
 * still processing, so both are normalized in one place.
 */

/** `data.state` values documented as still in flight. */
export const MARKET_PENDING_STATES = ["waiting", "queuing", "generating"] as const;
/** `data.state` value documented as finished successfully. */
export const MARKET_SUCCESS_STATES = ["success"] as const;
/** `data.state` value documented as finished unsuccessfully. */
export const MARKET_FAILED_STATES = ["fail"] as const;

// Tolerant aliases. KIE's own docs use the enums above, but sibling product APIs and this
// server's own synthesized views use near-synonyms, and treating an unmistakable "failed" as
// "still running" is the worst possible misreading.
const PENDING_ALIASES = new Set<string>([
  ...MARKET_PENDING_STATES,
  "pending",
  "queued",
  "processing",
  "running",
  "in_progress",
  "submitted",
  "retrying"
]);
const SUCCESS_ALIASES = new Set<string>([...MARKET_SUCCESS_STATES, "succeeded", "completed", "complete"]);
const FAILED_ALIASES = new Set<string>([
  ...MARKET_FAILED_STATES,
  "failed",
  "failure",
  "error",
  "wait_failed",
  "cancelled",
  "canceled",
  "timeout",
  "timed_out",
  "create_task_failed",
  "generate_failed"
]);

export type TaskOutcome = "pending" | "success" | "failed" | "unrecognized";

/**
 * Map a raw state string onto an outcome. An unrecognized state is deliberately NOT terminal:
 * a state KIE adds tomorrow is far more likely to be a new in-flight phase than a new way of
 * being finished, and the wait loop reports the literal state it gave up on.
 */
export function classifyTaskState(state: string): TaskOutcome {
  const normalized = state.trim().toLowerCase();
  if (SUCCESS_ALIASES.has(normalized)) return "success";
  if (FAILED_ALIASES.has(normalized)) return "failed";
  if (PENDING_ALIASES.has(normalized)) return "pending";
  return "unrecognized";
}

export function isTerminalStatus(state: string): boolean {
  const outcome = classifyTaskState(state);
  return outcome === "success" || outcome === "failed";
}

export function isFailedStatus(state: string): boolean {
  return classifyTaskState(state) === "failed";
}

export function isSuccessStatus(state: string): boolean {
  return classifyTaskState(state) === "success";
}

/**
 * How this server should react to an envelope `code` on a recordInfo response.
 *
 * - `ok`        the body carries a real task record.
 * - `failed`    the task itself is finished and unsuccessful; stop polling and report it.
 * - `invisible` the record is not queryable yet (or any more); keep polling inside a grace window.
 * - `retry`     a transient server-side condition; back off and poll again.
 * - `fatal`     nothing about polling will fix this; surface it to the caller immediately.
 */
export type RecordInfoDisposition = "ok" | "failed" | "invisible" | "retry" | "fatal";

/** Envelope `code` meanings, quoted from the Get Task Details reference. */
export const RECORD_INFO_CODE_MEANING: Record<number, string> = {
  200: "Success",
  401: "Unauthorized",
  402: "Insufficient credits",
  404: "Task not found",
  408: "Upstream returned no result for over 10 minutes",
  422: "Validation error (commonly: recordInfo is null)",
  429: "Rate limited",
  455: "Service unavailable — system maintenance",
  500: "Server error",
  501: "Generation failed",
  505: "Feature disabled"
};

export function recordInfoDisposition(code: number | undefined, httpStatus?: number): RecordInfoDisposition {
  const value = code ?? httpStatus;
  if (value === undefined || value === 200) return "ok";
  switch (value) {
    // The task reached a terminal, unsuccessful end. 408 is documented as the upstream having
    // produced nothing for over ten minutes, which is a failure, not a reason to keep waiting.
    case 408:
    case 501:
      return "failed";
    // The record is not (yet) queryable. Right after createTask this is a propagation gap, so a
    // short grace window keeps a freshly created task from being declared missing.
    case 404:
    case 422:
      return "invisible";
    case 429:
    case 455:
    case 500:
    case 502:
    case 503:
    case 504:
      return "retry";
    default:
      return value >= 500 ? "retry" : "fatal";
  }
}

/** Human-readable reason for a code, falling back to the message KIE sent. */
export function recordInfoReason(code: number | undefined, message: string): string {
  const meaning = code !== undefined ? RECORD_INFO_CODE_MEANING[code] : undefined;
  if (!meaning) return message;
  return message && message.toLowerCase() !== "success" ? `${meaning}: ${message}` : meaning;
}

/**
 * Build the task record a failing envelope code implies, so every downstream consumer sees one
 * shape — a `state` plus `failCode`/`failMsg` — whether the failure arrived as `state: "fail"`
 * or as `code: 501` on an otherwise empty body.
 */
export function syntheticFailurePayload(args: { taskId: string; code?: number; message: string }): {
  code: number;
  msg: string;
  data: { taskId: string; state: string; failCode: string; failMsg: string };
} {
  const reason = recordInfoReason(args.code, args.message);
  return {
    code: args.code ?? 500,
    msg: reason,
    data: {
      taskId: args.taskId,
      state: "fail",
      failCode: args.code !== undefined ? String(args.code) : "",
      failMsg: reason
    }
  };
}

/** Raised when recordInfo says the task record is not queryable (code 404/422). */
export class TaskNotVisibleError extends Error {
  readonly taskId: string;
  readonly code?: number;

  constructor(args: { taskId: string; code?: number; message: string }) {
    super(args.message);
    this.name = "TaskNotVisibleError";
    this.taskId = args.taskId;
    if (args.code !== undefined) this.code = args.code;
  }
}
