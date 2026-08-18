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
import { pollPlanFromConfig } from "./config.js";
import type { KieHttpClient } from "./http.js";
import { createAndMaybeWaitForMarketTask } from "./market.js";
import { createBatchProgressTracker, createProgressReporter } from "./progress.js";
import type { TaskStore } from "./task-store.js";
import { getMarketTaskCached, waitForMarketTask, type MarketTaskProgress } from "./task.js";
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
  prompt: z
    .string()
    .min(3)
    .max(30000)
    .describe(
      "Plain-language description of the video, shot, motion, style, and subject. The per-model limit is enforced against the official catalog."
    ),
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
type VideoJob = z.infer<typeof VideoBatchJobSchema>;
type VideoInput = z.infer<typeof VideoInputSchema>;

const ImageInputSchema = z.object({
  prompt: z.string().min(1).max(20000),
  aspectRatio: z
    .enum(["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "16:9", "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21"])
    .default("1:1"),
  resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
  inputUrls: z.array(z.string().url()).min(1).max(16).optional(),
  model: GptImage2ModelSchema.optional(),
  callBackUrl: z.string().url().optional(),
  additionalInput: JsonRecordSchema.default({})
});
const ImageBatchJobSchema = ImageInputSchema.extend({
  label: z.string().min(1).max(120).optional()
});
type ImageJob = z.infer<typeof ImageBatchJobSchema>;
type ImageInput = z.infer<typeof ImageInputSchema>;

const SpeechInputSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default("EkK5I93UQWFDigLMpZcX"),
  model: z.literal("elevenlabs/text-to-speech-turbo-2-5").default("elevenlabs/text-to-speech-turbo-2-5"),
  languageCode: z.string().regex(/^[a-z]{2}$/).optional(),
  speed: z.number().min(0.7).max(1.2).default(1),
  callBackUrl: z.string().url().optional(),
  additionalInput: JsonRecordSchema.default({})
});
const SpeechBatchJobSchema = SpeechInputSchema.extend({
  label: z.string().min(1).max(120).optional()
});
type SpeechJob = z.infer<typeof SpeechBatchJobSchema>;
type SpeechInput = z.infer<typeof SpeechInputSchema>;

const WaitControlSchema = {
  intervalMs: z.number().int().positive().max(60000).optional(),
  timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
};

function imageModelFor(job: ImageInput): string {
  return job.model ?? (job.inputUrls?.length ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image");
}

function imageInput(job: ImageInput): Record<string, unknown> {
  return {
    prompt: job.prompt,
    ...(job.inputUrls?.length ? { input_urls: job.inputUrls } : {}),
    aspect_ratio: job.aspectRatio,
    resolution: job.resolution,
    ...job.additionalInput
  };
}

function speechInput(job: SpeechInput): Record<string, unknown> {
  return {
    text: job.text,
    voice: job.voice,
    speed: job.speed,
    ...(job.languageCode ? { language_code: job.languageCode } : {}),
    ...job.additionalInput
  };
}

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

  // Only cross-field rules live here. Per-field limits (resolution and output_format enums,
  // prompt length, reference-array sizes, fields a model does not accept) are validated against
  // the official catalog by validateMarketInput, so they stay correct across catalog refreshes
  // instead of drifting out of sync with hardcoded copies.
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

  // Duration bounds are documented in prose rather than in the model schema, so they have no
  // catalog counterpart and must be checked here.
  const duration = Number(input.duration);
  if (model === "bytedance/seedance-2-5") {
    if (duration !== -1 && (duration < 4 || duration > 30)) {
      throw new Error("Seedance 2.5 duration must be -1 or between 4 and 30 seconds.");
    }
    return;
  }
  if (duration === -1 || duration > 15) {
    throw new Error(`${label} duration must be between 4 and 15 seconds.`);
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
  const deduplicated = args.result.deduplicated === true ? { deduplicated: true } : {};
  if (args.result.result && taskId !== "unavailable") {
    return {
      ...generationFromTask({ taskId, payload: args.result.result, kind, prompt: args.prompt, label: args.label }),
      ...deduplicated
    };
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
    ...deduplicated,
    ...(error ? { error } : {})
  };
}

type BatchPlan<T> = {
  jobs: T[];
  kind: "image" | "video" | "speech";
  label: (job: T) => string | undefined;
  prompt: (job: T) => string;
  model: (job: T) => string;
  buildInput: (job: T) => Record<string, unknown>;
  callBackUrl: (job: T) => string | undefined;
};

type PreparedJob<T> = {
  job: T;
  input?: Record<string, unknown>;
  error?: unknown;
};

/**
 * Validate every job first, then fan out the accepted ones together. A job that fails validation
 * is reported on its own row instead of aborting the batch, so one bad prompt never wastes the
 * round trip for the other fifteen.
 */
function prepareBatch<T>(
  plan: BatchPlan<T>,
  validate?: (model: string, input: Record<string, unknown>) => void
): PreparedJob<T>[] {
  return plan.jobs.map((job) => {
    try {
      const input = plan.buildInput(job);
      validate?.(plan.model(job), input);
      return { job, input };
    } catch (error) {
      return { job, error };
    }
  });
}

const BatchControlSchema = {
  waitForResult: z
    .boolean()
    .default(true)
    .describe("Wait for the finished media. Set false to return task IDs immediately and collect them later with kie_get_creation."),
  idempotencyKey: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Stable key identifying this submission. Reuse the same key when retrying an automated step: the original task is returned instead of paying for a second generation."
    ),
  intervalMs: z.number().int().positive().max(60000).optional(),
  timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
};

