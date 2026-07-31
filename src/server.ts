import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig, requireApiKey } from "./config.js";
import { normalizeError } from "./errors.js";
import { KieHttpClient } from "./http.js";
import {
  findProductOperation,
  getProductOperationSchema,
  productOperations,
  validateProductOperationInput
} from "./products.js";
import { findMarketModel, loadCatalogRegistry, summarizeMarketModel, validateMarketInput } from "./registry.js";
import { getMarketTask, waitForMarketTask } from "./task.js";
import type { KieConfig, MarketModelRecord } from "./types.js";
import { verifyWebhookSignature } from "./webhook.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const JsonRecordSchema = z.record(z.string(), z.unknown());
const GptImage2ModelSchema = z.enum([
  "gpt-image-2-text-to-image",
  "gpt-image-2-image-to-image"
]);
const UploadPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    "Use a relative upload path without empty, current-directory, or parent-directory segments."
  );

function jsonResult(value: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function errorResult(error: unknown): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(normalizeError(error), null, 2)
      }
    ]
  };
}

async function safeTool(handler: () => Promise<unknown> | unknown): Promise<ToolResult> {
  try {
    return jsonResult(await handler());
  } catch (error) {
    return errorResult(error);
  }
}

function dataPathCandidates(fileName: string, docsDataDir?: string): string[] {
  if (docsDataDir) {
    return [join(docsDataDir, fileName)];
  }
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(here, "data", fileName),
    join(here, "../../src/data", fileName),
    join(process.cwd(), "src/data", fileName)
  ];
}

