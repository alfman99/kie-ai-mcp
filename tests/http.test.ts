import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import process from "node:process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KieHttpClient, parseRetryAfterMs } from "../src/http.js";
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
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

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

  it("streams a local file to KIE with native multipart FormData", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kie-upload-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "image.png");
    await writeFile(filePath, Buffer.from([137, 80, 78, 71]));
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, code: 200, msg: "File uploaded successfully", data: {} })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient({ ...config, localUploadRoot: directory }, fetchImpl);

    await client.uploadFileStream({
      filePath,
      uploadPath: "agent-uploads",
      fileName: "source.png"
    });

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(String(url)).toBe("https://upload.test/api/file-stream-upload");
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("uploadPath")).toBe("agent-uploads");
    expect(body.get("fileName")).toBe("source.png");
    expect((body.get("file") as File).name).toBe("source.png");
  });

  it("rejects local files outside the configured upload root before making a request", async () => {
    const allowedDirectory = await mkdtemp(join(tmpdir(), "kie-allowed-"));
    const outsideDirectory = await mkdtemp(join(tmpdir(), "kie-outside-"));
    temporaryDirectories.push(allowedDirectory, outsideDirectory);
    const outsideFile = join(outsideDirectory, "private.txt");
    await writeFile(outsideFile, "not media");
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const client = new KieHttpClient({ ...config, localUploadRoot: allowedDirectory }, fetchImpl);

    await expect(
      client.uploadFileStream({ filePath: outsideFile, uploadPath: "agent-uploads" })
    ).rejects.toThrow("limited to the configured KIE_LOCAL_UPLOAD_ROOT");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires an absolute configured upload root", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kie-upload-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "image.png");
    await writeFile(filePath, Buffer.from([137, 80, 78, 71]));
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const client = new KieHttpClient({ ...config, localUploadRoot: "relative/media" }, fetchImpl);

    await expect(
      client.uploadFileStream({ filePath, uploadPath: "agent-uploads" })
    ).rejects.toThrow("must be an absolute directory path");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.skipIf(process.platform === "win32")("rejects symlinks that escape the configured upload root", async () => {
    const allowedDirectory = await mkdtemp(join(tmpdir(), "kie-allowed-"));
    const outsideDirectory = await mkdtemp(join(tmpdir(), "kie-outside-"));
    temporaryDirectories.push(allowedDirectory, outsideDirectory);
    const outsideFile = join(outsideDirectory, "private.txt");
    const linkedFile = join(allowedDirectory, "reference.png");
    await writeFile(outsideFile, "not media");
    await symlink(outsideFile, linkedFile);
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const client = new KieHttpClient({ ...config, localUploadRoot: allowedDirectory }, fetchImpl);

    await expect(
      client.uploadFileStream({ filePath: linkedFile, uploadPath: "agent-uploads" })
    ).rejects.toThrow("limited to the configured KIE_LOCAL_UPLOAD_ROOT");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("request pacing", () => {
  it("parses Retry-After in seconds and HTTP-date form", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs("not-a-date")).toBeUndefined();
    const soon = parseRetryAfterMs(new Date(Date.now() + 5000).toUTCString());
    expect(soon).toBeGreaterThan(3000);
  });

  it("surfaces Retry-After on rate-limit errors", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 429, msg: "Too many requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "3" }
        })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(client.requestJson({ path: "/api/v1/jobs/recordInfo" })).rejects.toMatchObject({
      name: "KieApiError",
      status: 429,
      retryAfterMs: 3000
    });
  });

  it("caps simultaneous in-flight requests so parallel batches do not burst", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchImpl = vi.fn(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return new Response(JSON.stringify({ code: 200, msg: "success", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as unknown as typeof fetch;
    const client = new KieHttpClient({ ...config, maxConcurrentRequests: 2 }, fetchImpl);

    await Promise.all(
      Array.from({ length: 8 }, () => client.requestJson({ path: "/api/v1/jobs/recordInfo" }))
    );

    expect(peak).toBe(2);
    expect(vi.mocked(fetchImpl).mock.calls.length).toBe(8);
  });

  it("aborts a request that outlives its own deadline", async () => {
    const fetchImpl = vi.fn(
      (_url: URL | RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true
          });
        })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(config, fetchImpl);

    await expect(client.requestJson({ path: "/api/v1/jobs/recordInfo", timeoutMs: 10 })).rejects.toThrow();
  });

  it("releases queued slots when a caller cancels while waiting", async () => {
    const fetchImpl = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(JSON.stringify({ code: 200, msg: "success", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as unknown as typeof fetch;
    const client = new KieHttpClient({ ...config, maxConcurrentRequests: 1 }, fetchImpl);
    const controller = new AbortController();

    const first = client.requestJson({ path: "/api/v1/jobs/recordInfo" });
    const queued = client.requestJson({ path: "/api/v1/jobs/recordInfo", signal: controller.signal });
    controller.abort();

    await expect(queued).rejects.toThrow("cancelled");
    await expect(first).resolves.toBeTruthy();
    await expect(client.requestJson({ path: "/api/v1/jobs/recordInfo" })).resolves.toBeTruthy();
  });
});

describe("documented generation rate limit", () => {
  const limited: KieConfig = {
    apiKey: "test-key",
    apiBaseUrl: "https://api.test",
    uploadBaseUrl: "https://upload.test",
    pollIntervalMs: 1,
    pollTimeoutMs: 1000,
    allowLocalFileUploads: false,
    generationRateLimit: 3,
    generationRateWindowMs: 150,
    generationMaxRetries: 2
  };

  function ok(): Response {
    return new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "t" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  it("holds new generation requests back instead of spending them on a guaranteed rejection", async () => {
    const fetchImpl = vi.fn(async () => ok()) as unknown as typeof fetch;
    const client = new KieHttpClient(limited, fetchImpl);

    const inFlight = Array.from({ length: 5 }, () =>
      client.requestJson({ method: "POST", path: "/api/v1/jobs/createTask", body: {}, rateLimitClass: "generation" })
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Only the window's worth of submissions may leave; the rest wait for a slot.
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(3);

    // ...and then they are sent, rather than being dropped.
    await Promise.all(inFlight);
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(5);
  });

  it("does not meter status reads against the generation budget", async () => {
    const fetchImpl = vi.fn(async () => ok()) as unknown as typeof fetch;
    const client = new KieHttpClient(limited, fetchImpl);

    await Promise.all(
      Array.from({ length: 8 }, () => client.requestJson({ method: "GET", path: "/api/v1/jobs/recordInfo" }))
    );

    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(8);
  });

  it("re-sends a submission KIE refused with 429, honouring Retry-After", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 429, msg: "Rate limit exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "0" }
        })
      )
      .mockResolvedValueOnce(ok()) as unknown as typeof fetch;
    const client = new KieHttpClient(limited, fetchImpl);

    await expect(
      client.requestJson({ method: "POST", path: "/api/v1/jobs/createTask", body: {}, rateLimitClass: "generation" })
    ).resolves.toMatchObject({ code: 200 });
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(2);
  });

  it("never re-sends a submission that failed for any other reason", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 402, msg: "Insufficient credits" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    ) as unknown as typeof fetch;
    const client = new KieHttpClient(limited, fetchImpl);

    await expect(
      client.requestJson({ method: "POST", path: "/api/v1/jobs/createTask", body: {}, rateLimitClass: "generation" })
    ).rejects.toMatchObject({ code: 402 });
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(1);
  });
});
