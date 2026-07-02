import { describe, expect, it, vi } from "vitest";
import { KieHttpClient } from "../src/http.js";
import type { KieConfig } from "../src/types.js";

const config: KieConfig = {
  apiKey: "test-key",
  apiBaseUrl: "https://api.test",
  uploadBaseUrl: "https://upload.test",
  pollIntervalMs: 1,
  pollTimeoutMs: 100,
  allowLocalFileUploads: true
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("KieHttpClient", () => {
  it("adds bearer auth and serializes JSON requests", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 200, msg: "success", data: 123 })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    const result = await client.requestJson({
      method: "POST",
      path: "/api/v1/common/download-url",
      body: { url: "https://tempfile.example/file.png" }
    });

    expect(result).toEqual({ code: 200, msg: "success", data: 123 });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(String(url)).toBe("https://api.test/api/v1/common/download-url");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json"
    });
    expect(init?.body).toBe(JSON.stringify({ url: "https://tempfile.example/file.png" }));
  });

  it("turns KIE code failures into KieApiError", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 429, msg: "Rate limited", data: null })) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(
      client.requestJson({
        method: "GET",
        path: "/api/v1/chat/credit"
      })
    ).rejects.toMatchObject({
      name: "KieApiError",
      code: 429,
      message: "Rate limited"
    });
  });

  it("fails clearly when a live API tool needs a missing API key", async () => {
    const client = new KieHttpClient({ ...config, apiKey: undefined }, vi.fn() as unknown as typeof fetch);

    await expect(client.requestJson({ path: "/api/v1/chat/credit" })).rejects.toThrow("KIE_API_KEY is required");
  });
});
