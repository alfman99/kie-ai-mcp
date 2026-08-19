import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import {
  apiKeyFromHeaders,
  createRemoteHandler,
  MAX_UPLOAD_BYTES,
  multipartBoundary,
  publicBaseUrl,
  TenantRegistry,
  tenantConfig
} from "../src/remote.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

async function startServer(options: Parameters<typeof createRemoteHandler>[0] = {}): Promise<string> {
  const handler = createRemoteHandler(options);
  const server = createServer((req, res) => void handler(req, res));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0" }
  }
};

async function postMcp(baseUrl: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

/** The transport answers over SSE; pull the single JSON-RPC payload back out of the event stream. */
function parseSse(text: string): unknown {
  const line = text
    .split("\n")
    .find((entry) => entry.startsWith("data:"));
  return JSON.parse((line ?? text).replace(/^data:\s*/, ""));
}

describe("apiKeyFromHeaders", () => {
  it("reads a bearer token", () => {
    expect(apiKeyFromHeaders({ authorization: "Bearer secret-key" })).toBe("secret-key");
  });

  it("reads the explicit header", () => {
    expect(apiKeyFromHeaders({ "x-kie-api-key": "  other-key  " })).toBe("other-key");
  });

  it("returns undefined when no key is present", () => {
    expect(apiKeyFromHeaders({ authorization: "Basic abc" })).toBeUndefined();
  });
});

describe("tenantConfig", () => {
  it("applies the caller key and disables local filesystem access", () => {
    const base = { ...loadConfig(), allowLocalFileUploads: true, localUploadRoot: "/srv/uploads" };
    const scoped = tenantConfig(base, "caller-key");

    expect(scoped.apiKey).toBe("caller-key");
    expect(scoped.allowLocalFileUploads).toBe(false);
    expect(scoped.localUploadRoot).toBeUndefined();
  });
});

describe("TenantRegistry", () => {
  it("reuses one store per key and separates distinct keys", () => {
    const registry = new TenantRegistry(loadConfig());

    expect(registry.storeFor("a")).toBe(registry.storeFor("a"));
    expect(registry.storeFor("a")).not.toBe(registry.storeFor("b"));
    expect(registry.size).toBe(2);
  });
});

describe("createRemoteHandler", () => {
  it("serves a human-facing landing page at the root", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/html/);
    // The two things a first-time visitor must not miss.
    expect(body).toContain("Unofficial project");
    expect(body).toContain("/mcp");
    expect(body).toContain("github.com/alfman99/kie-ai-mcp");
  });

  it("answers HEAD on the landing page without a body", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/`, { method: "HEAD" });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("does not expose the landing page as an MCP endpoint", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/`, { method: "POST" });

    expect(response.status).toBe(404);
  });

  it("serves a health check", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("rejects a request with no API key", async () => {
    const baseUrl = await startServer({ config: { ...loadConfig(), apiKey: undefined } });
    const response = await postMcp(baseUrl, INITIALIZE);

    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toContain("Missing KIE API key");
  });

  it("rejects a request without the access token when one is configured", async () => {
    const baseUrl = await startServer({ accessToken: "gate" });
    const response = await postMcp(baseUrl, INITIALIZE, { authorization: "Bearer k" });

    expect(response.status).toBe(401);
  });

  it("completes a handshake and lists tools for a caller-supplied key", async () => {
    const baseUrl = await startServer({ config: { ...loadConfig(), apiKey: undefined } });

    const initialize = await postMcp(baseUrl, INITIALIZE, { authorization: "Bearer caller-key" });
    expect(initialize.status).toBe(200);
    expect(parseSse(await initialize.text())).toMatchObject({
      result: { serverInfo: { name: "kie-ai-mcp" } }
    });

    const tools = await postMcp(
      baseUrl,
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { authorization: "Bearer caller-key" }
    );
    const payload = parseSse(await tools.text()) as { result: { tools: Array<{ name: string }> } };
    expect(payload.result.tools.map((tool) => tool.name)).toContain("kie_create_image");
  });

  it("rejects GET on the MCP endpoint because the deployment is stateless", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/mcp`);

    expect(response.status).toBe(405);
  });
});

describe("multipartBoundary", () => {
  it("reads a bare and a quoted boundary", () => {
    expect(multipartBoundary("multipart/form-data; boundary=abc123")).toBe("abc123");
    expect(multipartBoundary('multipart/form-data; boundary="a b c"')).toBe("a b c");
  });

  it("ignores other content types", () => {
    expect(multipartBoundary("application/json")).toBeUndefined();
    expect(multipartBoundary(undefined)).toBeUndefined();
  });
});

describe("POST /upload", () => {
  function multipartBody(boundary: string, fileContent: string): string {
    return [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="cat.png"',
      "Content-Type: image/png",
      "",
      fileContent,
      `--${boundary}--`,
      ""
    ].join("\r\n");
  }

  async function upload(
    baseUrl: string,
    { query = "", headers = {}, boundary = "testboundary", body }: {
      query?: string;
      headers?: Record<string, string>;
      boundary?: string;
      body?: string;
    } = {}
  ): Promise<Response> {
    return fetch(`${baseUrl}/upload${query}`, {
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        authorization: "Bearer caller-key",
        ...headers
      },
      body: body ?? multipartBody(boundary, "PNGBYTES")
    });
  }

  it("forwards the body to KIE under the caller's own key and injects uploadPath", async () => {
    const seen: { url: string; auth?: string; contentType?: string; body: string }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({
        url: String(input),
        auth: headers.get("authorization") ?? undefined,
        contentType: headers.get("content-type") ?? undefined,
        body: await new Response(init?.body as BodyInit).text()
      });
      return new Response(JSON.stringify({ code: 200, data: { fileUrl: "https://kie/file.png" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as unknown as typeof fetch;

    const baseUrl = await startServer({ fetchImpl });
    const response = await upload(baseUrl);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: { fileUrl: "https://kie/file.png" } });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toContain("/api/file-stream-upload");
    expect(seen[0]?.auth).toBe("Bearer caller-key");
    expect(seen[0]?.contentType).toBe("multipart/form-data; boundary=testboundary");
    // The injected field precedes the caller's untouched part.
    expect(seen[0]?.body).toContain('name="uploadPath"\r\n\r\nagent-uploads');
    expect(seen[0]?.body).toContain("PNGBYTES");
    expect(seen[0]?.body.indexOf("uploadPath")).toBeLessThan(seen[0]!.body.indexOf("PNGBYTES"));
  });

  it("produces a body a real multipart parser reads back correctly", async () => {
    let parsed: FormData | undefined;
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      // Round-trip through the platform parser, not a substring check: this is the only proof that
      // prepending parts to the caller's stream yields a document KIE can actually read.
      parsed = await new Response(init?.body as BodyInit, {
        headers: { "content-type": new Headers(init?.headers).get("content-type") ?? "" }
      }).formData();
      return new Response(JSON.stringify({ code: 200, data: {} }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as unknown as typeof fetch;

    const baseUrl = await startServer({ fetchImpl });
    await upload(baseUrl, { query: "?uploadPath=refs/shots&fileName=hero.png" });

    expect(parsed?.get("uploadPath")).toBe("refs/shots");
    expect(parsed?.get("fileName")).toBe("hero.png");
    const file = parsed?.get("file") as File;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("cat.png");
    expect(file.type).toBe("image/png");
    await expect(file.text()).resolves.toBe("PNGBYTES");
  });

  it("injects a fileName only when one is supplied", async () => {
    let forwarded = "";
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = await new Response(init?.body as BodyInit).text();
      return new Response(JSON.stringify({ code: 200, data: {} }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as unknown as typeof fetch;

    const baseUrl = await startServer({ fetchImpl });
    await upload(baseUrl, { query: "?uploadPath=refs/shots&fileName=hero.png" });

    expect(forwarded).toContain('name="uploadPath"\r\n\r\nrefs/shots');
    expect(forwarded).toContain('name="fileName"\r\n\r\nhero.png');
  });

  it("rejects a request without an API key", async () => {
    const baseUrl = await startServer();
    const response = await upload(baseUrl, { headers: { authorization: "" } });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("Missing KIE API key") });
  });

  it("honours the relay access token", async () => {
    const baseUrl = await startServer({ accessToken: "gate" });
    expect((await upload(baseUrl)).status).toBe(401);
    expect((await upload(baseUrl, { headers: { "x-kie-access-token": "gate" } })).status).not.toBe(401);
  });

  it("rejects a traversing uploadPath", async () => {
    const baseUrl = await startServer();
    const response = await upload(baseUrl, { query: "?uploadPath=../escape" });
    expect(response.status).toBe(400);
  });

  it("rejects a fileName that could break out of the header", async () => {
    const baseUrl = await startServer();
    const response = await upload(baseUrl, { query: '?fileName=a"b' });
    expect(response.status).toBe(400);
  });

  it("explains itself when the body is not multipart", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer caller-key" },
      body: "{}"
    });
    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("curl -X POST") });
  });

  it("defaults the limit to KIE's own ceiling", () => {
    expect(MAX_UPLOAD_BYTES).toBe(100 * 1024 * 1024);
  });

  it("refuses a body that declares more than the size limit before forwarding it", async () => {
    let forwardCount = 0;
    const fetchImpl = (async () => {
      forwardCount += 1;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    const baseUrl = await startServer({ fetchImpl, maxUploadBytes: 16 });
    const response = await upload(baseUrl);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("limit") });
    expect(forwardCount).toBe(0);
  });

  it("cuts off a chunked body that never declared its size", async () => {
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      // Draining the stream is what trips the byte counter.
      await new Response(init?.body as BodyInit).text();
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    const baseUrl = await startServer({ fetchImpl, maxUploadBytes: 16 });
    // A ReadableStream body makes undici send it chunked, with no content-length to pre-check.
    const boundary = "testboundary";
    const chunked = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(multipartBody(boundary, "X".repeat(4096))));
        controller.close();
      }
    });
    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        authorization: "Bearer caller-key"
      },
      body: chunked,
      duplex: "half"
    } as RequestInit).catch(() => undefined);

    // Either the relay answered 413 or it tore the connection down mid-stream; both refuse the file.
    expect(response === undefined || response.status === 413).toBe(true);
  });

  it("answers 405 for a GET", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/upload`);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
});