export function registerFriendlyTools(args: {
  server: McpServer;
  client: KieHttpClient;
  config: KieConfig;
  marketModels: MarketModelRecord[];
  store: TaskStore;
}): void {
  const { server, client, config, marketModels, store } = args;

  /** Fan a prepared batch out in parallel; the HTTP client caps real concurrency. */
  const runBatch = async <T>(bits: {
    plan: BatchPlan<T>;
    prepared: PreparedJob<T>[];
    waitForResult: boolean;
    idempotencyKey?: string;
    intervalMs?: number;
    timeoutMs?: number;
    track: (index: number, update: MarketTaskProgress) => Promise<void>;
    signal?: AbortSignal;
  }): Promise<GenerationView[]> => {
    const { plan, prepared } = bits;
    const settled = await Promise.allSettled(
      prepared.map(({ job, input, error }, index) =>
        input === undefined
          ? Promise.reject(error)
          : createAndMaybeWaitForMarketTask({
              client,
              config,
              kind: plan.kind,
              model: plan.model(job),
              input,
              callBackUrl: plan.callBackUrl(job),
              waitForResult: bits.waitForResult,
              intervalMs: bits.intervalMs,
              timeoutMs: bits.timeoutMs,
              marketModels,
              store,
              // Each job in a batch is a distinct intentional submission, so the caller's key is
              // scoped per position. Two identical prompts in one call still produce two tasks.
              ...(bits.idempotencyKey ? { idempotencyKey: `${bits.idempotencyKey}#${index}` } : {}),
              onProgress: (update) => bits.track(index, update),
              signal: bits.signal
            })
      )
    );

    return settled.map((result, index) => {
      const job = prepared[index].job;
      return result.status === "fulfilled"
        ? generationFromFriendlyResult({ result: result.value, prompt: plan.prompt(job), label: plan.label(job) })
        : failedGeneration({
            taskId: "unavailable",
            error: result.reason,
            label: plan.label(job),
            kind: plan.kind === "speech" ? "audio" : plan.kind,
            prompt: plan.prompt(job)
          });
    });
  };

  /** Register one create tool. Every create tool is batch-shaped so parallel work is the default. */
  const registerCreateTool = <T extends { label?: string }>(bits: {
    name: string;
    title: string;
    description: string;
    jobSchema: z.ZodTypeAny;
    maxJobs: number;
    waitByDefault: boolean;
    plan: (jobs: T[]) => BatchPlan<T>;
    validate?: (model: string, input: Record<string, unknown>) => void;
    progressLabel: string;
  }): void => {
    server.registerTool(
      bits.name,
      {
        title: bits.title,
        description: bits.description,
        inputSchema: {
          jobs: z
            .array(bits.jobSchema)
            .min(1)
            .max(bits.maxJobs)
            .describe(
              `One entry per asset, ${1}-${bits.maxJobs} per call. All entries are submitted in parallel in a single call; never call this tool repeatedly for independent assets.`
            ),
          ...BatchControlSchema,
          waitForResult: BatchControlSchema.waitForResult.default(bits.waitByDefault)
        },
        outputSchema: GenerationResultSchema,
        annotations: {
          title: bits.title,
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true
        }
      },
      async ({ jobs, waitForResult, idempotencyKey, intervalMs, timeoutMs }, extra) =>
        safeGenerationTool(async () => {
          const report = createProgressReporter(extra);
          const track = createBatchProgressTracker({ count: jobs.length, report, label: bits.progressLabel });
          await report({
            progress: 0,
            total: 100,
            message: `Submitting ${jobs.length} ${bits.progressLabel} job${jobs.length === 1 ? "" : "s"}`
          });
          const plan = bits.plan(jobs as T[]);
          const generations = await runBatch({
            plan,
            prepared: prepareBatch(plan, bits.validate),
            waitForResult,
            idempotencyKey,
            intervalMs,
            timeoutMs,
            track,
            signal: extra.signal
          });
          await report({
            progress: 100,
            total: 100,
            message: waitForResult ? `${bits.title} finished` : `${bits.title} submitted`
          });
          return generations;
        })
    );
  };

  registerCreateTool<ImageJob>({
    name: "kie_create_image",
    title: "Create KIE Images",
    description:
      "Create or edit images. Put one entry in `jobs` per image you want; they are generated in parallel. Returns task IDs and direct image URLs.",
    jobSchema: ImageBatchJobSchema,
    maxJobs: 16,
    waitByDefault: true,
    progressLabel: "image",
    validate: validateGptImage2Combination,
    plan: (jobs) => ({
      jobs,
      kind: "image",
      label: (job) => job.label,
      prompt: (job) => job.prompt,
      model: (job) => imageModelFor(job),
      buildInput: (job) => imageInput(job),
      callBackUrl: (job) => job.callBackUrl
    })
  });

  registerCreateTool<VideoJob>({
    name: "kie_create_video",
    title: "Create KIE Videos",
    description:
      "Create Seedance videos. Put one entry in `jobs` per shot; they are submitted in parallel. Videos take minutes, so this defaults to returning task IDs immediately — collect the finished media with kie_get_creation. For a cheap smoke test use model bytedance/seedance-2-mini at 480p, 4 seconds, generateAudio false.",
    jobSchema: VideoBatchJobSchema,
    maxJobs: 16,
    waitByDefault: false,
    progressLabel: "video",
    validate: validateSeedanceCombination,
    plan: (jobs) => ({
      jobs,
      kind: "video",
      label: (job) => job.label,
      prompt: (job) => job.prompt,
      model: (job) => job.model,
      buildInput: (job) => seedanceInput(job),
      callBackUrl: (job) => job.callBackUrl
    })
  });

  registerCreateTool<SpeechJob>({
    name: "kie_create_speech",
    title: "Create KIE Speech",
    description:
      "Create voiceover or narration with ElevenLabs Turbo 2.5. Put one entry in `jobs` per line of a script; they are generated in parallel. Returns task IDs and direct audio URLs.",
    jobSchema: SpeechBatchJobSchema,
    maxJobs: 16,
    waitByDefault: true,
    progressLabel: "speech",
    plan: (jobs) => ({
      jobs,
      kind: "speech",
      label: (job) => job.label,
      prompt: (job) => job.text,
      model: (job) => job.model,
      buildInput: (job) => speechInput(job),
      callBackUrl: (job) => job.callBackUrl
    })
  });

  server.registerTool(
    "kie_get_creation",
    {
      title: "Get KIE Creations",
      description:
        "Check or wait for submitted KIE tasks and return their finished media URLs. Pass every task ID you are waiting on in one call; they are polled in parallel and a failure on one never hides the others. Finished tasks are served from memory, so re-checking is free.",
      inputSchema: {
        taskIds: z
          .array(z.string().min(1))
          .min(1)
          .max(32)
          .describe("Task IDs returned by a create tool. Pass all of them in one call rather than one call each."),
        labels: z.array(z.string().min(1).max(120)).max(32).optional().describe("Optional names, positionally matched to taskIds."),
        kinds: z.array(GenerationKindSchema).max(32).optional().describe("Optional media kinds, positionally matched to taskIds."),
        waitForResult: z
          .boolean()
          .default(true)
          .describe("Wait until every task reaches a terminal status. Set false for a single immediate status snapshot."),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      },
      outputSchema: GenerationResultSchema,
      annotations: { title: "Get KIE Creations", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ taskIds, labels, kinds, waitForResult, intervalMs, timeoutMs }, extra) =>
      safeGenerationTool(async () => {
        const report = createProgressReporter(extra);
        const track = createBatchProgressTracker({ count: taskIds.length, report, label: "Creation" });
        await report({
          progress: 0,
          total: 100,
          message: `Checking ${taskIds.length} creation${taskIds.length === 1 ? "" : "s"}`
        });
        const plan = pollPlanFromConfig(config, intervalMs);
        const settled = await Promise.allSettled(
          taskIds.map((taskId, index) =>
            waitForResult
              ? waitForMarketTask({
                  client,
                  taskId,
                  intervalMs: plan.intervalMs,
                  timeoutMs: timeoutMs ?? config.pollTimeoutMs,
                  plan,
                  store,
                  onProgress: (update) => track(index, update),
                  signal: extra.signal
                })
              : getMarketTaskCached({ client, taskId, store, signal: extra.signal, timeoutMs: plan.requestTimeoutMs })
          )
        );
        const generations = settled.map((result, index) =>
          result.status === "fulfilled"
            ? generationFromTask({
                taskId: taskIds[index],
                payload: result.value,
                label: labels?.[index],
                kind: kinds?.[index] as GenerationKind | undefined
              })
            : failedGeneration({
                taskId: taskIds[index],
                error: result.reason,
                label: labels?.[index],
                kind: kinds?.[index] as GenerationKind | undefined
              })
        );
        await report({ progress: 100, total: 100, message: "Creation checks finished" });
        return generations;
      })
  );
}
