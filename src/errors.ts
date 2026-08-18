export class KieApiError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly response: unknown;
  /** Server-advertised wait from a Retry-After header, honoured by the poll loop on 429/503. */
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: { status?: number; code?: number; response?: unknown; retryAfterMs?: number } = {}
  ) {
    super(message);
    this.name = "KieApiError";
    this.status = options.status;
    this.code = options.code;
    this.response = options.response;
    this.retryAfterMs = options.retryAfterMs;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      ...(this.retryAfterMs !== undefined ? { retryAfterMs: this.retryAfterMs } : {}),
      response: this.response
    };
  }
}

export type ErrorCategory =
  | "auth"
  | "input"
  | "credits"
  | "rate_limit"
  | "server"
  | "network"
  | "timeout"
  | "cancelled"
  | "unknown";

export type ErrorClassification = {
  category: ErrorCategory;
  retryable: boolean;
  nextStep: string;
};

const CATEGORY_NEXT_STEP: Record<ErrorCategory, string> = {
  auth: "Set a valid KIE_API_KEY and restart the MCP server. Retrying will not help.",
  input: "Fix the reported field and submit again. Retrying the same input will fail the same way.",
  credits: "Top up the KIE account, then submit again. Check kie_get_credits first.",
  rate_limit: "Wait for the reported delay and retry. Lower KIE_MAX_CONCURRENT_REQUESTS if this repeats.",
  server: "Transient KIE-side failure. Retry with backoff.",
  network: "Transient connectivity failure. Retry with backoff.",
  timeout: "The task may still be running. Poll kie_get_creation with the task ID instead of resubmitting.",
  cancelled: "The caller cancelled this request. Resubmit only if the work is still wanted.",
  unknown: "Inspect the response field, then retry once before escalating."
};

/**
 * Map an error onto a stable, machine-readable shape. Automated callers branch on `category`
 * and `retryable` instead of pattern-matching message strings.
 */
export function classifyError(error: unknown): ErrorClassification {
  const category = categoryOf(error);
  return {
    category,
    retryable: ["rate_limit", "server", "network", "timeout"].includes(category),
    nextStep: CATEGORY_NEXT_STEP[category]
  };
}

function categoryOf(error: unknown): ErrorCategory {
  if (error instanceof KieApiError) {
    const status = error.status ?? 0;
    const code = error.code ?? 0;
    const codes = [status, code];
    if (codes.includes(401) || codes.includes(403)) return "auth";
    if (codes.includes(402)) return "credits";
    if (codes.includes(429)) return "rate_limit";
    if (codes.includes(408) || codes.includes(504)) return "timeout";
    if (codes.some((value) => value >= 500)) return "server";
    if (codes.some((value) => value >= 400)) {
      return /credit|balance|insufficient|quota/i.test(error.message) ? "credits" : "input";
    }
    return "unknown";
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || /cancelled the request/i.test(error.message)) return "cancelled";
    if (/timed out|deadline|exceeded the remaining/i.test(error.message)) return "timeout";
    if (error.name === "TimeoutError") return "timeout";
    if (error.name === "TypeError" || /fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|socket/i.test(error.message)) {
      return "network";
    }
    // Locally raised validation errors carry the field name in the message.
    if (/requires?d?|must be|does not accept|not support|invalid|at most|at least|mutually exclusive/i.test(error.message)) {
      return "input";
    }
    return "unknown";
  }

  return "unknown";
}

export function normalizeError(error: unknown): Record<string, unknown> {
  const classification = classifyError(error);

  if (error instanceof KieApiError) {
    return { ...error.toJSON(), ...classification };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...classification
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    ...classification
  };
}