async function readDataFile(fileName: string, docsDataDir?: string): Promise<string> {
  const candidates = dataPathCandidates(fileName, docsDataDir);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Unable to read data file ${fileName}`);
}

function addDocsResource(
  server: McpServer,
  name: string,
  uri: string,
  title: string,
  fileName: string,
  mimeType: string,
  docsDataDir?: string
): void {
  server.registerResource(
    name,
    uri,
    {
      title,
      mimeType,
      description: `Bundled KIE.AI documentation artifact: ${title}`
    },
    async (resourceUri) => ({
      contents: [
        {
          uri: resourceUri.href,
          mimeType,
          text: await readDataFile(fileName, docsDataDir)
        }
      ]
    })
  );
}

function makeClient(config: KieConfig, fetchImpl?: typeof fetch): KieHttpClient {
  return new KieHttpClient(config, fetchImpl);
}

function extractTaskId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const envelope = payload as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object" ? (envelope.data as Record<string, unknown>) : undefined;
  const directCandidates = [envelope.taskId, envelope.task_id, data?.taskId, data?.task_id, data?.id];
  const taskId = directCandidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
  return typeof taskId === "string" ? taskId : undefined;
}

async function createMarketTask(args: {
  client: KieHttpClient;
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
  validateKnownModel?: boolean;
  marketModels: MarketModelRecord[];
}): Promise<unknown> {
  if (args.validateKnownModel ?? true) {
    validateMarketInput(args.model, args.input, args.marketModels);
  }

  return args.client.requestJson({
    method: "POST",
    path: "/api/v1/jobs/createTask",
    body: {
      model: args.model,
      ...(args.callBackUrl ? { callBackUrl: args.callBackUrl } : {}),
      input: args.input
    }
  });
}

async function createAndMaybeWaitForMarketTask(args: {
  client: KieHttpClient;
  config: KieConfig;
  kind: "image" | "video" | "speech";
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
  waitForResult: boolean;
  intervalMs?: number;
  timeoutMs?: number;
  marketModels: MarketModelRecord[];
}): Promise<Record<string, unknown>> {
  const createTask = await createMarketTask({
    client: args.client,
    model: args.model,
    input: args.input,
    callBackUrl: args.callBackUrl,
    marketModels: args.marketModels
  });
  const taskId = extractTaskId(createTask);
  const base = {
    kind: args.kind,
    model: args.model,
    input: args.input,
    taskId,
    createTask
  };

  if (!args.waitForResult) {
    return {
      ...base,
      status: "submitted",
      nextStep: taskId ? "Call kie_get_creation or kie_market_wait_for_task with this taskId to retrieve the result." : undefined
    };
  }

  if (!taskId) {
    return {
      ...base,
      status: "submitted_without_task_id",
      warning: "KIE accepted the task request, but this server could not find a taskId in the response."
    };
  }

  return {
    ...base,
    status: "waited",
    result: await waitForMarketTask({
      client: args.client,
      taskId,
      intervalMs: args.intervalMs ?? args.config.pollIntervalMs,
      timeoutMs: args.timeoutMs ?? args.config.pollTimeoutMs
    })
  };
}

function validateGptImage2Combination(model: string, input: Record<string, unknown>): void {
  const inputUrls = Array.isArray(input.input_urls) ? input.input_urls : [];
  if (model === "gpt-image-2-text-to-image" && inputUrls.length > 0) {
    throw new Error("gpt-image-2-text-to-image does not accept inputUrls; use gpt-image-2-image-to-image.");
  }
  if (model === "gpt-image-2-image-to-image" && inputUrls.length === 0) {
    throw new Error("gpt-image-2-image-to-image requires at least one inputUrls entry.");
  }

  const aspectRatio = input.aspect_ratio;
  const resolution = input.resolution;
  if (resolution === "4K" && aspectRatio === "1:1") {
    throw new Error("GPT Image 2 does not support 4K output at a 1:1 aspect ratio.");
  }
  if (resolution !== "1K" && aspectRatio === "auto") {
    throw new Error('GPT Image 2 only supports resolution "1K" when aspectRatio is "auto".');
  }
  if (
    model === "gpt-image-2-text-to-image" &&
    resolution !== "1K" &&
    ["5:4", "4:5", "3:1", "1:3", "9:21"].includes(String(aspectRatio))
  ) {
    throw new Error(`GPT Image 2 text-to-image does not support ${String(aspectRatio)} at ${String(resolution)}.`);
  }
  if (
    model === "gpt-image-2-image-to-image" &&
    resolution !== "1K" &&
    ["5:4", "4:5"].includes(String(aspectRatio))
  ) {
    throw new Error(`GPT Image 2 image-to-image only supports ${String(aspectRatio)} at 1K.`);
  }
}

function validateSeedance2Combination(input: Record<string, unknown>): void {
  const hasFrames = Boolean(input.first_frame_url || input.last_frame_url);
  const hasReferences = ["reference_image_urls", "reference_video_urls", "reference_audio_urls"].some(
    (field) => Array.isArray(input[field]) && input[field].length > 0
  );
  if (input.last_frame_url && !input.first_frame_url) {
    throw new Error("Seedance 2 lastFrameUrl requires firstFrameUrl.");
  }
  if (hasFrames && hasReferences) {
    throw new Error(
      "Seedance 2 frame-based and multimodal-reference modes are mutually exclusive; use first/last frames or reference media, not both."
    );
  }
}

export function createKieMcpServer(config: KieConfig = loadConfig(), fetchImpl?: typeof fetch): McpServer {
  const client = makeClient(config, fetchImpl);
  const catalogs = loadCatalogRegistry(config.docsDataDir);
  const { docsManifest, endpointMentionIndex, marketModels, openapiEndpointCatalog } = catalogs;
  const server = new McpServer({
    name: "kie-ai-mcp-server",
    version: "0.2.1"
  });

  addDocsResource(
    server,
    "kie-docs-manifest",
    "kie://docs/manifest",
    "KIE.AI Documentation Snapshot Manifest",
    "docs_manifest.json",
    "application/json",
    config.docsDataDir
  );
  addDocsResource(
    server,
    "kie-docs-analysis",
    "kie://docs/analysis",
    "KIE.AI Documentation Snapshot",
    "ANALYSIS.md",
    "text/markdown",
    config.docsDataDir
  );
  addDocsResource(
    server,
    "kie-openapi-catalog",
    "kie://docs/openapi-catalog",
    "KIE.AI OpenAPI Catalog",
    "openapi_endpoint_catalog.json",
    "application/json",
    config.docsDataDir
  );
  addDocsResource(
    server,
    "kie-market-model-registry",
    "kie://docs/market-model-registry",
    "KIE.AI Market Model Registry",
    "market_model_registry.json",
    "application/json",
    config.docsDataDir
  );
  addDocsResource(
    server,
    "kie-endpoint-index",
    "kie://docs/endpoint-index",
    "KIE.AI Endpoint Index",
    "endpoint_index.json",
    "application/json",
    config.docsDataDir
  );

  server.registerTool(
    "kie_create_image",
    {
      title: "Create Image With KIE",
      description:
        "Friendly image-generation tool for chat agents. Use this when the user asks to create, generate, render, or edit an image with KIE. Defaults to GPT Image 2 and can wait for the finished image result.",
      inputSchema: {
        prompt: z.string().min(1).max(20000).describe("Plain-language description of the image to create or edit."),
        aspectRatio: z
          .enum(["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "16:9", "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21"])
          .default("1:1"),
        resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
        inputUrls: z
          .array(z.string().url())
          .min(1)
          .max(16)
          .optional()
          .describe("Optional source image URLs for GPT Image 2 image-to-image workflows."),
        model: GptImage2ModelSchema.optional().describe(
          "Optional GPT Image 2 mode. For other KIE models, use kie_market_create_task with that model's official schema."
        ),
        callBackUrl: z.string().url().optional(),
        waitForResult: z.boolean().default(true).describe("When true, poll until KIE returns the final image result or timeout."),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
        additionalInput: JsonRecordSchema.default({}).describe("Advanced KIE model input overrides.")
      }
    },
    async ({ prompt, aspectRatio, resolution, inputUrls, model, callBackUrl, waitForResult, intervalMs, timeoutMs, additionalInput }) =>
      safeTool(() => {
        const selectedModel = model ?? (inputUrls && inputUrls.length > 0 ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image");
        const input = {
          prompt,
          ...(inputUrls && inputUrls.length > 0 ? { input_urls: inputUrls } : {}),
          aspect_ratio: aspectRatio,
          resolution,
          ...additionalInput
        };
        validateGptImage2Combination(selectedModel, input);

        return createAndMaybeWaitForMarketTask({
          client,
          config,
          kind: "image",
          model: selectedModel,
          input,
          callBackUrl,
          waitForResult,
          intervalMs,
          timeoutMs,
          marketModels
        });
      })
  );

  server.registerTool(
    "kie_create_video",
    {
      title: "Create Video With KIE",
      description:
        "Friendly video-generation tool for chat agents. Use this when the user asks to create, generate, render, animate, or turn an image into a video with KIE. Defaults to Seedance 2.0 and can wait for the finished video result.",
      inputSchema: {
        prompt: z.string().min(3).max(20000).describe("Plain-language description of the video, shot, motion, style, and subject."),
        aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "adaptive"]).default("16:9"),
        resolution: z.enum(["480p", "720p", "1080p", "4k"]).default("720p"),
        duration: z.number().int().min(4).max(15).default(5),
        generateAudio: z.boolean().default(true),
        firstFrameUrl: z.string().url().optional(),
        lastFrameUrl: z.string().url().optional(),
        referenceImageUrls: z.array(z.string().url()).min(1).max(9).optional(),
        referenceVideoUrls: z.array(z.string().url()).min(1).max(3).optional(),
        referenceAudioUrls: z.array(z.string().url()).min(1).max(3).optional(),
        model: z
          .literal("bytedance/seedance-2")
          .default("bytedance/seedance-2")
          .describe("This friendly tool uses Seedance 2. For other models, use kie_market_create_task."),
        callBackUrl: z.string().url().optional(),
        waitForResult: z.boolean().default(true).describe("When true, poll until KIE returns the final video result or timeout."),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
        additionalInput: JsonRecordSchema.default({}).describe("Advanced KIE model input overrides.")
      }
    },
    async ({
      prompt,
      aspectRatio,
      resolution,
      duration,
      generateAudio,
      firstFrameUrl,
      lastFrameUrl,
      referenceImageUrls,
      referenceVideoUrls,
      referenceAudioUrls,
      model,
      callBackUrl,
      waitForResult,
      intervalMs,
      timeoutMs,
      additionalInput
    }) =>
      safeTool(() => {
        const input = {
          prompt,
          aspect_ratio: aspectRatio,
          resolution,
          duration,
          generate_audio: generateAudio,
          ...(firstFrameUrl ? { first_frame_url: firstFrameUrl } : {}),
          ...(lastFrameUrl ? { last_frame_url: lastFrameUrl } : {}),
          ...(referenceImageUrls && referenceImageUrls.length > 0 ? { reference_image_urls: referenceImageUrls } : {}),
          ...(referenceVideoUrls && referenceVideoUrls.length > 0 ? { reference_video_urls: referenceVideoUrls } : {}),
          ...(referenceAudioUrls && referenceAudioUrls.length > 0 ? { reference_audio_urls: referenceAudioUrls } : {}),
          ...additionalInput
        };
        validateSeedance2Combination(input);

        return createAndMaybeWaitForMarketTask({
          client,
          config,
          kind: "video",
          model,
          input,
          callBackUrl,
          waitForResult,
          intervalMs,
          timeoutMs,
          marketModels
        });
      })
  );

  server.registerTool(
    "kie_create_speech",
    {
      title: "Create Speech With KIE",
      description:
        "Friendly text-to-speech tool for chat agents. Use this when the user asks to create narration, voiceover, spoken audio, or speech with KIE.",
      inputSchema: {
        text: z.string().min(1).max(5000).describe("Text to turn into speech."),
        voice: z.string().default("EkK5I93UQWFDigLMpZcX").describe("Official KIE/ElevenLabs voice ID."),
        model: z
          .literal("elevenlabs/text-to-speech-turbo-2-5")
          .default("elevenlabs/text-to-speech-turbo-2-5")
          .describe("This friendly tool uses ElevenLabs Turbo 2.5. For other models, use kie_market_create_task."),
        languageCode: z
          .string()
          .regex(/^[a-z]{2}$/)
          .optional()
          .describe("Optional lowercase ISO 639-1 language code supported by Turbo 2.5, such as en or es."),
        speed: z.number().min(0.7).max(1.2).default(1),
        callBackUrl: z.string().url().optional(),
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
        additionalInput: JsonRecordSchema.default({})
      }
    },
    async ({ text, voice, model, languageCode, speed, callBackUrl, waitForResult, intervalMs, timeoutMs, additionalInput }) =>
      safeTool(() => {
        const input = {
          text,
          voice,
          speed,
          ...(languageCode ? { language_code: languageCode } : {}),
          ...additionalInput
        };

        return createAndMaybeWaitForMarketTask({
          client,
          config,
          kind: "speech",
          model,
          input,
          callBackUrl,
          waitForResult,
          intervalMs,
          timeoutMs,
          marketModels
        });
      })
  );

  server.registerTool(
    "kie_get_creation",
    {
      title: "Get KIE Creation",
      description:
        "Check or wait for a KIE creation task from kie_create_image, kie_create_video, kie_create_speech, or any Market createTask call.",
      inputSchema: {
        taskId: z.string().min(1),
        waitForResult: z.boolean().default(true),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      }
    },
    async ({ taskId, waitForResult, intervalMs, timeoutMs }) =>
      safeTool(() =>
        waitForResult
          ? waitForMarketTask({
              client,
              taskId,
              intervalMs: intervalMs ?? config.pollIntervalMs,
              timeoutMs: timeoutMs ?? config.pollTimeoutMs
            })
          : getMarketTask(client, taskId)
      )
  );

  server.registerTool(
    "kie_get_credits",
    {
      title: "Get KIE Credits",
      description: "Return the current KIE.AI credit balance for the configured API key."
    },
    async () =>
      safeTool(() =>
        client.requestJson({
          method: "GET",
          path: "/api/v1/chat/credit"
        })
      )
  );

  server.registerTool(
    "kie_get_download_url",
    {
      title: "Get KIE Download URL",
      description: "Convert a KIE-generated file URL into a temporary direct download URL.",
      inputSchema: {
        url: z.string().url().describe("A KIE-generated media/file URL.")
      }
    },
    async ({ url }) =>
      safeTool(() =>
        client.requestJson({
          method: "POST",
          path: "/api/v1/common/download-url",
          body: { url }
        })
      )
  );

  server.registerTool(
    "kie_upload_media",
    {
      title: "Upload Media With KIE",
      description:
        "Upload one local file, public URL, or base64 payload through KIE's native temporary File Upload API. No third-party storage service is used.",
      inputSchema: {
        sourceType: z.enum(["local_file", "url", "base64"]),
        source: z.string().min(1).describe("Absolute local path, public HTTP(S) URL, raw base64, or a base64 data URL."),
        uploadPath: UploadPathSchema.default("agent-uploads"),
        fileName: z.string().min(1).optional()
      }
    },
    async ({ sourceType, source, uploadPath, fileName }) =>
      safeTool(() => {
        if (sourceType === "local_file") {
          if (!config.allowLocalFileUploads) {
            throw new Error(
              "Local file uploads are disabled. Set KIE_ALLOW_LOCAL_FILE_UPLOADS=true and choose KIE_LOCAL_UPLOAD_ROOT to opt in."
            );
          }
          return client.uploadFileStream({ filePath: source, uploadPath, fileName });
        }
        if (sourceType === "url") {
          const fileUrl = new URL(source);
          if (fileUrl.protocol !== "http:" && fileUrl.protocol !== "https:") {
            throw new Error("URL media uploads require an HTTP or HTTPS source.");
          }
          return client.requestJson({
            baseUrl: config.uploadBaseUrl,
            method: "POST",
            path: "/api/file-url-upload",
            body: { fileUrl: source, uploadPath, fileName }
          });
        }
        return client.requestJson({
          baseUrl: config.uploadBaseUrl,
          method: "POST",
          path: "/api/file-base64-upload",
          body: { base64Data: source, uploadPath, fileName }
        });
      })
  );

  server.registerTool(
    "kie_upload_file_from_url",
    {
      title: "Upload File From URL",
      description: "Ask KIE to download a remote URL into temporary upload storage.",
      inputSchema: {
        fileUrl: z.string().url(),
        uploadPath: UploadPathSchema,
        fileName: z.string().optional()
      }
    },
    async ({ fileUrl, uploadPath, fileName }) =>
      safeTool(() =>
        client.requestJson({
          baseUrl: config.uploadBaseUrl,
          method: "POST",
          path: "/api/file-url-upload",
          body: { fileUrl, uploadPath, fileName }
        })
      )
  );

  server.registerTool(
    "kie_upload_file_base64",
    {
      title: "Upload Base64 File",
      description: "Upload base64 file data into KIE temporary upload storage.",
      inputSchema: {
        base64Data: z.string().min(1),
        uploadPath: UploadPathSchema,
        fileName: z.string().optional()
      }
    },
    async ({ base64Data, uploadPath, fileName }) =>
      safeTool(() =>
        client.requestJson({
          baseUrl: config.uploadBaseUrl,
          method: "POST",
          path: "/api/file-base64-upload",
          body: { base64Data, uploadPath, fileName }
        })
      )
  );

  server.registerTool(
    "kie_upload_file_stream",
    {
      title: "Upload Local File Stream",
      description:
        "Upload a local file inside KIE_LOCAL_UPLOAD_ROOT to KIE temporary storage using multipart form data. Disabled by default for safety.",
      inputSchema: {
        filePath: z.string().min(1),
        uploadPath: UploadPathSchema,
        fileName: z.string().optional()
      }
    },
    async ({ filePath, uploadPath, fileName }) =>
      safeTool(() => {
        if (!config.allowLocalFileUploads) {
          throw new Error(
            "Local file stream uploads are disabled. Set KIE_ALLOW_LOCAL_FILE_UPLOADS=true and choose KIE_LOCAL_UPLOAD_ROOT to opt in."
          );
        }
        return client.uploadFileStream({ filePath, uploadPath, fileName });
      })
  );

  server.registerTool(
    "kie_market_list_models",
    {
      title: "List KIE Market Models",
      description: "List docs-derived model records for the unified Market createTask endpoint.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().positive().max(500).default(100)
      }
    },
    async ({ search, limit }) =>
      safeTool(() => {
        const normalizedSearch = search?.toLowerCase();
        const filtered = marketModels
          .filter((record) => {
            if (!normalizedSearch) {
              return true;
            }
            return (
              record.title.toLowerCase().includes(normalizedSearch) ||
              record.model_values.some((value) => value.toLowerCase().includes(normalizedSearch)) ||
              record.operationId?.toLowerCase().includes(normalizedSearch)
            );
          })
          .slice(0, limit)
          .map(summarizeMarketModel);

        return {
          count: filtered.length,
          totalKnownModels: marketModels.length,
          models: filtered
        };
      })
  );

  server.registerTool(
    "kie_market_get_model_schema",
    {
      title: "Get KIE Market Model Schema",
      description: "Return the docs-derived schema metadata for a known Market model value.",
      inputSchema: {
        model: z.string().min(1)
      }
    },
    async ({ model }) =>
      safeTool(() => {
        const record = findMarketModel(model, marketModels);
        if (!record) {
          throw new Error(`Unknown Market model in local registry: ${model}`);
        }
        return record;
      })
  );

  server.registerTool(
    "kie_market_create_task",
    {
      title: "Create KIE Market Task",
      description: "Create an asynchronous unified Market task using POST /api/v1/jobs/createTask.",
      inputSchema: {
        model: z.string().min(1),
        input: JsonRecordSchema.default({}),
        callBackUrl: z.string().url().optional(),
        validateKnownModel: z
          .boolean()
          .default(true)
          .describe("Validate against the bundled official schema. Disable only for intentional forward compatibility.")
      }
    },
    async ({ model, input, callBackUrl, validateKnownModel }) =>
      safeTool(() =>
        createMarketTask({
          client,
          model,
          input,
          callBackUrl,
          validateKnownModel,
          marketModels
        })
      )
  );

  server.registerTool(
    "kie_market_get_task",
    {
      title: "Get KIE Market Task",
      description: "Poll the unified Market task status endpoint once.",
      inputSchema: {
        taskId: z.string().min(1)
      }
    },
    async ({ taskId }) => safeTool(() => getMarketTask(client, taskId))
  );

  server.registerTool(
    "kie_market_wait_for_task",
    {
      title: "Wait For KIE Market Task",
      description: "Poll the unified Market task endpoint until a terminal status or timeout.",
      inputSchema: {
        taskId: z.string().min(1),
        intervalMs: z.number().int().positive().max(60000).optional(),
        timeoutMs: z.number().int().positive().max(60 * 60 * 1000).optional()
      }
    },
    async ({ taskId, intervalMs, timeoutMs }) =>
      safeTool(() =>
        waitForMarketTask({
          client,
          taskId,
          intervalMs: intervalMs ?? config.pollIntervalMs,
          timeoutMs: timeoutMs ?? config.pollTimeoutMs
        })
      )
  );

  server.registerTool(
    "kie_verify_webhook_signature",
    {
      title: "Verify KIE Webhook Signature",
      description: "Verify KIE webhook HMAC-SHA256 signature headers against a callback payload.",
      inputSchema: {
        payload: z.unknown(),
        timestamp: z.union([z.string(), z.number()]),
        signature: z.string().min(1),
        webhookHmacKey: z.string().optional()
      }
    },
    async ({ payload, timestamp, signature, webhookHmacKey }) =>
      safeTool(() => {
        const key = webhookHmacKey ?? config.webhookHmacKey;
        if (!key) {
          throw new Error("A webhook HMAC key is required via argument or KIE_WEBHOOK_HMAC_KEY.");
        }
        return verifyWebhookSignature({ payload, timestamp, signature, key });
      })
  );

  server.registerTool(
    "kie_product_list_operations",
    {
      title: "List KIE Product Operations",
      description: "List product-specific operation names supported by kie_product_api_call.",
      inputSchema: {
        family: z.string().optional()
      }
    },
    async ({ family }) =>
      safeTool(() => ({
        operations: productOperations.filter((operation) => !family || operation.family === family)
      }))
  );

  server.registerTool(
    "kie_product_get_operation_schema",
    {
      title: "Get KIE Product Operation Schema",
      description:
        "Return the complete official docs-derived endpoint schema and source URL for a supported product-specific operation.",
      inputSchema: {
        family: z.string().min(1),
        operation: z.string().min(1)
      }
    },
    async ({ family, operation }) =>
      safeTool(() => {
        const productOperation = findProductOperation(family, operation);
        if (!productOperation) {
          throw new Error(`Unknown product operation: ${family}/${operation}`);
        }
        return getProductOperationSchema(productOperation, openapiEndpointCatalog);
      })
  );

  server.registerTool(
    "kie_product_api_call",
    {
      title: "Call KIE Product API",
      description: "Call a documented product-specific KIE API operation for 4o Image, Flux Kontext, Runway/Aleph, Suno, or Veo3.1.",
      inputSchema: {
        family: z.string().min(1),
        operation: z.string().min(1),
        query: JsonRecordSchema.default({}),
        body: z.unknown().optional()
      }
    },
    async ({ family, operation, query, body }) =>
      safeTool(() => {
        const productOperation = findProductOperation(family, operation);
        if (!productOperation) {
          throw new Error(`Unknown product operation: ${family}/${operation}`);
        }
        validateProductOperationInput({
          productOperation,
          query,
          body,
          catalog: openapiEndpointCatalog
        });

        return client.requestJson({
          method: productOperation.method,
          path: productOperation.path,
          query: productOperation.method === "GET" ? (query as Record<string, string | number | boolean | undefined>) : undefined,
          body: productOperation.method === "POST" ? body ?? {} : undefined
        });
      })
  );

  server.registerTool(
    "kie_get_local_catalogs",
    {
      title: "Get Local KIE Catalogs",
      description: "Return the official-docs snapshot provenance and local catalog summaries without calling KIE.",
      inputSchema: {
        includeFullCatalogs: z.boolean().default(false)
      }
    },
    async ({ includeFullCatalogs }) =>
      safeTool(() => ({
        marketModelCount: marketModels.length,
        productOperationCount: productOperations.length,
        catalogSource: catalogs.source,
        catalogDataDirectory: catalogs.dataDirectory,
        snapshot: docsManifest,
        resources: [
          "kie://docs/manifest",
          "kie://docs/analysis",
          "kie://docs/openapi-catalog",
          "kie://docs/market-model-registry",
          "kie://docs/endpoint-index"
        ],
        productFamilies: [...new Set(productOperations.map((operation) => operation.family))],
        ...(includeFullCatalogs
          ? {
              openapiEndpointCatalog,
              endpointMentionIndex
            }
          : {})
      }))
  );

  server.registerTool(
    "kie_check_configuration",
    {
      title: "Check KIE MCP Configuration",
      description: "Check which environment-backed KIE settings are currently available without revealing secrets."
    },
    async () =>
      safeTool(() => ({
        hasApiKey: Boolean(config.apiKey),
        apiBaseUrl: config.apiBaseUrl,
        uploadBaseUrl: config.uploadBaseUrl,
        hasWebhookHmacKey: Boolean(config.webhookHmacKey),
        pollIntervalMs: config.pollIntervalMs,
        pollTimeoutMs: config.pollTimeoutMs,
        allowLocalFileUploads: config.allowLocalFileUploads,
        hasLocalUploadRoot: Boolean(config.localUploadRoot),
        docsCatalogSource: catalogs.source,
        docsDataDir: catalogs.dataDirectory,
        docsGeneratedAt: docsManifest.generatedAt,
        liveApiToolsReady: Boolean(config.apiKey)
      }))
  );

  return server;
}

export function assertLiveApiReady(config: KieConfig = loadConfig()): void {
  requireApiKey(config);
}
