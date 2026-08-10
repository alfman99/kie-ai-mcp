import { normalizeError } from "./errors.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const GenerationKindSchema = z.enum(["image", "video", "audio", "file"]);
export const GenerationViewSchema = z.object({
  taskId: z.string(),
  label: z.string().optional(),
  kind: GenerationKindSchema,
  model: z.string().optional(),
  prompt: z.string().optional(),
  status: z.string(),
  progress: z.number().optional(),
  outputUrls: z.array(z.string().url()),
  error: z.string().optional(),
  creditsConsumed: z.number().optional()
});
export type GenerationKind = z.infer<typeof GenerationKindSchema>;
export type GenerationView = z.infer<typeof GenerationViewSchema>;
export const GenerationResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  taskIds: z.array(z.string()),
  generations: z.array(GenerationViewSchema)
});

const FAILED_STATUSES = new Set(["fail", "failed", "error", "wait_failed"]);
const TERMINAL_STATUSES = new Set(["success", "fail", "failed", "error"]);

export function isFailedStatus(status: string): boolean {
  return FAILED_STATUSES.has(status.toLowerCase());
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status.toLowerCase());
}

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
  const outputUrls = uniqueHttpUrls(parsedResult);
  const status = String(data?.state ?? data?.status ?? envelope?.status ?? "unknown").toLowerCase();
  const progressValue = optionalNumber(data?.progress);
  const creditsValue = optionalNumber(data?.creditsConsumed);
  const failMessage = String(data?.failMsg ?? envelope?.msg ?? "");

  return {
    taskId: args.taskId,
    ...(args.label ? { label: args.label } : {}),
    kind: inferKind(outputUrls, model, args.kind),
    ...(model ? { model } : {}),
    ...(args.prompt ?? (typeof input?.prompt === "string" ? input.prompt : undefined)
      ? { prompt: args.prompt ?? String(input?.prompt) }
      : {}),
    status,
    ...(progressValue !== undefined ? { progress: progressValue } : {}),
    outputUrls,
    ...(isFailedStatus(status) && failMessage ? { error: failMessage } : {}),
    ...(creditsValue !== undefined ? { creditsConsumed: creditsValue } : {})
  };
}

export function generationToolResult(generations: GenerationView[]): CallToolResult {
  const complete = generations.filter((item) => item.status === "success").length;
  const failed = generations.filter((item) => isFailedStatus(item.status)).length;
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
  return {
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
    outputUrls: [],
    error: messageFromError(args.error)
  };
}
