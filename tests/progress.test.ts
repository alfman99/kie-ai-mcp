import { describe, expect, it, vi } from "vitest";
import { createProgressReporter } from "../src/progress.js";

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
});
