import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig, pollPlanFromConfig, requireApiKey } from "./config.js";
import { normalizeError } from "./errors.js";
import { registerFriendlyTools } from "./friendly-tools.js";
import { KieHttpClient } from "./http.js";
import { createMarketTask } from "./market.js";
import {
  findProductOperation,
  getProductOperationSchema,
  productOperations,
  validateProductOperationInput
} from "./products.js";
import { findMarketModel, loadCatalogRegistry, summarizeMarketModel } from "./registry.js";
import { TaskStore } from "./task-store.js";
import { getMarketTask, waitForMarketTask } from "./task.js";
import type { KieConfig } from "./types.js";
import { verifyWebhookSignature } from "./webhook.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const JsonRecordSchema = z.record(z.string(), z.unknown());
export const UploadPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    "Use a relative upload path without empty, current-directory, or parent-directory segments."
  );

/**
 * What to tell an agent that reached for a local file and cannot have one.
 *
 * On the hosted relay this is not a misconfiguration to fix but a fact of the deployment, so the
 * message hands over the working command instead of an env var the caller cannot set.
 */
function localFileUploadHelp(config: KieConfig): string {
  if (config.uploadIngestUrl) {
    // Worded so classifyError reads this as an input error: it is not retryable, and the caller
    // fixes it by using a different route, not by trying again.
    return [
      'This remote server cannot read your disk, so it does not support sourceType "local_file".',
      `Upload the bytes yourself instead: curl -X POST "${config.uploadIngestUrl}?fileName=media.png" -H "Authorization: Bearer $KIE_API_KEY" -F file=@/absolute/path/media.png`,
      "That returns a KIE URL you can pass straight to a create tool.",
      "Do not fall back to base64 for anything but tiny files."
    ].join(" ");
  }
  return "Local file uploads are disabled. Set KIE_ALLOW_LOCAL_FILE_UPLOADS=true and choose KIE_LOCAL_UPLOAD_ROOT to opt in.";
}

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

