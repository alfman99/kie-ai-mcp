import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  failedGeneration,
  GenerationKindSchema,
  GenerationResultSchema,
  generationFromTask,
  safeGenerationTool,
  type GenerationKind,
  type GenerationView
} from "./generations.js";
import type { KieHttpClient } from "./http.js";
import { createAndMaybeWaitForMarketTask } from "./market.js";
import {
  createBatchProgressTracker,
  createProgressReporter,
  reportMarketTaskProgress
} from "./progress.js";
import { getMarketTask, waitForMarketTask } from "./task.js";
import type { KieConfig, MarketModelRecord } from "./types.js";

const JsonRecordSchema = z.record(z.string(), z.unknown());
const GptImage2ModelSchema = z.enum(["gpt-image-2-text-to-image", "gpt-image-2-image-to-image"]);
const SeedanceVideoModelSchema = z.enum([
  "bytedance/seedance-2",
  "bytedance/seedance-2-fast",
  "bytedance/seedance-2-mini",
  "bytedance/seedance-2-5"
]);
const VideoInputSchema = z.object({
  prompt: z.string().min(3).max(20000).describe("Plain-language description of the video, shot, motion, style, and subject."),
  aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "adaptive"]).default("16:9"),
  resolution: z.enum(["480p", "720p", "1080p", "4k"]).default("720p"),
  duration: z.union([z.literal(-1), z.number().int().min(4).max(30)]).default(5),
  generateAudio: z.boolean().default(true),
  firstFrameUrl: z.string().url().optional(),
  lastFrameUrl: z.string().url().optional(),
  referenceImageUrls: z.array(z.string().url()).min(1).max(30).optional(),
  referenceVideoUrls: z.array(z.string().url()).min(1).max(10).optional(),
  referenceAudioUrls: z.array(z.string().url()).min(1).max(10).optional(),
  outputFormat: z.enum(["mp4", "mov"]).optional(),
  model: SeedanceVideoModelSchema.default("bytedance/seedance-2"),
  callBackUrl: z.string().url().optional(),
  additionalInput: JsonRecordSchema.default({})
});
const VideoBatchJobSchema = VideoInputSchema.extend({
  label: z.string().min(1).max(120).optional()
});
type VideoInput = z.infer<typeof VideoInputSchema>;

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function validateGptImage2Combination(model: string, input: Record<string, unknown>): void {
  const inputUrls = Array.isArray(input.input_urls) ? input.input_urls : [];
  if (model === "gpt-image-2-text-to-image" && inputUrls.length > 0) {
    throw new Error("gpt-image-2-text-to-image does not accept inputUrls; use gpt-image-2-image-to-image.");
  }
  if (model === "gpt-image-2-image-to-image" && inputUrls.length === 0) {
    throw new Error("gpt-image-2-image-to-image requires at least one inputUrls entry.");
  }
  if (input.resolution === "4K" && input.aspect_ratio === "1:1") {
    throw new Error("GPT Image 2 does not support 4K output at a 1:1 aspect ratio.");
  }
  if (input.resolution !== "1K" && input.aspect_ratio === "auto") {
    throw new Error('GPT Image 2 only supports resolution "1K" when aspectRatio is "auto".');
  }
  if (
    model === "gpt-image-2-text-to-image" &&
    input.resolution !== "1K" &&
    ["5:4", "4:5", "3:1", "1:3", "9:21"].includes(String(input.aspect_ratio))
  ) {
    throw new Error(`GPT Image 2 text-to-image does not support ${String(input.aspect_ratio)} at ${String(input.resolution)}.`);
  }
  if (
    model === "gpt-image-2-image-to-image" &&
    input.resolution !== "1K" &&
    ["5:4", "4:5"].includes(String(input.aspect_ratio))
  ) {
    throw new Error(`GPT Image 2 image-to-image only supports ${String(input.aspect_ratio)} at 1K.`);
  }
}

