import { normalizeError } from "./errors.js";
import { classifyTaskState, isFailedStatus, isSuccessStatus, isTerminalStatus } from "./task-status.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export { classifyTaskState, isFailedStatus, isSuccessStatus, isTerminalStatus };

export const GenerationKindSchema = z.enum(["image", "video", "audio", "file"]);
export const GenerationViewSchema = z.object({
  taskId: z.string(),
  label: z.string().optional(),
  kind: GenerationKindSchema,
  model: z.string().optional(),
  prompt: z.string().optional(),
  status: z.string(),
  outcome: z
    .enum(["pending", "success", "failed", "unrecognized"])
    .describe(
      "Normalized reading of the KIE task state. Branch on this, not on `status`: only \"success\" means the asset is ready, and only \"pending\" means checking again can help."
    ),
  progress: z.number().optional(),
  outputUrls: z.array(z.string().url()),
  resultObject: z
    .unknown()
    .optional()
    .describe("Non-URL result payload, for models documented to return {resultObject: {...}} instead of media URLs."),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  warning: z.string().optional(),
  creditsConsumed: z.number().optional(),
  deduplicated: z
    .boolean()
    .optional()
    .describe("True when an idempotencyKey replayed an earlier submission instead of creating a new paid task.")
});
export type GenerationKind = z.infer<typeof GenerationKindSchema>;
export type GenerationView = z.infer<typeof GenerationViewSchema>;
export const GenerationResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  taskIds: z.array(z.string()),
  generations: z.array(GenerationViewSchema)
});

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return record(value);
  }
  try {
    return record(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function uniqueHttpUrls(value: unknown, found = new Set<string>()): string[] {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") {
        found.add(url.href);
      }
    } catch {
      // Non-URL strings are normal in task payloads.
    }
    return [...found];
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      uniqueHttpUrls(item, found);
    }
    return [...found];
  }
  const object = record(value);
  if (object) {
    for (const item of Object.values(object)) {
      uniqueHttpUrls(item, found);
    }
  }
  return [...found];
}

/**
 * Pull the finished media out of a parsed `resultJson`.
 *
 * The Get Task Details reference documents exactly where output lands: `{resultUrls: []}` for
 * media, plus `firstFrameUrl`/`lastFrameUrl` when a Seedance job asks for frames, and
 * `{resultObject: {mask_urls: []}}` for OmniHuman subject detection. Reading those fields in
 * their documented order keeps the ordering stable and stops unrelated URLs elsewhere in the
 * payload (echoed inputs, reference media) from being reported as generated assets. Scraping the
 * whole object stays as a fallback so an undocumented future shape still yields something.
 */
export function outputUrlsFromResult(parsedResult: Record<string, unknown> | undefined): string[] {
  if (!parsedResult) {
    return [];
  }

  const ordered = new Set<string>();
  const push = (value: unknown): void => {
    for (const url of uniqueHttpUrls(value)) {
      ordered.add(url);
    }
  };

  push(parsedResult.resultUrls);
  push(parsedResult.firstFrameUrl);
  push(parsedResult.lastFrameUrl);
  const resultObject = record(parsedResult.resultObject);
  push(resultObject?.mask_urls);

  if (ordered.size > 0) {
    return [...ordered];
  }
  return uniqueHttpUrls(parsedResult);
}

function inferKind(urls: string[], model?: string, hint?: GenerationKind): GenerationKind {
  if (hint) {
    return hint;
  }
  const paths = urls.map((url) => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  });
  if (paths.some((path) => /\.(mp4|mov|webm|m4v)$/.test(path))) {
    return "video";
  }
  if (paths.some((path) => /\.(mp3|wav|m4a|aac|flac|ogg)$/.test(path))) {
    return "audio";
  }
  if (paths.some((path) => /\.(png|jpe?g|webp|gif|avif)$/.test(path))) {
    return "image";
  }
  const normalizedModel = model?.toLowerCase() ?? "";
  if (normalizedModel.includes("video") || normalizedModel.includes("seedance")) {
    return "video";
  }
  if (normalizedModel.includes("speech") || normalizedModel.includes("audio")) {
    return "audio";
  }
  if (normalizedModel.includes("image") || normalizedModel.includes("seedream")) {
    return "image";
  }
  return "file";
}

function messageFromError(error: unknown): string {
  const normalized = normalizeError(error);
  return typeof normalized.message === "string" ? normalized.message : JSON.stringify(normalized);
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mimeTypeForUrl(url: string): string | undefined {
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return undefined;
  }
  const extension = path.match(/\.([a-z0-9]+)$/)?.[1];
  return {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    m4v: "video/x-m4v",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    ogg: "audio/ogg"
  }[extension ?? ""];
}

