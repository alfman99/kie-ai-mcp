import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { apiKeyFromHeaders, createRemoteHandler, TenantRegistry, tenantConfig } from "../src/remote.js";

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

describe("agent-facing upload guidance", () => {
  it("points the agent at KIE's own upload API in the initialize instructions", async () => {
    const baseUrl = await startServer();
    const response = await postMcp(baseUrl, INITIALIZE, { authorization: "Bearer caller-key" });
    const payload = parseSse(await response.text()) as { result: { instructions: string } };

    expect(payload.result.instructions).toContain("https://kieai.redpandaai.co/api/file-stream-upload");
    expect(payload.result.instructions).toContain("-F file=@");
    expect(payload.result.instructions).toContain("cannot read your disk");
    // The relay is not in the path: it has the same key the agent does, so a hop through it buys nothing.
    expect(payload.result.instructions).not.toContain(baseUrl);
  });

  it("answers a local_file attempt with the working command instead of an env var", async () => {
    const baseUrl = await startServer();
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
    expect(text).toContain("https://kieai.redpandaai.co/api/file-stream-upload");
    expect(text).not.toContain("KIE_ALLOW_LOCAL_FILE_UPLOADS");

    // Classified as caller input, so the agent is not told to retry a call that can never succeed.
    const reported = JSON.parse(text) as { category: string; retryable: boolean };
    expect(reported.category).toBe("input");
    expect(reported.retryable).toBe(false);
  });

  it("marks tenants as remote, and leaves a plain stdio config alone", () => {
    expect(tenantConfig(loadConfig(), "caller-key").remoteRelay).toBe(true);
    expect(loadConfig().remoteRelay).toBeUndefined();
  });

  it("has no upload endpoint of its own", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/upload`, { method: "POST" });
    expect(response.status).toBe(404);
  });
});
