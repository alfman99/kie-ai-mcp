import { createHmac, timingSafeEqual } from "node:crypto";

export function extractTaskId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : undefined;
  const candidates = [data?.taskId, data?.task_id, root.taskId, root.task_id];
  const found = candidates.find((value) => typeof value === "string" && value.length > 0);
  return found as string | undefined;
}

export function generateWebhookSignature(taskId: string, timestamp: string | number, key: string): string {
  return createHmac("sha256", key).update(`${taskId}.${timestamp}`).digest("base64");
}

export function verifyWebhookSignature(args: {
  payload: unknown;
  timestamp: string | number;
  signature: string;
  key: string;
}): { valid: boolean; taskId?: string; expectedSignature?: string; reason?: string } {
  const taskId = extractTaskId(args.payload);
  if (!taskId) {
    return { valid: false, reason: "Missing taskId/task_id in webhook payload." };
  }

  const expectedSignature = generateWebhookSignature(taskId, args.timestamp, args.key);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(args.signature);

  if (expected.length !== received.length) {
    return { valid: false, taskId, expectedSignature, reason: "Signature length mismatch." };
  }

  return {
    valid: timingSafeEqual(expected, received),
    taskId,
    expectedSignature
  };
}