export function generationFromTask(args: {
  taskId: string;
  payload: unknown;
  label?: string;
  kind?: GenerationKind;
  prompt?: string;
}): GenerationView {
  const envelope = record(args.payload);
  const data = record(envelope?.data);
  const parsedResult = record(data?.parsedResultJson) ?? parseRecord(data?.resultJson);
  const params = parseRecord(data?.param);
  const input = record(params?.input);
  const model = String(data?.model ?? params?.model ?? "") || undefined;
  const outputUrls = outputUrlsFromResult(parsedResult);
  const resultObject = record(parsedResult?.resultObject);
  // `state` is the documented field; `status` is accepted only as a fallback for sibling APIs
  // and for this server's own synthesized rows.
  const status = String(data?.state ?? data?.status ?? envelope?.status ?? "unknown").toLowerCase();
  const outcome = classifyTaskState(status);
  const progressValue = optionalNumber(data?.progress);
  const creditsValue = optionalNumber(data?.creditsConsumed);
  const failCode = String(data?.failCode ?? "");
  const failMessage = String(data?.failMsg ?? (outcome === "failed" ? envelope?.msg ?? "" : ""));
  // A task can be "success" and still hand back nothing usable. Saying so beats returning a
  // green row with an empty URL list that the caller then has to notice on its own.
  const warning =
    outcome === "success" && outputUrls.length === 0 && !resultObject
      ? `KIE reported task ${args.taskId} as successful but returned no result URLs. Re-check with kie_get_creation, or resubmit if it stays empty.`
      : outcome === "unrecognized"
        ? `KIE reported an unrecognized task state "${status}" for task ${args.taskId}. Treating it as unfinished.`
        : undefined;

  return {
    taskId: args.taskId,
    ...(args.label ? { label: args.label } : {}),
    kind: inferKind(outputUrls, model, args.kind),
    ...(model ? { model } : {}),
    ...(args.prompt ?? (typeof input?.prompt === "string" ? input.prompt : undefined)
      ? { prompt: args.prompt ?? String(input?.prompt) }
      : {}),
    status,
    outcome,
    ...(progressValue !== undefined ? { progress: Math.max(0, Math.min(100, progressValue)) } : {}),
    outputUrls,
    ...(resultObject ? { resultObject } : {}),
    ...(outcome === "failed" && failMessage ? { error: failMessage } : {}),
    ...(outcome === "failed" && failCode ? { errorCode: failCode } : {}),
    ...(warning ? { warning } : {}),
    ...(creditsValue !== undefined ? { creditsConsumed: creditsValue } : {})
  };
}

export function generationToolResult(generations: GenerationView[]): CallToolResult {
  const complete = generations.filter((item) => item.outcome === "success").length;
  const failed = generations.filter((item) => item.outcome === "failed").length;
  const taskIds = generations.map((item) => item.taskId).filter((taskId) => taskId !== "unavailable");
  const structuredContent = {
    title: generations.length === 1 ? "Creation" : "Creations",
    summary: `${complete} complete · ${failed} failed · ${generations.length - complete - failed} in progress`,
    taskIds,
    generations
  };
  const resultLines = generations.map((generation, index) => {
    const name = generation.label ?? `${generation.kind} ${index + 1}`;
    return [
      `${index + 1}. ${name}`,
      generation.status,
      `task ${generation.taskId}`,
      generation.model,
      generation.creditsConsumed !== undefined ? `${generation.creditsConsumed} credits` : undefined,
      generation.error,
      generation.warning,
      ...generation.outputUrls
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" | ");
  });
  const mediaLinks = generations.flatMap((generation) =>
    generation.outputUrls.map((url, outputIndex) => {
      const mimeType = mimeTypeForUrl(url);
      return {
        type: "resource_link" as const,
        uri: url,
        name: generation.label ?? `${generation.kind}-${generation.taskId}-${outputIndex + 1}`,
        description: `${generation.kind} result from KIE task ${generation.taskId}`,
        ...(mimeType ? { mimeType } : {}),
        annotations: { audience: ["user" as const], priority: 0.9 }
      };
    })
  );
  // When nothing survived, the call as a whole failed: say so with isError so an automated caller
  // does not have to inspect every row to notice. A partial success stays a success.
  const allFailed = generations.length > 0 && failed === generations.length;
  return {
    ...(allFailed ? { isError: true as const } : {}),
    content: [{ type: "text" as const, text: [structuredContent.summary, ...resultLines].join("\n") }, ...mediaLinks],
    structuredContent
  };
}

export async function safeGenerationTool(handler: () => Promise<GenerationView[]>): Promise<CallToolResult> {
  try {
    return generationToolResult(await handler());
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify(normalized, null, 2) }]
    };
  }
}

export function failedGeneration(args: {
  taskId: string;
  error: unknown;
  label?: string;
  kind?: GenerationKind;
  prompt?: string;
}): GenerationView {
  return {
    taskId: args.taskId,
    ...(args.label ? { label: args.label } : {}),
    kind: args.kind ?? "file",
    ...(args.prompt ? { prompt: args.prompt } : {}),
    status: "error",
    outcome: "failed" as const,
    outputUrls: [],
    error: messageFromError(args.error)
  };
}
