import { describe, expect, it, vi } from "vitest";
import { submissionFingerprint, TaskStore } from "../src/task-store.js";

function store(overrides: Partial<ConstructorParameters<typeof TaskStore>[0]> = {}) {
  return new TaskStore({ submissionTtlMs: 60_000, resultTtlMs: 60_000, maxEntries: 10, ...overrides });
}

describe("submission fingerprints", () => {
  it("ignores key order so the same input hashes identically", () => {
    const left = submissionFingerprint({ model: "m", input: { a: 1, b: { c: 2, d: 3 } } });
    const right = submissionFingerprint({ model: "m", input: { b: { d: 3, c: 2 }, a: 1 } });

    expect(left).toBe(right);
  });

  it("separates different models and inputs", () => {
    expect(submissionFingerprint({ model: "a", input: { p: 1 } })).not.toBe(
      submissionFingerprint({ model: "b", input: { p: 1 } })
    );
    expect(submissionFingerprint({ model: "a", input: { p: 1 } })).not.toBe(
      submissionFingerprint({ model: "a", input: { p: 2 } })
    );
  });

  it("uses an explicit key verbatim so callers control replay", () => {
    expect(submissionFingerprint({ model: "a", input: { p: 1 }, idempotencyKey: "nightly" })).toBe("key:nightly");
  });
});

describe("submission de-duplication", () => {
  it("replays the original submission instead of paying twice", async () => {
    const subject = store();
    const submit = vi.fn(async () => ({ taskId: "task_1", payload: { ok: true } }));

    const first = await subject.submitOnce("key:a", submit);
    const second = await subject.submitOnce("key:a", submit);

    expect(submit).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({ taskId: "task_1", deduplicated: false });
    expect(second).toMatchObject({ taskId: "task_1", deduplicated: true });
  });

  it("joins an in-flight duplicate rather than racing a second paid submission", async () => {
    const subject = store();
    let release: (() => void) | undefined;
    const submit = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { taskId: "task_1", payload: {} };
    });

    const both = Promise.all([subject.submitOnce("key:a", submit), subject.submitOnce("key:a", submit)]);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    release?.();

    expect((await both).map((entry) => entry.taskId)).toEqual(["task_1", "task_1"]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed submission, so a genuine retry can still run", async () => {
    const subject = store();
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ taskId: "task_1", payload: {} });

    await expect(subject.submitOnce("key:a", submit)).rejects.toThrow("network down");
    await expect(subject.submitOnce("key:a", submit)).resolves.toMatchObject({ taskId: "task_1" });
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("submits every time when no fingerprint is supplied", async () => {
    const subject = store();
    const submit = vi.fn(async () => ({ taskId: "task_1", payload: {} }));

    await subject.submitOnce(undefined, submit);
    await subject.submitOnce(undefined, submit);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("does not replay a submission after its window closes", async () => {
    const subject = store({ submissionTtlMs: 1 });
    const submit = vi.fn(async () => ({ taskId: "task_1", payload: {} }));

    await subject.submitOnce("key:a", submit);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await subject.submitOnce("key:a", submit);

    expect(submit).toHaveBeenCalledTimes(2);
  });
});

describe("terminal result cache", () => {
  it("returns a remembered result and forgets it after the ttl", async () => {
    const subject = store({ resultTtlMs: 5 });
    subject.rememberResult("task_1", { done: true });

    expect(subject.findResult("task_1")).toEqual({ done: true });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(subject.findResult("task_1")).toBeUndefined();
  });

  it("bounds memory by evicting the oldest entries", () => {
    const subject = store({ maxEntries: 2 });
    subject.rememberResult("a", 1);
    subject.rememberResult("b", 2);
    subject.rememberResult("c", 3);

    expect(subject.findResult("a")).toBeUndefined();
    expect(subject.findResult("c")).toBe(3);
    expect(subject.stats().results).toBe(2);
  });
});
