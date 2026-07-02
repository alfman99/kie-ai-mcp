import type { KieHttpClient } from "./http.js";

const TERMINAL_STATUSES = new Set(["success", "fail", "failed", "error"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResultJson(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const envelope = payload as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object" ? (envelope.data as Record<string, unknown>) : undefined;
  const resultJson = data?.resultJson;
  if (typeof resultJson !== "string" || resultJson.length === 0) {
    return payload;
  }

  try {
    return {
      ...envelope,
      data: {
        ...data,
        parsedResultJson: JSON.parse(resultJson)
      }
    };
  } catch {
    return payload;
  }
}

export async function getMarketTask(client: KieHttpClient, taskId: string): Promise<unknown> {
  const payload = await client.requestJson({
    method: "GET",
    path: "/api/v1/jobs/recordInfo",
    query: { taskId }
  });
  return parseResultJson(payload);
}

export async function waitForMarketTask(args: {
  client: KieHttpClient;
  taskId: string;
  intervalMs: number;
  timeoutMs: number;
}): Promise<unknown> {
  const started = Date.now();

  while (Date.now() - started <= args.timeoutMs) {
    const payload = await getMarketTask(args.client, args.taskId);
    const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>).data : undefined;
    const status =
      data && typeof data === "object"
        ? String((data as Record<string, unknown>).status ?? (data as Record<string, unknown>).state ?? "").toLowerCase()
        : "";

    if (TERMINAL_STATUSES.has(status)) {
      return payload;
    }

    await sleep(args.intervalMs);
  }

  throw new Error(`Timed out waiting for KIE task ${args.taskId} after ${args.timeoutMs}ms.`);
}
