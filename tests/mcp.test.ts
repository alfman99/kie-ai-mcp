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

  async function connect(fetchImpl?: typeof fetch, toolProfile: "standard" | "full" = "full") {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createKieMcpServer({
      apiKey: fetchImpl ? "test-key" : undefined,
      apiBaseUrl: "https://api.test",
      uploadBaseUrl: "https://upload.test",
      pollIntervalMs: 1,
      pollTimeoutMs: 100,
      allowLocalFileUploads: false,
      toolProfile
    }, fetchImpl);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    servers.push(server);
    clients.push(client);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return client;
  }

  it("exposes the required tools and docs resources without KIE_API_KEY", async () => {
    const client = await connect();
    expect(client.getInstructions()).toContain("each take a `jobs` array");
    expect(client.getInstructions()).toContain("pass every pending task ID in one call");
    expect(client.getInstructions()).toContain("pass idempotencyKey");
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
        allowLocalFileUploads: false,
        toolProfile: "full"
      },
      fetchImpl
    );
    const client = new Client({ name: "test-client", version: "0.0.0" });
    servers.push(server);
    clients.push(client);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({
      name: "kie_create_image",
      arguments: { jobs: [{ prompt: "A cinematic product photo of a chrome espresso machine", aspectRatio: "1:1", resolution: "1K" }], waitForResult: false }
    });

    const text = firstTextContent(result);
    expect(text).toContain("image 1 | submitted | task task_123");
    expect(result.structuredContent).toMatchObject({
      generations: [{ kind: "image", taskId: "task_123", status: "submitted" }]
    });

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

  it("returns a direct media link from a completed friendly creation", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "task_done" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            msg: "success",
            data: {
              taskId: "task_done",
              model: "gpt-image-2-text-to-image",
              state: "success",
              progress: 100,
              resultJson: JSON.stringify({ resultUrls: ["https://example.com/task_done.png"] })
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_create_image",
      arguments: { jobs: [{ prompt: "A simple product image" }], waitForResult: true }
    });

    expect(result.isError).not.toBe(true);
    expect(firstTextContent(result)).toContain("image 1 | success | task task_done");
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "resource_link", uri: "https://example.com/task_done.png" })
      ])
    );
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
      arguments: { jobs: [{ prompt: "A studio portrait", aspectRatio: "1:1", resolution: "4K" }], waitForResult: false }
    });
    expect(imageResult.isError).toBe(true);
    expect(firstTextContent(imageResult)).toContain("does not support 4K output at a 1:1");

    const videoResult = await client.callTool({
      name: "kie_create_video",
      arguments: { jobs: [{ prompt: "A bird takes flight", firstFrameUrl: "https://example.com/first.png", referenceImageUrls: ["https://example.com/reference.png"] }], waitForResult: false }
    });
    expect(videoResult.isError).toBe(true);
    expect(firstTextContent(videoResult)).toContain("mutually exclusive");

    const seedance25Result = await client.callTool({
      name: "kie_create_video",
      arguments: { jobs: [{ model: "bytedance/seedance-2-5", prompt: "A bird takes flight", resolution: "1080p" }], waitForResult: false }
    });
    expect(seedance25Result.isError).toBe(true);
    expect(firstTextContent(seedance25Result)).toContain("resolution must be 480p or 720p");

    const speechResult = await client.callTool({
      name: "kie_create_speech",
      arguments: { jobs: [{ text: "Read this sentence.", speed: 1.3 }], waitForResult: false }
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
      arguments: { jobs: [{ prompt: "A bird takes flight", duration: 4, firstFrameUrl: "https://example.com/first.png", generateAudio: false, additionalInput: { return_last_frame: true, web_search: false } }], waitForResult: false }
    });
    expect(videoResult.isError).not.toBe(true);

    const speechResult = await client.callTool({
      name: "kie_create_speech",
      arguments: { jobs: [{ text: "Read this sentence.", languageCode: "en", speed: 0.9, additionalInput: { stability: 0.6, timestamps: true } }], waitForResult: false }
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

  it("supports Seedance 2.5 through the friendly video tool with its official limits", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "task_25" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_create_video",
      arguments: { jobs: [{ model: "bytedance/seedance-2-5", prompt: "A cinematic product reveal", duration: 30, resolution: "720p", outputFormat: "mov", referenceImageUrls: ["https://example.com/reference.png"] }], waitForResult: false }
    });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(String(vi.mocked(fetchImpl).mock.calls[0][1]?.body))).toEqual({
      model: "bytedance/seedance-2-5",
      input: {
        prompt: "A cinematic product reveal",
        aspect_ratio: "16:9",
        resolution: "720p",
        duration: 30,
        generate_audio: true,
        reference_image_urls: ["https://example.com/reference.png"],
        output_format: "mov"
      }
    });
  });

  it("supports Seedance Mini for low-cost smoke tests and enforces its official limits", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "task_mini" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_create_video",
      arguments: { jobs: [{ model: "bytedance/seedance-2-mini", prompt: "A low-cost smoke test", duration: 4, resolution: "480p", generateAudio: false }], waitForResult: false }
    });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(String(vi.mocked(fetchImpl).mock.calls[0][1]?.body))).toMatchObject({
      model: "bytedance/seedance-2-mini",
      input: { duration: 4, resolution: "480p", generate_audio: false }
    });

    const invalid = await client.callTool({
      name: "kie_create_video",
      arguments: { jobs: [{ model: "bytedance/seedance-2-mini", prompt: "An invalid expensive smoke test", resolution: "1080p" }], waitForResult: false }
    });
    expect(invalid.isError).toBe(true);
    expect(firstTextContent(invalid)).toContain("Seedance 2 Mini resolution must be 480p or 720p");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("submits independent video jobs in parallel and returns all task IDs", async () => {
    const started: string[] = [];
    const resolvers: Array<() => void> = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: { prompt: string } };
      started.push(body.input.prompt);
      await new Promise<void>((resolve) => resolvers.push(resolve));
      return new Response(
        JSON.stringify({ code: 200, msg: "success", data: { taskId: `task_${body.input.prompt}` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const resultPromise = client.callTool({
      name: "kie_create_video",
      arguments: {
        jobs: [
          { label: "Reveal", prompt: "reveal", firstFrameUrl: "https://example.com/one.png" },
          { label: "Install", prompt: "install", firstFrameUrl: "https://example.com/two.png" }
        ],
        waitForResult: false
      }
    });

    await vi.waitFor(() => expect(started).toEqual(["reveal", "install"]));
    resolvers.forEach((resolve) => resolve());
    const result = await resultPromise;
    const text = firstTextContent(result);
    expect(text).toContain("Reveal | submitted | task task_reveal");
    expect(text).toContain("Install | submitted | task task_install");
    expect(result.structuredContent).toMatchObject({
      generations: [{ taskId: "task_reveal" }, { taskId: "task_install" }]
    });
  });

  it("collects generation results in parallel with normalized output and direct links", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const taskId = new URL(String(url)).searchParams.get("taskId") ?? "unknown";
      const extension = taskId.endsWith("video") ? "mp4" : "png";
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "success",
          data: {
            taskId,
            model: taskId.endsWith("video") ? "bytedance/seedance-2" : "gpt-image-2-text-to-image",
            state: "success",
            progress: 100,
            resultJson: JSON.stringify({ resultUrls: [`https://example.com/${taskId}.${extension}`] })
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_get_creation",
      arguments: {
        taskIds: ["clip_video", "poster_image"],
        labels: ["Hero clip", "Poster"],
        waitForResult: false
      }
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      title: "Creations",
      summary: "2 complete · 0 failed · 0 in progress",
      generations: [
        { taskId: "clip_video", label: "Hero clip", kind: "video", status: "success" },
        { taskId: "poster_image", label: "Poster", kind: "image", status: "success" }
      ]
    });
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "resource_link", uri: "https://example.com/clip_video.mp4" }),
        expect.objectContaining({ type: "resource_link", uri: "https://example.com/poster_image.png" })
      ])
    );
    expect(firstTextContent(result)).toBe(
      [
        "2 complete · 0 failed · 0 in progress",
        "1. Hero clip | success | task clip_video | bytedance/seedance-2 | https://example.com/clip_video.mp4",
        "2. Poster | success | task poster_image | gpt-image-2-text-to-image | https://example.com/poster_image.png"
      ].join("\n")
    );
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(2);
  });

  it("keeps successful batch results when another task check fails", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const taskId = new URL(String(url)).searchParams.get("taskId") ?? "unknown";
      if (taskId === "broken_task") {
        throw new Error("Temporary provider failure");
      }
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "success",
          data: {
            taskId,
            model: "bytedance/seedance-2-mini",
            state: "success",
            resultJson: JSON.stringify({ resultUrls: [`https://example.com/${taskId}.mp4`] })
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_get_creation",
      arguments: {
        taskIds: ["good_task", "broken_task"],
        labels: ["Good clip", "Broken clip"],
        kinds: ["video", "video"],
        waitForResult: false
      }
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      summary: "1 complete · 1 failed · 0 in progress",
      generations: [
        { taskId: "good_task", status: "success", outputUrls: ["https://example.com/good_task.mp4"] },
        { taskId: "broken_task", status: "error", outputUrls: [], error: "Temporary provider failure" }
      ]
    });
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "resource_link", uri: "https://example.com/good_task.mp4" })
      ])
    );
  });

  it("sends standard MCP progress updates while waiting for a creation", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, msg: "success", data: { taskId: "progress_task", state: "generating", progress: 40 } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            msg: "success",
            data: {
              taskId: "progress_task",
              state: "success",
              progress: 100,
              resultJson: JSON.stringify({ resultUrls: ["https://example.com/progress_task.mp4"] })
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);
    const updates: Array<{ progress: number; total?: number; message?: string }> = [];

    const result = await client.callTool(
      {
        name: "kie_get_creation",
        arguments: { taskIds: ["progress_task"], waitForResult: true }
      },
      undefined,
      {
        onprogress: (update: { progress: number; total?: number; message?: string }) => updates.push(update),
        resetTimeoutOnProgress: true
      }
    );

    expect(result.isError).not.toBe(true);
    expect(updates.map((update) => update.progress)).toEqual([0, 40, 100, 100]);
    expect(updates.every((update) => update.total === 100)).toBe(true);
    expect(updates.map((update) => update.message)).toContain("Creation: success");
    expect(updates.at(-1)?.message).toBe("Creation checks finished");
  });

  it("cancels an in-flight advanced Market wait", async () => {
    let requestSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        requestSignal = init?.signal ?? undefined;
        requestSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);
    const controller = new AbortController();
    const call = client.callTool(
      {
        name: "kie_market_wait_for_task",
        arguments: { taskId: "advanced_cancel", timeoutMs: 1_000 }
      },
      undefined,
      { signal: controller.signal }
    );

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(call).rejects.toThrow();
    await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
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

  it("submits every job in one call in parallel", async () => {
    const started: string[] = [];
    const resolvers: Array<() => void> = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: { prompt: string } };
      started.push(body.input.prompt);
      await new Promise<void>((resolve) => resolvers.push(resolve));
      return new Response(
        JSON.stringify({ code: 200, msg: "success", data: { taskId: `task_${body.input.prompt}` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const resultPromise = client.callTool({
      name: "kie_create_image",
      arguments: {
        jobs: [
          { label: "Front", prompt: "front" },
          { label: "Side", prompt: "side" }
        ],
        waitForResult: false
      }
    });

    // Both requests are in flight before either resolves.
    await vi.waitFor(() => expect(started).toEqual(["front", "side"]));
    resolvers.forEach((resolve) => resolve());

    expect((await resultPromise).structuredContent).toMatchObject({
      generations: [{ taskId: "task_front", kind: "image" }, { taskId: "task_side", kind: "image" }]
    });
  });

  it("keeps a batch alive when one job fails validation", async () => {
    const submitted: string[] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: { prompt: string } };
      submitted.push(body.input.prompt);
      return new Response(
        JSON.stringify({ code: 200, msg: "success", data: { taskId: `task_${body.input.prompt}` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({
      name: "kie_create_video",
      arguments: {
        jobs: [
          { label: "Good", prompt: "good" },
          // lastFrameUrl without firstFrameUrl is rejected before submission.
          { label: "Bad", prompt: "bad", lastFrameUrl: "https://example.com/last.png" },
          { label: "Also good", prompt: "also-good" }
        ],
        waitForResult: false
      }
    });

    expect(submitted).toEqual(["good", "also-good"]);
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      generations: [
        { label: "Good", taskId: "task_good" },
        { label: "Bad", taskId: "unavailable" },
        { label: "Also good", taskId: "task_also-good" }
      ]
    });
    expect(firstTextContent(result)).toContain("lastFrameUrl requires firstFrameUrl");
  });

  it("reports a tool error when every job in a call fails", async () => {
    const client = await connect();

    const result = await client.callTool({
      name: "kie_create_video",
      arguments: {
        jobs: [{ prompt: "bad", lastFrameUrl: "https://example.com/last.png" }],
        waitForResult: false
      }
    });

    expect(result.isError).toBe(true);
  });

  it("does not pay twice when an automated step retries with the same idempotency key", async () => {
    let creates = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const isCreate = String(url).includes("createTask");
      if (isCreate) creates += 1;
      return new Response(
        JSON.stringify({ code: 200, msg: "success", data: { taskId: "task_once" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const call = () =>
      client.callTool({
        name: "kie_create_image",
        arguments: {
          jobs: [{ prompt: "a chrome espresso machine" }],
          waitForResult: false,
          idempotencyKey: "nightly-render-2026-08-18"
        }
      });

    const first = await call();
    const second = await call();

    expect(creates).toBe(1);
    expect(first.structuredContent).toMatchObject({ generations: [{ taskId: "task_once" }] });
    // The replay is labelled, so an automated caller can tell it did not create new work.
    expect(second.structuredContent).toMatchObject({ generations: [{ taskId: "task_once", deduplicated: true }] });
  });

  it("still submits both jobs when one call repeats a prompt without an idempotency key", async () => {
    let creates = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("createTask")) creates += 1;
      return new Response(
        JSON.stringify({ code: 200, msg: "success", data: { taskId: `task_${creates}` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    await client.callTool({
      name: "kie_create_image",
      arguments: {
        jobs: [{ prompt: "same prompt" }, { prompt: "same prompt" }],
        waitForResult: false,
        idempotencyKey: "variation-batch"
      }
    });

    // Two deliberate variations of one prompt must stay two paid tasks.
    expect(creates).toBe(2);
  });

  it("serves a finished task from memory instead of the network", async () => {
    let statusCalls = 0;
    const fetchImpl = vi.fn(async () => {
      statusCalls += 1;
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "success",
          data: {
            taskId: "task_done",
            state: "success",
            resultJson: JSON.stringify({ resultUrls: ["https://example.com/task_done.png"] })
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const args = { name: "kie_get_creation", arguments: { taskIds: ["task_done"], waitForResult: true } };
    const first = await client.callTool(args);
    const second = await client.callTool(args);

    expect(statusCalls).toBe(1);
    expect(second.structuredContent).toMatchObject({
      generations: [{ taskId: "task_done", status: "success", outputUrls: ["https://example.com/task_done.png"] }]
    });
    expect(second).toMatchObject(first);
  });

  it("hides advanced escape-hatch tools on the default profile", async () => {
    const client = await connect(undefined, "standard");
    const names = (await client.listTools()).tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "kie_create_image",
        "kie_create_video",
        "kie_create_speech",
        "kie_get_creation",
        "kie_upload_media",
        "kie_market_create_task"
      ])
    );
    expect(names).not.toContain("kie_product_api_call");
    expect(names).not.toContain("kie_upload_file_base64");
    expect(names).not.toContain("kie_market_wait_for_task");
    expect(names.length).toBeLessThan(14);
  });

  it("returns machine-readable error categories automated callers can branch on", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 401, msg: "Bad API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
    const client = await connect(fetchImpl);

    const result = await client.callTool({ name: "kie_get_credits", arguments: {} });
    const payload = JSON.parse(firstTextContent(result)) as Record<string, unknown>;

    expect(result.isError).toBe(true);
    expect(payload).toMatchObject({ category: "auth", retryable: false });
    expect(String(payload.nextStep)).toContain("KIE_API_KEY");
  });
});
