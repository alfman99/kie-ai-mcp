import { isTerminalStatus } from "./generations.js";
import type { MarketTaskProgress } from "./task.js";

export type ProgressUpdate = {
  progress: number;
  total?: number;
  message?: string;
};

export type ProgressContext = {
  _meta?: { progressToken?: string | number };
  signal?: AbortSignal;
  sendNotification: (notification: {
    method: "notifications/progress";
    params: ProgressUpdate & { progressToken: string | number };
  }) => Promise<void>;
};

export type ProgressReporter = (update: ProgressUpdate) => Promise<void>;

export function createProgressReporter(context?: ProgressContext): ProgressReporter {
  const progressToken = context?._meta?.progressToken;
  const sendNotification = context?.sendNotification;
  const signal = context?.signal;
  let lastProgress = 0;
  let latest: ProgressUpdate | undefined;
  let draining = false;

  /**
   * Coalescing, non-blocking reporter. Batch tools share one reporter across every parallel
   * task, so a strict FIFO queue would make each poll loop wait behind every other task's
   * notification. Instead only the newest update is kept: one send is in flight, later callers
   * drop their update into `latest` and return immediately.
   */
  return async (update) => {
    if (progressToken === undefined || !sendNotification || signal?.aborted) return;
    // Clamp rather than drop, so a message still reaches the client when progress dips.
    latest = { ...update, progress: Math.max(lastProgress, update.progress) };
    if (draining) return;

    draining = true;
    try {
      while (latest && !signal?.aborted) {
        const next = latest;
        latest = undefined;
        lastProgress = next.progress;
        try {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, ...next }
          });
        } catch {
          // Progress is optional. A client notification failure must not fail a media task.
        }
      }
    } finally {
      draining = false;
    }
  };
}

export function createBatchProgressTracker(args: {
  count: number;
  report: ProgressReporter;
  label?: string;
}): (index: number, update: MarketTaskProgress) => Promise<void> {
  const progress = Array.from({ length: args.count }, () => 0);
  const statuses = Array.from({ length: args.count }, () => "submitting");
  const label = args.label ?? "Task";

  return async (index, update) => {
    statuses[index] = update.status;
    progress[index] = update.terminal
      ? 100
      : Math.max(progress[index], update.progress ?? Math.min(95, update.pollCount));
    const average = progress.reduce((sum, value) => sum + value, 0) / progress.length;
    const finished = progress.filter((value) => value === 100).length;
    const active = statuses.filter((status) => !isTerminalStatus(status)).length;
    // A single job reads better as its own status than as a "1/1 finished" tally.
    const message =
      args.count === 1
        ? `${label}: ${update.status}${update.progress !== undefined && !update.terminal ? ` (${Math.round(update.progress)}%)` : ""}`
        : `${finished}/${args.count} finished · ${active} active`;
    await args.report({ progress: Math.min(100, average), total: 100, message });
  };
}
