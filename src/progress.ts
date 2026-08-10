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
  let lastProgress = -1;
  let pending = Promise.resolve();

  return async (update) => {
    if (progressToken === undefined || !sendNotification || signal?.aborted) return;
    pending = pending.then(async () => {
      if (signal?.aborted || update.progress < lastProgress) return;
      lastProgress = update.progress;
      try {
        await sendNotification({
          method: "notifications/progress",
          params: { progressToken, ...update }
        });
      } catch {
        // Progress is optional. A client notification failure must not fail a media task.
      }
    });
    await pending;
  };
}

export function reportMarketTaskProgress(
  report: ProgressReporter,
  update: MarketTaskProgress,
  label: string
): Promise<void> {
  const progress = update.terminal ? 100 : Math.min(99, update.progress ?? Math.max(1, update.pollCount));
  const message = update.terminal
    ? `${label}: ${update.status}`
    : `${label}: ${update.status}${update.progress !== undefined ? ` (${Math.round(update.progress)}%)` : ""}`;
  return report({ progress, total: 100, message });
}

export function createBatchProgressTracker(args: {
  count: number;
  report: ProgressReporter;
}): (index: number, update: MarketTaskProgress) => Promise<void> {
  const progress = Array.from({ length: args.count }, () => 0);
  const statuses = Array.from({ length: args.count }, () => "submitting");

  return async (index, update) => {
    statuses[index] = update.status;
    progress[index] = update.terminal
      ? 100
      : Math.max(progress[index], update.progress ?? Math.min(95, update.pollCount));
    const average = progress.reduce((sum, value) => sum + value, 0) / progress.length;
    const finished = progress.filter((value) => value === 100).length;
    const active = statuses.filter((status) => !isTerminalStatus(status)).length;
    await args.report({
      progress: Math.min(100, average),
      total: 100,
      message: `${finished}/${args.count} finished · ${active} active`
    });
  };
}
