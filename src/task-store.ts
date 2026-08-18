import { createHash } from "node:crypto";

/**
 * Deterministic JSON with sorted keys, so `{a:1,b:2}` and `{b:2,a:1}` hash identically.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

export function submissionFingerprint(args: {
  model: string;
  input: Record<string, unknown>;
  idempotencyKey?: string;
}): string {
  if (args.idempotencyKey) {
    return `key:${args.idempotencyKey}`;
  }
  return `auto:${createHash("sha256")
    .update(JSON.stringify(canonicalize({ model: args.model, input: args.input })))
    .digest("hex")}`;
}

type Entry<T> = { value: T; expiresAt: number };

/** Small insertion-ordered TTL map. Entries are bounded so a long-lived server cannot grow without limit. */
class TtlMap<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly ttlMs: number, private readonly maxEntries: number) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.ttlMs <= 0 || this.maxEntries <= 0) {
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }
}

export type SubmissionRecord = { taskId?: string; payload: unknown };

/**
 * Shared per-server memory for two things automated callers need:
 *
 * 1. Submission de-duplication. A retried create call must not spend credits twice. Callers that
 *    pass an `idempotencyKey` get the original task back instead of a second paid submission, and
 *    a duplicate that arrives while the first is still in flight joins that request rather than
 *    racing it.
 * 2. Terminal result caching. A finished KIE task never changes, so repeated status checks are
 *    served from memory instead of the network.
 */
export class TaskStore {
  private readonly submissions: TtlMap<SubmissionRecord>;
  private readonly results: TtlMap<unknown>;
  private readonly inFlight = new Map<string, Promise<SubmissionRecord>>();

  constructor(args: {
    submissionTtlMs: number;
    resultTtlMs: number;
    maxEntries: number;
  }) {
    this.submissions = new TtlMap(args.submissionTtlMs, args.maxEntries);
    this.results = new TtlMap(args.resultTtlMs, args.maxEntries);
  }

  /**
   * Run `submit` unless an identical submission is already known or in flight.
   * Returns the record plus whether it came from a previous call.
   */
  async submitOnce(
    fingerprint: string | undefined,
    submit: () => Promise<SubmissionRecord>
  ): Promise<SubmissionRecord & { deduplicated: boolean }> {
    if (!fingerprint) {
      return { ...(await submit()), deduplicated: false };
    }

    const remembered = this.submissions.get(fingerprint);
    if (remembered) {
      return { ...remembered, deduplicated: true };
    }

    const pending = this.inFlight.get(fingerprint);
    if (pending) {
      return { ...(await pending), deduplicated: true };
    }

    const started = submit()
      .then((record) => {
        // Only a submission that produced a task ID is worth replaying; a failed call should
        // be retryable rather than permanently cached as a failure.
        if (record.taskId) {
          this.submissions.set(fingerprint, record);
        }
        return record;
      })
      .finally(() => {
        this.inFlight.delete(fingerprint);
      });
    this.inFlight.set(fingerprint, started);
    return { ...(await started), deduplicated: false };
  }

  rememberResult(taskId: string, payload: unknown): void {
    this.results.set(taskId, payload);
  }

  findResult(taskId: string): unknown | undefined {
    return this.results.get(taskId);
  }

  stats(): { submissions: number; results: number; inFlight: number } {
    return { submissions: this.submissions.size, results: this.results.size, inFlight: this.inFlight.size };
  }
}
