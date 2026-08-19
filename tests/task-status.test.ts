import { describe, expect, it } from "vitest";
import {
  classifyTaskState,
  isTerminalStatus,
  recordInfoDisposition,
  syntheticFailurePayload
} from "../src/task-status.js";

describe("market task states", () => {
  it("classifies every state documented for GET /api/v1/jobs/recordInfo", () => {
    expect(classifyTaskState("waiting")).toBe("pending");
    expect(classifyTaskState("queuing")).toBe("pending");
    expect(classifyTaskState("generating")).toBe("pending");
    expect(classifyTaskState("success")).toBe("success");
    expect(classifyTaskState("fail")).toBe("failed");
  });

  it("treats an unknown state as unfinished rather than silently successful", () => {
    expect(classifyTaskState("moderating")).toBe("unrecognized");
    expect(isTerminalStatus("moderating")).toBe(false);
    expect(isTerminalStatus("SUCCESS")).toBe(true);
  });
});

describe("recordInfo envelope codes", () => {
  it("reads a finished-but-failed task off the envelope code", () => {
    expect(recordInfoDisposition(501)).toBe("failed");
    expect(recordInfoDisposition(408)).toBe("failed");
  });

  it("treats a not-yet-queryable record as retryable rather than fatal", () => {
    expect(recordInfoDisposition(404)).toBe("invisible");
    expect(recordInfoDisposition(422)).toBe("invisible");
  });

  it("separates transient server conditions from unrecoverable ones", () => {
    expect(recordInfoDisposition(429)).toBe("retry");
    expect(recordInfoDisposition(455)).toBe("retry");
    expect(recordInfoDisposition(500)).toBe("retry");
    expect(recordInfoDisposition(401)).toBe("fatal");
    expect(recordInfoDisposition(402)).toBe("fatal");
  });

  it("renders a code-carried failure in the same shape as a state-carried one", () => {
    expect(syntheticFailurePayload({ taskId: "task_1", code: 501, message: "Generation Failed" })).toMatchObject({
      data: { taskId: "task_1", state: "fail", failCode: "501" }
    });
  });
});
