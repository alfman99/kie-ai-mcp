import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { buildDocsArtifacts, fetchOfficialText, parseLlmsIndex, syncKieDocs } from "../scripts/kie-docs.js";
import { loadCatalogRegistry } from "../src/registry.js";

const SAMPLE_PAGE = `# Example Image Model

## OpenAPI Specification

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/v1/jobs/createTask:
    post:
      summary: Example Image Model
      operationId: example-image
      description: >-
        The official description may contain a nested example:
          \`\`\`json
          {"status":"ok"}
          \`\`\`
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [model, input]
              properties:
                model:
                  type: string
                  enum: [stale/model]
                input:
                  type: object
                  required: [prompt]
                  properties:
                    prompt:
                      type: string
                      minLength: 3
                      maxLength: 5000
                    " image_url ":
                      type: string
                      format: uri
                    references:
                      type: array
                      maxItems: 3
                      items:
                        type: string
                        format: uri
            example:
              model: example/image
              input:
                prompt: hello
      responses:
        "200":
          description: success
servers:
  - url: https://api.kie.ai
\`\`\`
`;

const SAMPLE_UPLOAD_PAGE = `# URL File Upload

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/file-url-upload:
    post:
      operationId: upload-file-url
      responses:
        "200":
          description: success
servers:
  - url: https://api.kie.ai
\`\`\`

\`\`\`bash
curl --location 'https://kieai.redpandaai.co/api/file-url-upload'
\`\`\`
`;

