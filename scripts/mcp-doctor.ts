import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRecord = Record<string, unknown>;

const REQUIRED_TOOLS = [
  "kie_check_configuration",
  "kie_get_local_catalogs",
  "kie_upload_media",
  "kie_create_image",
  "kie_create_video",
  "kie_create_speech",
  "kie_product_get_operation_schema"
] as const;

const REQUIRED_RESOURCES = [
  "kie://docs/manifest",
  "kie://docs/analysis",
  "kie://docs/openapi-catalog",
  "kie://docs/market-model-registry",
  "kie://docs/endpoint-index"
] as const;

function textPayload(result: unknown): JsonRecord {
  if (!result || typeof result !== "object") {
    throw new Error("MCP tool returned an invalid result.");
  }
  const toolResult = result as { isError?: boolean; content?: unknown };
  const first = Array.isArray(toolResult.content) ? toolResult.content[0] : undefined;
  if (!first || typeof first !== "object" || !("text" in first) || typeof first.text !== "string") {
    throw new Error("MCP tool returned no JSON text content.");
  }
  const parsed = JSON.parse(first.text) as JsonRecord;
  if (toolResult.isError) {
    throw new Error(`MCP tool failed: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

function inheritedKieEnvironment(): Record<string, string> {
  const env = getDefaultEnvironment();
  for (const name of [
    "KIE_API_KEY",
    "KIE_API_BASE_URL",
    "KIE_UPLOAD_BASE_URL",
    "KIE_WEBHOOK_HMAC_KEY",
    "KIE_POLL_INTERVAL_MS",
    "KIE_POLL_TIMEOUT_MS",
    "KIE_ALLOW_LOCAL_FILE_UPLOADS",
    "KIE_LOCAL_UPLOAD_ROOT",
    "KIE_DOCS_DATA_DIR"
  ]) {
    const value = process.env[name];
    if (value !== undefined) {
      env[name] = value;
    }
  }
  return env;
}

async function processExited(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function main(): Promise<void> {
  const live = process.argv.includes("--live");
  const entryFlag = process.argv.indexOf("--entry");
  if (live && !process.env.KIE_API_KEY) {
    throw new Error("KIE_API_KEY must be set before running the live MCP doctor.");
  }
  if (entryFlag >= 0 && !process.argv[entryFlag + 1]) {
    throw new Error("--entry requires an MCP server entry-point path.");
  }

  const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const serverEntry =
    entryFlag >= 0
      ? resolve(process.argv[entryFlag + 1])
      : join(repositoryRoot, "dist/src/index.js");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: repositoryRoot,
    env: inheritedKieEnvironment(),
    stderr: "pipe"
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const client = new Client({ name: "kie-ai-mcp-doctor", version: "0.2.1" });
  let childPid: number | null = null;
  let result: JsonRecord | undefined;

  try {
    await client.connect(transport);
    childPid = transport.pid;
    if (!childPid) {
      throw new Error("MCP stdio transport did not expose a child process.");
    }

    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);
    const missingTools = REQUIRED_TOOLS.filter((name) => !toolNames.includes(name));
    if (missingTools.length > 0) {
      throw new Error(`MCP is missing required tools: ${missingTools.join(", ")}`);
    }

    const resources = await client.listResources();
    const resourceUris = resources.resources.map((resource) => resource.uri);
    const missingResources = REQUIRED_RESOURCES.filter((uri) => !resourceUris.includes(uri));
    if (missingResources.length > 0) {
      throw new Error(`MCP is missing required resources: ${missingResources.join(", ")}`);
    }

    const configuration = textPayload(
      await client.callTool({ name: "kie_check_configuration", arguments: {} })
    );
    const catalogs = textPayload(
      await client.callTool({
        name: "kie_get_local_catalogs",
        arguments: { includeFullCatalogs: false }
      })
    );
    const snapshot = catalogs.snapshot as JsonRecord | undefined;
    if (!snapshot || snapshot.failures !== 0) {
      throw new Error("MCP loaded an incomplete or invalid KIE documentation snapshot.");
    }
    if (configuration.apiBaseUrl !== "https://api.kie.ai") {
      throw new Error(`MCP is not using the native KIE API base URL: ${String(configuration.apiBaseUrl)}`);
    }
    if (configuration.uploadBaseUrl !== "https://kieai.redpandaai.co") {
      throw new Error(
        `MCP is not using the native KIE upload base URL: ${String(configuration.uploadBaseUrl)}`
      );
    }

    if (live) {
      textPayload(await client.callTool({ name: "kie_get_credits", arguments: {} }));
    }

    result = {
      ok: true,
      initialized: true,
      toolCount: toolNames.length,
      resourceCount: resourceUris.length,
      catalogSource: catalogs.catalogSource,
      catalogGeneratedAt: snapshot.generatedAt,
      marketModelCount: catalogs.marketModelCount,
      productOperationCount: catalogs.productOperationCount,
      apiConfigured: configuration.hasApiKey,
      apiBaseUrl: configuration.apiBaseUrl,
      nativeUploadBaseUrl: configuration.uploadBaseUrl,
      localFileUploadsEnabled: configuration.allowLocalFileUploads,
      localUploadRootConfigured: configuration.hasLocalUploadRoot,
      liveAuthentication: live ? "verified" : "not-requested"
    };
  } finally {
    await client.close().catch(() => transport.close());
  }

  if (!childPid || !(await processExited(childPid))) {
    throw new Error("MCP child process remained alive after client shutdown.");
  }
  if (stderr.trim()) {
    throw new Error(`MCP wrote unexpected stderr: ${stderr.trim()}`);
  }

  console.log(
    JSON.stringify(
      {
        ...result,
        shutdown: "clean",
        childProcessExited: true
      },
      null,
      2
    )
  );
}

await main();