describe("publicBaseUrl", () => {
  it("prefers an explicit override", () => {
    expect(publicBaseUrl({ headers: { host: "internal:3000" } } as never, "https://kie.example.com/")).toBe(
      "https://kie.example.com"
    );
  });

  it("reads proxy headers, then falls back to the host", () => {
    expect(
      publicBaseUrl({
        headers: { host: "internal:3000", "x-forwarded-host": "kie.example.com", "x-forwarded-proto": "https,http" }
      } as never)
    ).toBe("https://kie.example.com");
    expect(publicBaseUrl({ headers: { host: "127.0.0.1:8080" } } as never)).toBe("http://127.0.0.1:8080");
    expect(publicBaseUrl({ headers: {} } as never)).toBeUndefined();
  });
});

describe("agent-facing upload guidance", () => {
  it("tells the agent where to POST files in the initialize instructions", async () => {
    const baseUrl = await startServer({ publicUrl: "https://kie.example.com" });
    const response = await postMcp(baseUrl, INITIALIZE, { authorization: "Bearer caller-key" });
    const payload = parseSse(await response.text()) as { result: { instructions: string } };

    expect(payload.result.instructions).toContain("https://kie.example.com/upload");
    expect(payload.result.instructions).toContain("-F file=@");
    expect(payload.result.instructions).toContain("cannot read your disk");
  });

  it("answers a local_file attempt with the working command instead of an env var", async () => {
    const baseUrl = await startServer({ publicUrl: "https://kie.example.com" });
    const headers = { authorization: "Bearer caller-key" };
    await postMcp(baseUrl, INITIALIZE, headers);
    const response = await postMcp(
      baseUrl,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "kie_upload_media", arguments: { sourceType: "local_file", source: "/etc/passwd" } }
      },
      headers
    );
    const payload = parseSse(await response.text()) as {
      result: { isError?: boolean; content: { text: string }[] };
    };

    expect(payload.result.isError).toBe(true);
    const text = payload.result.content.map((entry) => entry.text).join(" ");
    expect(text).toContain("https://kie.example.com/upload");
    expect(text).not.toContain("KIE_ALLOW_LOCAL_FILE_UPLOADS");

    // Classified as caller input, so the agent is not told to retry a call that can never succeed.
    const reported = JSON.parse(text) as { category: string; retryable: boolean };
    expect(reported.category).toBe("input");
    expect(reported.retryable).toBe(false);
  });

  it("derives the endpoint from the live request when no override is configured", async () => {
    const baseUrl = await startServer();
    const response = await postMcp(baseUrl, INITIALIZE, { authorization: "Bearer caller-key" });
    const payload = parseSse(await response.text()) as { result: { instructions: string } };
    expect(payload.result.instructions).toContain(`${baseUrl}/upload`);
  });

  it("leaves the guidance out entirely when there is no ingest endpoint, as over stdio", () => {
    expect(tenantConfig(loadConfig(), "caller-key").uploadIngestUrl).toBeUndefined();
  });
});