describe("KIE documentation updater", () => {
  it("discovers only official English Markdown pages from llms.txt", () => {
    const entries = parseLlmsIndex(`
# docs.kie.ai
- [Official](https://docs.kie.ai/market/example.md)
- [Duplicate](https://docs.kie.ai/market/example.md)
- [Chinese](https://docs.kie.ai/cn/market/example.md)
- [Wrong origin](https://example.com/market/example.md)
- [HTML](https://docs.kie.ai/market/example)
`);

    expect(entries).toEqual([{ title: "Official", url: "https://docs.kie.ai/market/example.md" }]);
  });

  it("generates deterministic catalogs and records official schema/example corrections", () => {
    const artifacts = buildDocsArtifacts({
      indexBody: "[Example](https://docs.kie.ai/market/example.md)",
      pages: [
        {
          title: "Example",
          url: "https://docs.kie.ai/market/example.md",
          body: SAMPLE_PAGE
        }
      ],
      generatedAt: "2026-07-30T00:00:00.000Z"
    });
    const registry = JSON.parse(artifacts.files["market_model_registry.json"]) as {
      count: number;
      models: Array<{
        model_values: string[];
        input_fields: Array<{
          name: string;
          minLength: number | null;
          maxLength: number | null;
          maxItems: number | null;
          itemType: string | null;
          itemFormat: string | null;
        }>;
      }>;
    };

    expect(registry.count).toBe(1);
    expect(registry.models[0].model_values).toEqual(["example/image"]);
    expect(registry.models[0].input_fields.map((field) => field.name)).toContain("image_url");
    expect(registry.models[0].input_fields.find((field) => field.name === "prompt")).toMatchObject({
      minLength: 3,
      maxLength: 5000
    });
    expect(registry.models[0].input_fields.find((field) => field.name === "references")).toMatchObject({
      maxItems: 3,
      itemType: "string",
      itemFormat: "uri"
    });
    expect(artifacts.manifest.schemaCorrections).toEqual([
      expect.objectContaining({
        sourceUrl: "https://docs.kie.ai/market/example.md",
        schemaModelValues: ["stale/model"],
        exampleModelValue: "example/image"
      })
    ]);
    expect(
      buildDocsArtifacts({
        indexBody: "[Example](https://docs.kie.ai/market/example.md)",
        pages: [
          {
            title: "Example",
            url: "https://docs.kie.ai/market/example.md",
            body: SAMPLE_PAGE
          }
        ],
        generatedAt: "2026-07-30T00:00:00.000Z"
      }).files
    ).toEqual(artifacts.files);
  });

  it("prefers the official executable upload URL over a conflicting OpenAPI server", () => {
    const artifacts = buildDocsArtifacts({
      indexBody: "[Upload](https://docs.kie.ai/file-upload-api/upload-file-url.md)",
      pages: [
        {
          title: "Upload",
          url: "https://docs.kie.ai/file-upload-api/upload-file-url.md",
          body: SAMPLE_UPLOAD_PAGE
        }
      ],
      generatedAt: "2026-07-30T00:00:00.000Z"
    });
    const catalog = JSON.parse(artifacts.files["openapi_endpoint_catalog.json"]) as {
      endpoints: Array<{ servers: string[] }>;
    };

    expect(catalog.endpoints[0].servers).toEqual(["https://kieai.redpandaai.co"]);
    expect(artifacts.manifest.endpointCorrections).toEqual([
      expect.objectContaining({
        path: "/api/file-url-upload",
        schemaServers: ["https://api.kie.ai"],
        executableServer: "https://kieai.redpandaai.co"
      })
    ]);
  });

  it("rejects redirects away from the official KIE documentation host", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      url: "https://attacker.example/docs.md",
      text: async () => "# Untrusted"
    })) as unknown as typeof fetch;

    await expect(fetchOfficialText(fetchImpl, "https://docs.kie.ai/market/example.md")).rejects.toThrow(
      /redirected outside docs\.kie\.ai/
    );
  });

  it("loads a complete external snapshot and rejects duplicate model identifiers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kie-docs-registry-"));
    const dataDirectory = join(dirname(fileURLToPath(import.meta.url)), "../src/data");
    for (const fileName of [
      "docs_manifest.json",
      "market_model_registry.json",
      "openapi_endpoint_catalog.json",
      "endpoint_index.json"
    ]) {
      await writeFile(join(directory, fileName), await readFile(join(dataDirectory, fileName), "utf8"));
    }

    const external = loadCatalogRegistry(directory);
    expect(external.source).toBe("external");
    expect(external.docsManifest.sourceIndex).toBe("https://docs.kie.ai/llms.txt");

    const registryPath = join(directory, "market_model_registry.json");
    const registry = JSON.parse(await readFile(registryPath, "utf8")) as {
      models: Array<{ model_values: string[] }>;
    };
    registry.models[1].model_values = [...registry.models[0].model_values];
    const modifiedRegistry = `${JSON.stringify(registry)}\n`;
    await writeFile(registryPath, modifiedRegistry);
    const manifestPath = join(directory, "docs_manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      artifactSha256: { market_model_registry: string };
    };
    manifest.artifactSha256.market_model_registry = createHash("sha256").update(modifiedRegistry).digest("hex");
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(() => loadCatalogRegistry(directory)).toThrow(/Duplicate Market model identifier/);
  });

  it("publishes a complete snapshot and preserves it when a later official fetch fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kie-docs-sync-"));
    const outputDirectory = join(directory, "snapshot");
    const pageUrls = Array.from({ length: 25 }, (_, index) => `https://docs.kie.ai/market/example-${index}.md`);
    const indexBody = `# docs.kie.ai\n${pageUrls.map((url, index) => `- [Example ${index}](${url})`).join("\n")}`;
    const response = (url: string, body: string) =>
      ({
        ok: true,
        status: 200,
        statusText: "OK",
        url,
        text: async () => body
      }) as Response;
    const successfulFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return url === "https://docs.kie.ai/llms.txt" ? response(url, indexBody) : response(url, SAMPLE_PAGE);
    }) as unknown as typeof fetch;

    const updated = await syncKieDocs({
      mode: "write",
      fetchImpl: successfulFetch,
      dataDirectory: outputDirectory,
      concurrency: 1,
      now: new Date("2026-07-30T00:00:00.000Z")
    });
    expect(updated.wrote).toBe(true);
    const lastKnownGood = await readFile(join(outputDirectory, "docs_manifest.json"), "utf8");

    const redirectingFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://docs.kie.ai/llms.txt") {
        return response(url, indexBody);
      }
      return url.endsWith("example-13.md")
        ? response("https://attacker.example/replaced.md", "# Untrusted")
        : response(url, SAMPLE_PAGE);
    }) as unknown as typeof fetch;

    await expect(
      syncKieDocs({
        mode: "write",
        fetchImpl: redirectingFetch,
        dataDirectory: outputDirectory,
        concurrency: 1
      })
    ).rejects.toThrow(/redirected outside docs\.kie\.ai/);
    expect(await readFile(join(outputDirectory, "docs_manifest.json"), "utf8")).toBe(lastKnownGood);
  });
});