function validateSeedanceCombination(model: string, input: Record<string, unknown>): void {
  const label =
    model === "bytedance/seedance-2-5"
      ? "Seedance 2.5"
      : model === "bytedance/seedance-2-fast"
        ? "Seedance 2 Fast"
        : model === "bytedance/seedance-2-mini"
          ? "Seedance 2 Mini"
          : "Seedance 2";
  const hasFrames = Boolean(input.first_frame_url || input.last_frame_url);
  const hasReferences = ["reference_image_urls", "reference_video_urls", "reference_audio_urls"].some(
    (field) => Array.isArray(input[field]) && input[field].length > 0
  );
  if (input.last_frame_url && !input.first_frame_url) {
    throw new Error(`${label} lastFrameUrl requires firstFrameUrl.`);
  }
  if (hasFrames && hasReferences) {
    throw new Error(
      `${label} frame-based and multimodal-reference modes are mutually exclusive; use first/last frames or reference media, not both.`
    );
  }
  const duration = Number(input.duration);
  const resolution = String(input.resolution ?? "");
  const prompt = String(input.prompt ?? "");
  const referenceImages = Array.isArray(input.reference_image_urls) ? input.reference_image_urls.length : 0;
  const referenceVideos = Array.isArray(input.reference_video_urls) ? input.reference_video_urls.length : 0;
  const referenceAudio = Array.isArray(input.reference_audio_urls) ? input.reference_audio_urls.length : 0;
  if (["bytedance/seedance-2-fast", "bytedance/seedance-2-mini"].includes(model)) {
    if (!["480p", "720p"].includes(resolution)) {
      throw new Error(`${label} resolution must be 480p or 720p.`);
    }
  }
  if (model === "bytedance/seedance-2-mini" && input.return_last_frame !== undefined) {
    throw new Error("Seedance 2 Mini does not accept return_last_frame.");
  }
  if (model === "bytedance/seedance-2-5") {
    if (prompt.length > 5000) {
      throw new Error("Seedance 2.5 prompt must be at most 5000 characters.");
    }
    if (!["480p", "720p"].includes(resolution)) {
      throw new Error("Seedance 2.5 resolution must be 480p or 720p.");
    }
    if (duration !== -1 && (duration < 4 || duration > 30)) {
      throw new Error("Seedance 2.5 duration must be -1 or between 4 and 30 seconds.");
    }
    return;
  }
  if (duration === -1 || duration > 15) {
    throw new Error("Seedance 2 duration must be between 4 and 15 seconds.");
  }
  if (input.output_format !== undefined) {
    throw new Error("Seedance 2 does not accept outputFormat; use Seedance 2.5 for mp4 or mov selection.");
  }
  if (referenceImages > 9 || referenceVideos > 3 || referenceAudio > 3) {
    throw new Error("Seedance 2 accepts at most 9 reference images, 3 reference videos, and 3 reference audios.");
  }
}

function seedanceInput(job: VideoInput): Record<string, unknown> {
  return {
    prompt: job.prompt,
    aspect_ratio: job.aspectRatio,
    resolution: job.resolution,
    duration: job.duration,
    generate_audio: job.generateAudio,
    ...(job.firstFrameUrl ? { first_frame_url: job.firstFrameUrl } : {}),
    ...(job.lastFrameUrl ? { last_frame_url: job.lastFrameUrl } : {}),
    ...(job.referenceImageUrls?.length ? { reference_image_urls: job.referenceImageUrls } : {}),
    ...(job.referenceVideoUrls?.length ? { reference_video_urls: job.referenceVideoUrls } : {}),
    ...(job.referenceAudioUrls?.length ? { reference_audio_urls: job.referenceAudioUrls } : {}),
    ...(job.outputFormat ? { output_format: job.outputFormat } : {}),
    ...job.additionalInput
  };
}

function generationFromFriendlyResult(args: {
  result: Record<string, unknown>;
  prompt: string;
  label?: string;
}): GenerationView {
  const taskId = typeof args.result.taskId === "string" ? args.result.taskId : "unavailable";
  const model = typeof args.result.model === "string" ? args.result.model : undefined;
  const kind = args.result.kind === "speech" ? "audio" : args.result.kind === "image" ? "image" : "video";
  if (args.result.result && taskId !== "unavailable") {
    return generationFromTask({ taskId, payload: args.result.result, kind, prompt: args.prompt, label: args.label });
  }
  const waitError = record(args.result.waitError);
  const error =
    typeof waitError?.message === "string"
      ? `${waitError.message} Task ${taskId} remains available for kie_get_creation.`
      : typeof args.result.warning === "string"
        ? args.result.warning
        : undefined;
  return {
    taskId,
    ...(args.label ? { label: args.label } : {}),
    kind,
    ...(model ? { model } : {}),
    prompt: args.prompt,
    status: typeof args.result.status === "string" ? args.result.status : "submitted",
    outputUrls: [],
    ...(error ? { error } : {})
  };
}

