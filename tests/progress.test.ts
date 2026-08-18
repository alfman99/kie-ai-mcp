import { describe, expect, it, vi } from "vitest";
import { createProgressReporter, type ProgressUpdate } from "../src/progress.js";

type ProgressNotification = {
  method: "notifications/progress";
  params: ProgressUpdate & { progressToken: string | number };
};

describe("progress reporting", () => {
  it("sends equal progress values as heartbeat notifications", async () => {
    const sendNotification = vi.fn(async () => undefined);
    const report = createProgressReporter({
      _meta: { progressToken: "token" },
      sendNotification
    });

    await report({ progress: 40, total: 100, message: "Generating (40%)" });
    await report({ progress: 40, total: 100, message: "Generating (40%)" });

    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent updates instead of queueing one send per parallel task", async () => {
    let release: (() => void) | undefined;
    const sendNotification = vi.fn((_notification: ProgressNotification) =>
      release
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            release = resolve;
          })
    );
    const report = createProgressReporter({
      _meta: { progressToken: "token" },
      sendNotification
    });

    const first = report({ progress: 10, total: 100, message: "1/8 finished" });
    // Sixteen parallel pollers report while the first send is still in flight.
    const rest = Array.from({ length: 16 }, (_unused, index) =>
      report({ progress: 20 + index, total: 100, message: `${index}/8 finished` })
    );

    // None of them block behind the in-flight send.
    await Promise.all(rest);
    expect(sendNotification).toHaveBeenCalledTimes(1);

    release?.();
    await first;

    // Only the newest state is sent afterwards, not sixteen queued updates.
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification.mock.calls[1]?.[0]).toMatchObject({
      params: { progress: 35, message: "15/8 finished" }
    });
  });

  it("keeps the message when a batch average dips, without moving progress backwards", async () => {
    const sendNotification = vi.fn(async (_notification: ProgressNotification) => undefined);
    const report = createProgressReporter({
      _meta: { progressToken: "token" },
      sendNotification
    });

    await report({ progress: 60, total: 100, message: "5/8 finished" });
    await report({ progress: 40, total: 100, message: "6/8 finished" });

    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification.mock.calls[1]?.[0]).toMatchObject({
      params: { progress: 60, message: "6/8 finished" }
    });
  });
});
