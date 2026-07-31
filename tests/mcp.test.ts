import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKieMcpServer } from "../src/server.js";

function firstTextContent(result: unknown): string {
  const resultObject = result && typeof result === "object" ? (result as { content?: unknown }) : {};
  const content = Array.isArray(resultObject.content) ? resultObject.content : [];
  const first = content[0];
  return first && typeof first === "object" && "type" in first && first.type === "text" && "text" in first
    ? String(first.text)
    : "";
}

describe("MCP server integration", () => {
  const clients: Client[] = [];
  const servers: Awaited<ReturnType<typeof createKieMcpServer>>[] = [];

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.close()));
    await Promise.all(servers.map((server) => server.close()));
    clients.length = 0;
    servers.length = 0;
  });

  async function connect(fetchImpl?: typeof fetch) {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createKieMcpServer({
      apiKey: fetchImpl ? "test-key" : undefined,
      apiBaseUrl: "https://api.test",
      uploadBaseUrl: "https://upload.test",
      pollIntervalMs: 1,
      pollTimeoutMs: 100,
      allowLocalFileUploads: false
    }, fetchImpl);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    servers.push(server);
    clients.push(client);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return client;
  }

  it("exposes the required tools and docs resources without KIE_API_KEY", async () => {
    const client = await connect();
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    expect(toolNames).toEqual(
      expect.arrayContaining([
        "kie_check_configuration",
        "kie_create_image",
        "kie_create_video",
        "kie_create_speech",
        "kie_get_creation",
        "kie_get_local_catalogs",
        "kie_get_credits",
        "kie_get_download_url",
        "kie_upload_media",
        "kie_upload_file_from_url",
        "kie_upload_file_base64",
        "kie_upload_file_stream",
        "kie_market_list_models",
        "kie_market_get_model_schema",
        "kie_market_create_task",
        "kie_market_get_task",
        "kie_market_wait_for_task",
        "kie_verify_webhook_signature",
        "kie_product_list_operations",
        "kie_product_get_operation_schema",
        "kie_product_api_call"
      ])
    );

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining([
        "kie://docs/analysis",
        "kie://docs/manifest",
        "kie://docs/openapi-catalog",
        "kie://docs/market-model-registry",
        "kie://docs/endpoint-index"
      ])
    );

    const analysis = await client.readResource({ uri: "kie://docs/analysis" });
    expect(analysis.contents[0]).toMatchObject({
      uri: "kie://docs/analysis",
      mimeType: "text/markdown"
    });
    expect("text" in analysis.contents[0] ? analysis.contents[0].text : "").toContain("KIE.AI MCP Server Documentation Snapshot");
    const manifest = await client.readResource({ uri: "kie://docs/manifest" });
    expect("text" in manifest.contents[0] ? manifest.contents[0].text : "").toContain('"sourceIndex": "https://docs.kie.ai/llms.txt"');
  });

  it("routes friendly URL uploads directly through the configured KIE upload API", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          code: 200,
          msg: "File uploaded successfully",
          data: { downloadUrl: "https://tempfile.redpandaai.co/test/image.png" }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_upload_media",
      arguments: {
        sourceType: "url",
        source: "https://example.com/image.png",
        uploadPath: "agent-uploads",
        fileName: "image.png"
      }
    });

    expect(result.isError).not.toBe(true);
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(String(url)).toBe("https://upload.test/api/file-url-upload");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        fileUrl: "https://example.com/image.png",
        uploadPath: "agent-uploads",
        fileName: "image.png"
      })
    );
  });

  it("calls non-live catalog tools and returns clear missing-key errors for live tools", async () => {
    const client = await connect();

    const catalogResult = await client.callTool({
      name: "kie_market_list_models",
      arguments: { search: "qwen2", limit: 5 }
    });
    const catalogText = firstTextContent(catalogResult);
    expect(catalogText).toContain("qwen2/text-to-image");

    const snapshotResult = await client.callTool({ name: "kie_get_local_catalogs", arguments: {} });
    const snapshotText = firstTextContent(snapshotResult);
    expect(snapshotText).toContain('"sourceIndex": "https://docs.kie.ai/llms.txt"');
    expect(snapshotText).toContain('"catalogSource": "bundled"');

    const configResult = await client.callTool({ name: "kie_check_configuration", arguments: {} });
    const configText = firstTextContent(configResult);
    expect(configText).toContain('"hasApiKey": false');
    expect(configText).toContain('"hasLocalUploadRoot": false');

    const creditsResult = await client.callTool({ name: "kie_get_credits", arguments: {} });
    expect(creditsResult.isError).toBe(true);
    const errorText = firstTextContent(creditsResult);
    expect(errorText).toContain("KIE_API_KEY is required");
  });

  it("offers a friendly image creation tool that wraps Market createTask", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "task_123" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createKieMcpServer(
      {
        apiKey: "test-key",
        apiBaseUrl: "https://api.test",
        uploadBaseUrl: "https://upload.test",
        pollIntervalMs: 1,
        pollTimeoutMs: 100,
        allowLocalFileUploads: false
      },
      fetchImpl
    );
    const client = new Client({ name: "test-client", version: "0.0.0" });
    servers.push(server);
    clients.push(client);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({
      name: "kie_create_image",
      arguments: {
        prompt: "A cinematic product photo of a chrome espresso machine",
        aspectRatio: "1:1",
        resolution: "1K",
        waitForResult: false
      }
    });

    const text = firstTextContent(result);
    expect(text).toContain('"kind": "image"');
    expect(text).toContain('"taskId": "task_123"');

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(String(url)).toBe("https://api.test/api/v1/jobs/createTask");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "gpt-image-2-text-to-image",
      input: {
        prompt: "A cinematic product photo of a chrome espresso machine",
        aspect_ratio: "1:1",
        resolution: "1K"
      }
    });
  });

  it("rejects invalid friendly-tool combinations before sending a billable request", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "unexpected" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const imageResult = await client.callTool({
      name: "kie_create_image",
      arguments: {
        prompt: "A studio portrait",
        aspectRatio: "1:1",
        resolution: "4K",
        waitForResult: false
      }
    });
    expect(imageResult.isError).toBe(true);
    expect(firstTextContent(imageResult)).toContain("does not support 4K output at a 1:1");

    const videoResult = await client.callTool({
      name: "kie_create_video",
      arguments: {
        prompt: "A bird takes flight",
        firstFrameUrl: "https://example.com/first.png",
        referenceImageUrls: ["https://example.com/reference.png"],
        waitForResult: false
      }
    });
    expect(videoResult.isError).toBe(true);
    expect(firstTextContent(videoResult)).toContain("mutually exclusive");

    const speechResult = await client.callTool({
      name: "kie_create_speech",
      arguments: {
        text: "Read this sentence.",
        speed: 1.3,
        waitForResult: false
      }
    });
    expect(speechResult.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps friendly video and speech parameters to their exact official Market input names", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "task_123" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const videoResult = await client.callTool({
      name: "kie_create_video",
      arguments: {
        prompt: "A bird takes flight",
        duration: 4,
        firstFrameUrl: "https://example.com/first.png",
        generateAudio: false,
        waitForResult: false,
        additionalInput: { return_last_frame: true, web_search: false }
      }
    });
    expect(videoResult.isError).not.toBe(true);

    const speechResult = await client.callTool({
      name: "kie_create_speech",
      arguments: {
        text: "Read this sentence.",
        languageCode: "en",
        speed: 0.9,
        waitForResult: false,
        additionalInput: { stability: 0.6, timestamps: true }
      }
    });
    expect(speechResult.isError).not.toBe(true);

    expect(JSON.parse(String(vi.mocked(fetchImpl).mock.calls[0][1]?.body))).toEqual({
      model: "bytedance/seedance-2",
      input: {
        prompt: "A bird takes flight",
        aspect_ratio: "16:9",
        resolution: "720p",
        duration: 4,
        generate_audio: false,
        first_frame_url: "https://example.com/first.png",
        return_last_frame: true,
        web_search: false
      }
    });
    expect(JSON.parse(String(vi.mocked(fetchImpl).mock.calls[1][1]?.body))).toEqual({
      model: "elevenlabs/text-to-speech-turbo-2-5",
      input: {
        text: "Read this sentence.",
        voice: "EkK5I93UQWFDigLMpZcX",
        speed: 0.9,
        language_code: "en",
        stability: 0.6,
        timestamps: true
      }
    });
  });

  it("exposes and enforces official product operation schemas before network access", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const schemaResult = await client.callTool({
      name: "kie_product_get_operation_schema",
      arguments: { family: "veo", operation: "generate" }
    });
    expect(schemaResult.isError).not.toBe(true);
    expect(firstTextContent(schemaResult)).toContain("https://docs.kie.ai/veo3-api/generate-veo-3-video.md");

    const invalidResult = await client.callTool({
      name: "kie_product_api_call",
      arguments: {
        family: "veo",
        operation: "generate",
        body: {
          prompt: "A calm ocean",
          model: "invented-model"
        }
      }
    });
    expect(invalidResult.isError).toBe(true);
    expect(firstTextContent(invalidResult)).toContain("body.model must be one of");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