export function createKieMcpServer(
  config: KieConfig = loadConfig(),
  fetchImpl?: typeof fetch,
  /**
   * Reuse an existing task store. The remote transport builds one server per HTTP request, so the
   * idempotency and result caches have to outlive the request that created them.
   */
  existingStore?: TaskStore
): McpServer {
  const client = makeClient(config, fetchImpl);
  const advancedTools = config.toolProfile === "full";
  const store =
    existingStore ??
    new TaskStore({
      submissionTtlMs: config.submissionTtlMs ?? 30 * 60 * 1000,
      resultTtlMs: config.resultCacheTtlMs ?? 30 * 60 * 1000,
      maxEntries: 500
    });
  if (!fetchImpl && config.apiKey && config.prewarmConnection !== false) {
    // Open the TLS connection while the client is still negotiating, so the first real call does
    // not pay for DNS, TCP, and the handshake.
    void fetch(config.apiBaseUrl, { method: "HEAD" }).catch(() => undefined);
  }
  const catalogs = loadCatalogRegistry(config.docsDataDir);
  const { docsManifest, endpointMentionIndex, marketModels, openapiEndpointCatalog } = catalogs;
  const server = new McpServer(
    {
      name: "kie-ai-mcp",
      version: "1.1.0"
    },
    {
      instructions: [
        "KIE media creation. Three create tools and one collect tool cover almost every request.",
        "kie_create_image, kie_create_video, and kie_create_speech each take a `jobs` array. Put every independent asset in ONE call so they run in parallel. Never call a create tool repeatedly in a loop for independent assets.",
        "kie_get_creation collects results: pass every pending task ID in one call, not one call per ID. Finished tasks are cached, so re-checking is free.",
        "Videos take minutes, so kie_create_video returns task IDs immediately by default; collect them with kie_get_creation. Images and speech wait by default and usually return media URLs directly.",
        "For automated or retryable steps, pass idempotencyKey. Retrying with the same key returns the original task instead of paying for a second generation.",
        "Reference media must be a URL. Use kie_upload_media for local files or base64 data first.",
        ...(config.uploadIngestUrl
          ? [
              `This server is remote and cannot read your disk. To use a local file, POST it to ${config.uploadIngestUrl} with the same API key you connect with: \`curl -X POST "${config.uploadIngestUrl}?fileName=media.png" -H "Authorization: Bearer $KIE_API_KEY" -F file=@/path/to/media.png\`. It returns a KIE URL you can pass straight to a create tool. Never read a file and paste it as base64 into a tool call: a 1MB image costs roughly 350k tokens and will not fit.`
            ]
          : []),
        "For a low-cost smoke test use model bytedance/seedance-2-mini at 480p, 4 seconds, with generateAudio false.",
        "Errors carry category, retryable, and nextStep fields. Branch on those instead of parsing messages: retry only when retryable is true, and never resubmit a create call after a timeout because the task is still running.",
        "Market and product tools are advanced escape hatches for models the create tools do not cover. Return concise status, task IDs, and direct media links."
      ].join(" ")
    }
  );

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

  registerFriendlyTools({ server, client, config, marketModels, store });

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
      description:
        "Convert a KIE-generated file URL into a temporary direct download URL. The returned link expires 20 minutes after it is issued, so fetch it immediately rather than storing it.",
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
        [
          "Upload one local file, public URL, or base64 payload through KIE's native temporary File Upload API.",
          "No third-party storage service is used. Uploads are temporary: KIE deletes them after 3 days.",
          "Use base64 only for small files — anything over 10MB should go through a local file (stream) upload, and a URL upload must be publicly reachable within a 30 second download timeout and is capped around 100MB.",
          ...(config.uploadIngestUrl
            ? [
                `sourceType "local_file" is unavailable on this remote server, which has no access to your disk. Upload the bytes yourself with: curl -X POST "${config.uploadIngestUrl}?fileName=media.png" -H "Authorization: Bearer $KIE_API_KEY" -F file=@/absolute/path/media.png`
              ]
            : [])
        ].join(" "),
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
            throw new Error(localFileUploadHelp(config));
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

  // Advanced surface. kie_upload_media already covers URL, base64, and local-file uploads, so the
  // three transport-specific tools only add tool-selection ambiguity on the default profile.
  if (advancedTools) {
  server.registerTool(
    "kie_upload_file_from_url",
    {
      title: "Upload File From URL",
      description:
        "Ask KIE to download a remote URL into temporary upload storage. The URL must be publicly reachable within a 30 second download timeout, the recommended ceiling is 100MB, and the stored file is deleted after 3 days.",
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
      description:
        "Upload base64 file data into KIE temporary upload storage. Accepts a plain base64 string or a data URL. Recommended for small files only — base64 adds about 33% overhead, so use the stream upload above 10MB. The stored file is deleted after 3 days.",
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
        "Upload a local file inside KIE_LOCAL_UPLOAD_ROOT to KIE temporary storage using multipart form data. Preferred for files over 10MB. Disabled by default for safety. The stored file is deleted after 3 days.",
      inputSchema: {
        filePath: z.string().min(1),
        uploadPath: UploadPathSchema,
        fileName: z.string().optional()
      }
    },
    async ({ filePath, uploadPath, fileName }) =>
      safeTool(() => {
        if (!config.allowLocalFileUploads) {
          throw new Error(localFileUploadHelp(config));
        }
        return client.uploadFileStream({ filePath, uploadPath, fileName });
      })
  );
  }

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

  // Advanced surface. kie_get_creation covers status and waiting; the product and webhook tools
  // are escape hatches that most callers never need.
  if (advancedTools) {
  server.registerTool(
    "kie_market_get_task",
    {
      title: "Get KIE Market Task",
      description: "Poll the unified Market task status endpoint once.",
      inputSchema: {
        taskId: z.string().min(1)
      }
    },
    async ({ taskId }, extra) =>
      safeTool(() => getMarketTask(client, taskId, extra.signal, pollPlanFromConfig(config).requestTimeoutMs))
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
    async ({ taskId, intervalMs, timeoutMs }, extra) =>
      safeTool(() => {
        const plan = pollPlanFromConfig(config, intervalMs);
        return waitForMarketTask({
          client,
          taskId,
          intervalMs: plan.intervalMs,
          timeoutMs: timeoutMs ?? config.pollTimeoutMs,
          plan,
          signal: extra.signal
        });
      })
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
          body: productOperation.method === "POST" ? body ?? {} : undefined,
          // Product endpoints that create a task are metered against the same account-wide
          // generation budget as the Market createTask endpoint.
          ...(productOperation.creates ? { rateLimitClass: "generation" as const } : {})
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
  }

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
        pollPlan: pollPlanFromConfig(config),
        maxConcurrentRequests: config.maxConcurrentRequests,
        toolProfile: config.toolProfile ?? "standard",
        cache: store.stats(),
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
