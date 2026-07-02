import { describe, expect, it } from "vitest";
import { extractTaskId, generateWebhookSignature, verifyWebhookSignature } from "../src/webhook.js";

describe("webhook verification", () => {
  it("extracts both taskId and task_id callback shapes", () => {
    expect(extractTaskId({ data: { taskId: "task_a" } })).toBe("task_a");
    expect(extractTaskId({ data: { task_id: "task_b" } })).toBe("task_b");
    expect(extractTaskId({ taskId: "task_c" })).toBe("task_c");
  });

  it("verifies KIE webhook signatures", () => {
    const payload = { data: { task_id: "task_123" } };
    const timestamp = 1760000000;
    const key = "secret";
    const signature = generateWebhookSignature("task_123", timestamp, key);

    expect(verifyWebhookSignature({ payload, timestamp, key, signature })).toMatchObject({
      valid: true,
      taskId: "task_123"
    });

    expect(verifyWebhookSignature({ payload, timestamp, key, signature: "bad" })).toMatchObject({
      valid: false,
      reason: "Signature length mismatch."
    });
  });
});