export function registerFriendlyTools(args: {
  server: McpServer;
  client: KieHttpClient;
  config: KieConfig;
  marketModels: MarketModelRecord[];
}): void {
  const { server, client, config, marketModels } = args;

  server.registerTool(
    "kie_create_image",
    {
      title: "Create Image With KIE",
      description: "Create or edit an image with KIE. Returns a normalized task record and direct media links.",
      inputSchema: {
        prompt: z.string().min(1).max(20000),
        aspectRatio: z.enum(["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "16:9", "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21"]).default("1:1"),
        resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
        inputUrls: z.array(z.string().url()).min(1).max(16).optional(),
        model: GptImage2ModelSchema.optional(),
        callBackUrl: z.string().url().optional(),
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
        additionalInput: JsonRecordSchema.default({})
      },
      outputSchema: GenerationResultSchema
    },
    async (
      { prompt, aspectRatio, resolution, inputUrls, model, callBackUrl, waitForResult, intervalMs, timeoutMs, additionalInput },
      extra
    ) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        await report({ progress: 0, total: 100, message: "Submitting image generation" });
        const selectedModel = model ?? (inputUrls?.length ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image");
        const input = {
          prompt,
          ...(inputUrls?.length ? { input_urls: inputUrls } : {}),
          aspect_ratio: aspectRatio,
          resolution,
          ...additionalInput
        };
        validateGptImage2Combination(selectedModel, input);
        const result = await createAndMaybeWaitForMarketTask({
          client,
          config,
          kind: "image",
          model: selectedModel,
          input,
          callBackUrl,
          waitForResult,
          intervalMs,
          timeoutMs,
          marketModels,
          onProgress: (update) => reportMarketTaskProgress(report, update, "Image"),
          signal: extra.signal
        });
        if (!waitForResult || result.status !== "waited") {
          await report({ progress: 100, total: 100, message: waitForResult ? "Image wait stopped; task ID preserved" : "Image task submitted" });
        }
        return [generationFromFriendlyResult({ result, prompt })];
      })
  );

  server.registerTool(
    "kie_create_video",
    {
      title: "Create Video With KIE",
      description: "Create one Seedance video. Use Mini at 480p for a low-cost smoke test.",
      inputSchema: {
        ...VideoInputSchema.shape,
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      },
      outputSchema: GenerationResultSchema
    },
    async ({ waitForResult, intervalMs, timeoutMs, ...job }, extra) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        await report({ progress: 0, total: 100, message: "Submitting video generation" });
        const input = seedanceInput(job);
        validateSeedanceCombination(job.model, input);
        const result = await createAndMaybeWaitForMarketTask({
          client,
          config,
          kind: "video",
          model: job.model,
          input,
          callBackUrl: job.callBackUrl,
          waitForResult,
          intervalMs,
          timeoutMs,
          marketModels,
          onProgress: (update) => reportMarketTaskProgress(report, update, "Video"),
          signal: extra.signal
        });
        if (!waitForResult || result.status !== "waited") {
          await report({ progress: 100, total: 100, message: waitForResult ? "Video wait stopped; task ID preserved" : "Video task submitted" });
        }
        return [generationFromFriendlyResult({ result, prompt: job.prompt })];
      })
  );

  server.registerTool(
    "kie_create_videos",
    {
      title: "Create KIE Videos In Parallel",
      description: "Submit 1-16 independent Seedance jobs in parallel. Every accepted task ID is preserved.",
      inputSchema: {
        jobs: z.array(VideoBatchJobSchema).min(1).max(16),
        waitForResult: z.boolean().default(false),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      },
      outputSchema: GenerationResultSchema,
      annotations: { title: "Create KIE Videos In Parallel", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async ({ jobs, waitForResult, intervalMs, timeoutMs }, extra) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        const track = createBatchProgressTracker({ count: jobs.length, report });
        await report({ progress: 0, total: 100, message: `Submitting ${jobs.length} video jobs in parallel` });
        const prepared = jobs.map((job) => {
          const input = seedanceInput(job);
          validateSeedanceCombination(job.model, input);
          return { job, input };
        });
        const settled = await Promise.allSettled(
          prepared.map(({ job, input }, index) =>
            createAndMaybeWaitForMarketTask({
              client,
              config,
              kind: "video",
              model: job.model,
              input,
              callBackUrl: job.callBackUrl,
              waitForResult,
              intervalMs,
              timeoutMs,
              marketModels,
              onProgress: (update) => track(index, update),
              signal: extra.signal
            })
          )
        );
        const generations = settled.map((result, index) => {
          const job = prepared[index].job;
          return result.status === "fulfilled"
            ? generationFromFriendlyResult({ result: result.value, prompt: job.prompt, label: job.label })
            : failedGeneration({ taskId: "unavailable", error: result.reason, label: job.label, kind: "video", prompt: job.prompt });
        });
        await report({ progress: 100, total: 100, message: waitForResult ? "Video waits finished" : "Video jobs submitted" });
        return generations;
      })
  );

  server.registerTool(
    "kie_create_speech",
    {
      title: "Create Speech With KIE",
      description: "Create a voiceover or narration with ElevenLabs Turbo 2.5 through KIE.",
      inputSchema: {
        text: z.string().min(1).max(5000),
        voice: z.string().default("EkK5I93UQWFDigLMpZcX"),
        model: z.literal("elevenlabs/text-to-speech-turbo-2-5").default("elevenlabs/text-to-speech-turbo-2-5"),
        languageCode: z.string().regex(/^[a-z]{2}$/).optional(),
        speed: z.number().min(0.7).max(1.2).default(1),
        callBackUrl: z.string().url().optional(),
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
        additionalInput: JsonRecordSchema.default({})
      },
      outputSchema: GenerationResultSchema
    },
    async ({ text, voice, model, languageCode, speed, callBackUrl, waitForResult, intervalMs, timeoutMs, additionalInput }, extra) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        await report({ progress: 0, total: 100, message: "Submitting speech generation" });
        const input = { text, voice, speed, ...(languageCode ? { language_code: languageCode } : {}), ...additionalInput };
        const result = await createAndMaybeWaitForMarketTask({
          client,
          config,
          kind: "speech",
          model,
          input,
          callBackUrl,
          waitForResult,
          intervalMs,
          timeoutMs,
          marketModels,
          onProgress: (update) => reportMarketTaskProgress(report, update, "Speech"),
          signal: extra.signal
        });
        if (!waitForResult || result.status !== "waited") {
          await report({ progress: 100, total: 100, message: waitForResult ? "Speech wait stopped; task ID preserved" : "Speech task submitted" });
        }
        return [generationFromFriendlyResult({ result, prompt: text })];
      })
  );

  server.registerTool(
    "kie_get_creation",
    {
      title: "Get KIE Creation",
      description: "Check or wait for one KIE task. Returns the same normalized result shape as all friendly create tools.",
      inputSchema: {
        taskId: z.string().min(1),
        kind: GenerationKindSchema.optional(),
        label: z.string().min(1).max(120).optional(),
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      },
      outputSchema: GenerationResultSchema,
      annotations: { title: "Get KIE Creation", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ taskId, kind, label, waitForResult, intervalMs, timeoutMs }, extra) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        await report({ progress: 0, total: 100, message: `Checking task ${taskId}` });
        const payload = waitForResult
          ? await waitForMarketTask({
              client,
              taskId,
              intervalMs: intervalMs ?? config.pollIntervalMs,
              timeoutMs: timeoutMs ?? config.pollTimeoutMs,
              onProgress: (update) => reportMarketTaskProgress(report, update, "Creation"),
              signal: extra.signal
            })
          : await getMarketTask(client, taskId, extra.signal);
        if (!waitForResult) await report({ progress: 100, total: 100, message: "Creation check finished" });
        return [generationFromTask({ taskId, payload, kind: kind as GenerationKind | undefined, label })];
      })
  );

  server.registerTool(
    "kie_get_creations",
    {
      title: "Get KIE Creations",
      description: "Check or wait for 1-32 KIE task IDs in parallel. Partial failures do not hide successful results.",
      inputSchema: {
        taskIds: z.array(z.string().min(1)).min(1).max(32),
        labels: z.array(z.string().min(1).max(120)).max(32).optional(),
        kinds: z.array(GenerationKindSchema).max(32).optional(),
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      },
      outputSchema: GenerationResultSchema,
      annotations: { title: "Get KIE Creations", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ taskIds, labels, kinds, waitForResult, intervalMs, timeoutMs }, extra) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        const track = createBatchProgressTracker({ count: taskIds.length, report });
        await report({ progress: 0, total: 100, message: `Checking ${taskIds.length} creations in parallel` });
        const settled = await Promise.allSettled(
          taskIds.map((taskId, index) =>
            waitForResult
              ? waitForMarketTask({
                  client,
                  taskId,
                  intervalMs: intervalMs ?? config.pollIntervalMs,
                  timeoutMs: timeoutMs ?? config.pollTimeoutMs,
                  onProgress: (update) => track(index, update),
                  signal: extra.signal
                })
              : getMarketTask(client, taskId, extra.signal)
          )
        );
        const generations = settled.map((result, index) =>
          result.status === "fulfilled"
            ? generationFromTask({ taskId: taskIds[index], payload: result.value, label: labels?.[index], kind: kinds?.[index] as GenerationKind | undefined })
            : failedGeneration({ taskId: taskIds[index], error: result.reason, label: labels?.[index], kind: kinds?.[index] as GenerationKind | undefined })
        );
        await report({ progress: 100, total: 100, message: "Creation checks finished" });
        return generations;
      })
  );
}
