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

  async function connect() {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createKieMcpServer({
      apiBaseUrl: "https://api.test",
      uploadBaseUrl: "https://upload.test",
      pollIntervalMs: 1,
      pollTimeoutMs: 100,
      allowLocalFileUploads: false
    });
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
        "kie_product_api_call"
      ])
    );

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining([
        "kie://docs/analysis",
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
    expect("text" in analysis.contents[0] ? analysis.contents[0].text : "").toContain("KIE.AI MCP Server Research Analysis");
  });

  it("calls non-live catalog tools and returns clear missing-key errors for live tools", async () => {
    const client = await connect();

    const catalogResult = await client.callTool({
      name: "kie_market_list_models",
      arguments: { search: "qwen2", limit: 5 }
    });
    const catalogText = firstTextContent(catalogResult);
    expect(catalogText).toContain("qwen2/text-to-image");

    const configResult = await client.callTool({ name: "kie_check_configuration", arguments: {} });
    const configText = firstTextContent(configResult);
    expect(configText).toContain('"hasApiKey": false');

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
});
