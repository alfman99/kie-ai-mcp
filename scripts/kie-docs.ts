import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

export const KIE_DOCS_ORIGIN = "https://docs.kie.ai";
export const KIE_DOCS_INDEX_URL = `${KIE_DOCS_ORIGIN}/llms.txt`;
export const KIE_NATIVE_UPLOAD_ORIGIN = "https://kieai.redpandaai.co";

const DATA_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), "../src/data");
const KIE_NATIVE_UPLOAD_PATHS = new Set([
  "/api/file-url-upload",
  "/api/file-base64-upload",
  "/api/file-stream-upload"
]);
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"] as const;
const OUTPUT_FILES = [
  "docs_manifest.json",
  "openapi_endpoint_catalog.json",
  "market_model_registry.json",
  "endpoint_index.json",
  "ANALYSIS.md",
  "OPENAPI_CATALOG.md",
  "MARKET_MODEL_REGISTRY.md",
  "ENDPOINT_INDEX.md"
] as const;

type JsonRecord = Record<string, unknown>;

export type DocsIndexEntry = {
  title: string;
  url: string;
};

export type FetchedDocPage = DocsIndexEntry & {
  body: string;
};

export type DocsManifest = {
  schemaVersion: number;
  generatedAt: string;
  sourceIndex: string;
  sourceHost: string;
  indexSha256: string;
  contentSha256: string;
  pageCount: number;
  openapiPageCount: number;
  operationCount: number;
  endpointPathCount: number;
  marketModelCount: number;
  failures: number;
  artifactSha256: {
    openapi_endpoint_catalog: string;
    market_model_registry: string;
    endpoint_index: string;
  };
  schemaCorrections: Array<{
    sourceUrl: string;
    schemaModelValues: string[];
    exampleModelValue: string;
    reason: string;
  }>;
  endpointCorrections: Array<{
    sourceUrl: string;
    path: string;
    schemaServers: string[];
    executableServer: string;
    reason: string;
  }>;
};

export type DocsArtifacts = {
  manifest: DocsManifest;
  files: Record<(typeof OUTPUT_FILES)[number], string>;
};

type NormalizedEndpoint = {
  source_title: string;
  source_url: string;
  source_file: string;
  servers: string[];
  method: string;
  path: string;
  summary: string | null;
  operationId: string | null;
  tags: string[];
  parameters: unknown[];
  request: Record<string, { schema: unknown; example: unknown; examples: unknown }>;
  responses: Record<string, { description: string | null; content_types: string[] }>;
  security: unknown[];
};

type MarketModelField = {
  name: string;
  required: boolean;
  type: string | null;
  format: string | null;
  enum: unknown[] | null;
  default: unknown;
  description: string | null;
  minimum: number | null;
  maximum: number | null;
  exclusiveMinimum: number | null;
  exclusiveMaximum: number | null;
  minLength: number | null;
  maxLength: number | null;
  pattern: string | null;
  minItems: number | null;
  maxItems: number | null;
  uniqueItems: boolean | null;
  itemType: string | null;
  itemFormat: string | null;
  itemEnum: unknown[] | null;
};

type MarketModelRecord = {
  title: string;
  summary: string | null;
  operationId: string | null;
  model_values: string[];
  request_required: string[];
  input_fields: MarketModelField[];
  source_url: string;
  source_file: string;
};

type SchemaCorrection = DocsManifest["schemaCorrections"][number];
type EndpointCorrection = DocsManifest["endpointCorrections"][number];

type ParsedPage = FetchedDocPage & {
  spec?: JsonRecord;
};

type SyncOptions = {
  mode: "check" | "write";
  fetchImpl?: typeof fetch;
  dataDirectory?: string;
  now?: Date;
  concurrency?: number;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function officialMarkdownUrl(rawUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" || url.hostname !== "docs.kie.ai" || !url.pathname.endsWith(".md")) {
    return undefined;
  }

  if (url.pathname === "/cn.md" || url.pathname.startsWith("/cn/")) {
    return undefined;
  }

  url.hash = "";
  return url.href;
}

export function parseLlmsIndex(body: string): DocsIndexEntry[] {
  const entries = new Map<string, DocsIndexEntry>();
  const linkPattern = /\[([^\]]+)]\((https:\/\/docs\.kie\.ai\/[^)\s]+)\)/g;

  for (const match of body.matchAll(linkPattern)) {
    const url = officialMarkdownUrl(match[2]);
    if (!url || entries.has(url)) {
      continue;
    }
    entries.set(url, {
      title: match[1].trim(),
      url
    });
  }

  return [...entries.values()];
}

function extractTitle(body: string, fallback: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function extractOpenApiYaml(body: string): string | undefined {
  const fences = body.matchAll(/^```ya?ml[^\S\r\n]*\r?\n([\s\S]*?)^```[^\S\r\n]*$/gim);
  for (const fence of fences) {
    const candidate = fence[1].trim();
    if (/^openapi\s*:/m.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function parseOpenApiPage(page: FetchedDocPage): ParsedPage {
  const yaml = extractOpenApiYaml(page.body);
  if (!yaml) {
    return page;
  }

  const parsed = parseYaml(yaml, {
    maxAliasCount: 1000,
    prettyErrors: true,
    strict: true
  });
  if (!isRecord(parsed) || !isRecord(parsed.paths)) {
    throw new Error(`Official OpenAPI block has no paths object: ${page.url}`);
  }

  return {
    ...page,
    title: extractTitle(page.body, page.title),
    spec: parsed
  };
}

function resolveLocalRef(spec: JsonRecord, value: unknown, seen = new Set<string>()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveLocalRef(spec, item, new Set(seen)));
  }
  if (!isRecord(value)) {
    return value;
  }

  const ref = asString(value.$ref);
  if (!ref?.startsWith("#/")) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveLocalRef(spec, item, new Set(seen))]));
  }
  if (seen.has(ref)) {
    return value;
  }

  const target = ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => (isRecord(current) ? current[segment] : undefined), spec);

  if (!isRecord(target)) {
    return value;
  }

  const nextSeen = new Set(seen);
  nextSeen.add(ref);
  const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$ref"));
  return resolveLocalRef(spec, { ...target, ...siblings }, nextSeen);
}

function operationServers(spec: JsonRecord, pathItem: JsonRecord, operation: JsonRecord): string[] {
  for (const candidate of [operation.servers, pathItem.servers, spec.servers]) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    const urls = candidate.map((item) => asString(asRecord(item).url)).filter((item): item is string => Boolean(item));
    if (urls.length > 0) {
      return [...new Set(urls)];
    }
  }
  return [];
}

function executableServersFromPage(page: ParsedPage, path: string): string[] {
  if (
    new URL(page.url).pathname.startsWith("/file-upload-api/") &&
    KIE_NATIVE_UPLOAD_PATHS.has(path)
  ) {
    return [KIE_NATIVE_UPLOAD_ORIGIN];
  }

  const servers = new Set<string>();
  const urlPattern = /https:\/\/[A-Za-z0-9.-]+\/[^\s'"`\\)>]+/g;
  for (const match of page.body.matchAll(urlPattern)) {
    try {
      const url = new URL(match[0]);
      if (
        url.pathname === path &&
        (url.hostname === "api.kie.ai" || url.hostname === "kieai.redpandaai.co")
      ) {
        servers.add(url.origin);
      }
    } catch {
      // Ignore malformed prose examples. Parsed OpenAPI data remains available.
    }
  }
  return [...servers];
}

function effectiveOperationServers(
  page: ParsedPage,
  path: string,
  pathItem: JsonRecord,
  operation: JsonRecord
): { servers: string[]; correction?: EndpointCorrection } {
  const schemaServers = operationServers(page.spec ?? {}, pathItem, operation);
  const executableServers = executableServersFromPage(page, path);
  if (executableServers.length !== 1 || schemaServers.includes(executableServers[0])) {
    return { servers: schemaServers };
  }

  return {
    servers: executableServers,
    correction: {
      sourceUrl: page.url,
      path,
      schemaServers,
      executableServer: executableServers[0],
      reason:
        "The official executable endpoint and request example conflict with the OpenAPI servers list; the executable URL takes precedence."
    }
  };
}

function normalizeRequest(operation: JsonRecord): NormalizedEndpoint["request"] {
  const content = asRecord(asRecord(operation.requestBody).content);
  return Object.fromEntries(
    Object.entries(content).map(([contentType, media]) => {
      const mediaRecord = asRecord(media);
      return [
        contentType,
        {
          schema: mediaRecord.schema ?? null,
          example: mediaRecord.example ?? null,
          examples: mediaRecord.examples ?? null
        }
      ];
    })
  );
}

function normalizeResponses(operation: JsonRecord): NormalizedEndpoint["responses"] {
  return Object.fromEntries(
    Object.entries(asRecord(operation.responses)).map(([status, response]) => {
      const responseRecord = asRecord(response);
      return [
        status,
        {
          description: asString(responseRecord.description) ?? null,
          content_types: Object.keys(asRecord(responseRecord.content))
        }
      ];
    })
  );
}

function normalizeEndpoints(page: ParsedPage, corrections: EndpointCorrection[]): NormalizedEndpoint[] {
  if (!page.spec) {
    return [];
  }

  const endpoints: NormalizedEndpoint[] = [];
  for (const [path, rawPathItem] of Object.entries(asRecord(page.spec.paths))) {
    const pathItem = asRecord(rawPathItem);
    for (const method of HTTP_METHODS) {
      if (!isRecord(pathItem[method])) {
        continue;
      }
      const operation = pathItem[method] as JsonRecord;
      const effectiveServers = effectiveOperationServers(page, path, pathItem, operation);
      if (effectiveServers.correction) {
        corrections.push(effectiveServers.correction);
      }
      endpoints.push({
        source_title: page.title,
        source_url: page.url,
        source_file: new URL(page.url).pathname,
        servers: effectiveServers.servers,
        method: method.toUpperCase(),
        path,
        summary: asString(operation.summary) ?? null,
        operationId: asString(operation.operationId) ?? null,
        tags: asStringArray(operation.tags),
        parameters: Array.isArray(operation.parameters) ? operation.parameters : [],
        request: normalizeRequest(operation),
        responses: normalizeResponses(operation),
        security: Array.isArray(operation.security) ? operation.security : []
      });
    }
  }
  return endpoints;
}

function requestJsonSchema(spec: JsonRecord, operation: JsonRecord): JsonRecord {
  const requestBody = asRecord(resolveLocalRef(spec, operation.requestBody));
  const content = asRecord(requestBody.content);
  const media = asRecord(content["application/json"] ?? Object.values(content)[0]);
  return asRecord(resolveLocalRef(spec, media.schema));
}

function requestJsonMedia(operation: JsonRecord): JsonRecord {
  const requestBody = asRecord(operation.requestBody);
  const content = asRecord(requestBody.content);
  return asRecord(content["application/json"] ?? Object.values(content)[0]);
}

function requestExampleModel(operation: JsonRecord): string | undefined {
  const example = requestJsonMedia(operation).example;
  if (isRecord(example)) {
    return asString(example.model)?.trim();
  }
  if (typeof example === "string") {
    return example.match(/["']?model["']?\s*:\s*["']([^"']+)["']/)?.[1]?.trim();
  }
  return undefined;
}

function collectModelValues(modelSchema: JsonRecord): string[] {
  const values: unknown[] = [];
  if (Array.isArray(modelSchema.enum)) {
    values.push(...modelSchema.enum);
  }
  if (modelSchema.const !== undefined) {
    values.push(modelSchema.const);
  }
  if (modelSchema.default !== undefined) {
    values.push(modelSchema.default);
  }
  if (Array.isArray(modelSchema.examples)) {
    values.push(...modelSchema.examples);
  }
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ];
}

function normalizeMarketModel(
  page: ParsedPage,
  operation: JsonRecord
): { record?: MarketModelRecord; correction?: SchemaCorrection } {
  if (!page.spec) {
    return {};
  }

  const requestSchema = requestJsonSchema(page.spec, operation);
  const requestProperties = asRecord(requestSchema.properties);
  const modelSchema = asRecord(resolveLocalRef(page.spec, requestProperties.model));
  const inputSchema = asRecord(resolveLocalRef(page.spec, requestProperties.input));
  const schemaModelValues = collectModelValues(modelSchema);
  const exampleModelValue = requestExampleModel(operation);
  const modelValues = exampleModelValue ? [exampleModelValue] : schemaModelValues;
  if (modelValues.length === 0) {
    return {};
  }

  const inputProperties = asRecord(inputSchema.properties);
  const inputRequired = new Set(asStringArray(inputSchema.required));
  const fieldsByName = new Map<string, MarketModelField>();
  for (const [rawName, rawField] of Object.entries(inputProperties)) {
    const name = rawName.trim();
    if (name.length === 0) {
      throw new Error(`Empty input field name in official schema: ${page.url}`);
    }
    if (fieldsByName.has(name)) {
      throw new Error(`Input field collision after trimming "${rawName}" in official schema: ${page.url}`);
    }
      const field = asRecord(resolveLocalRef(page.spec!, rawField));
      const items = asRecord(resolveLocalRef(page.spec!, field.items));
      fieldsByName.set(name, {
        name,
        required: inputRequired.has(rawName) || inputRequired.has(name),
        type: asString(field.type) ?? null,
        format: asString(field.format) ?? null,
        enum: Array.isArray(field.enum) ? field.enum : null,
        default: field.default ?? null,
        description: asString(field.description) ?? null,
        minimum: asFiniteNumber(field.minimum) ?? null,
        maximum: asFiniteNumber(field.maximum) ?? null,
        exclusiveMinimum: asFiniteNumber(field.exclusiveMinimum) ?? null,
        exclusiveMaximum: asFiniteNumber(field.exclusiveMaximum) ?? null,
        minLength: asFiniteNumber(field.minLength) ?? null,
        maxLength: asFiniteNumber(field.maxLength) ?? null,
        pattern: asString(field.pattern) ?? null,
        minItems: asFiniteNumber(field.minItems) ?? null,
        maxItems: asFiniteNumber(field.maxItems) ?? null,
        uniqueItems: asBoolean(field.uniqueItems) ?? null,
        itemType: asString(items.type) ?? null,
        itemFormat: asString(items.format) ?? null,
        itemEnum: Array.isArray(items.enum) ? items.enum : null
      });
  }
  const fields = [...fieldsByName.values()]
    .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));

  return {
    record: {
      title: page.title,
      summary: asString(operation.summary) ?? null,
      operationId: asString(operation.operationId) ?? null,
      model_values: modelValues,
      request_required: asStringArray(requestSchema.required),
      input_fields: fields,
      source_url: page.url,
      source_file: new URL(page.url).pathname
    },
    correction:
      exampleModelValue && schemaModelValues.length > 0 && !schemaModelValues.includes(exampleModelValue)
        ? {
            sourceUrl: page.url,
            schemaModelValues,
            exampleModelValue,
            reason: "The official request example conflicts with the model schema; the executable request example takes precedence."
          }
        : undefined
  };
}

function extractMarketModels(pages: ParsedPage[]): { models: MarketModelRecord[]; corrections: SchemaCorrection[] } {
  const records: MarketModelRecord[] = [];
  const byModel = new Map<string, MarketModelRecord>();
  const corrections: SchemaCorrection[] = [];

  for (const page of pages) {
    if (!page.spec) {
      continue;
    }
    if (!new URL(page.url).pathname.startsWith("/market/")) {
      continue;
    }
    const pathItem = asRecord(asRecord(page.spec.paths)["/api/v1/jobs/createTask"]);
    const operation = asRecord(pathItem.post);
    if (Object.keys(operation).length === 0) {
      continue;
    }
    const normalized = normalizeMarketModel(page, operation);
    const record = normalized.record;
    if (!record) {
      continue;
    }
    if (normalized.correction) {
      corrections.push(normalized.correction);
    }

    let shouldAdd = true;
    for (const model of record.model_values) {
      const prior = byModel.get(model);
      if (!prior) {
        continue;
      }
      const priorSchema = JSON.stringify({
        required: prior.request_required,
        input: prior.input_fields
      });
      const nextSchema = JSON.stringify({
        required: record.request_required,
        input: record.input_fields
      });
      if (priorSchema !== nextSchema) {
        throw new Error(
          `Conflicting official schemas for model "${model}": ${prior.source_url} and ${record.source_url}`
        );
      }
      shouldAdd = false;
    }
    if (shouldAdd) {
      records.push(record);
      for (const model of record.model_values) {
        byModel.set(model, record);
      }
    }
  }

  return {
    models: records.sort((a, b) => (a.model_values[0] ?? a.title).localeCompare(b.model_values[0] ?? b.title)),
    corrections
  };
}

function endpointMentions(pages: ParsedPage[], endpoints: NormalizedEndpoint[]): {
  endpoints: Array<{ method: string; path: string; title: string; url: string; file: string }>;
  by_path: Record<string, Array<{ method: string; path: string; title: string; url: string; file: string }>>;
} {
  const mentions = new Map<string, { method: string; path: string; title: string; url: string; file: string }>();
  for (const endpoint of endpoints) {
    const mention = {
      method: endpoint.method,
      path: endpoint.path,
      title: endpoint.source_title,
      url: endpoint.source_url,
      file: endpoint.source_file
    };
    mentions.set(`${mention.method}\0${mention.path}\0${mention.url}`, mention);
  }

  const knownSourcePaths = new Set(
    [...mentions.values()].map((mention) => `${mention.path}\0${mention.url}`)
  );
  const apiPathPattern = /\/api\/[A-Za-z0-9._~!$&'()*+,;=:@%{}[\]/-]+/g;
  for (const page of pages) {
    for (const match of page.body.matchAll(apiPathPattern)) {
      const path = match[0].replace(/[),.;:'"`]+$/g, "");
      const sourcePathKey = `${path}\0${page.url}`;
      const key = `\0${path}\0${page.url}`;
      if (!knownSourcePaths.has(sourcePathKey)) {
        mentions.set(key, {
          method: "",
          path,
          title: page.title,
          url: page.url,
          file: new URL(page.url).pathname
        });
        knownSourcePaths.add(sourcePathKey);
      }
    }
  }

  const list = [...mentions.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method) || a.url.localeCompare(b.url));
  const byPath: Record<string, typeof list> = {};
  for (const mention of list) {
    (byPath[mention.path] ??= []).push(mention);
  }
  return { endpoints: list, by_path: byPath };
}

function catalogByPath(endpoints: NormalizedEndpoint[]): Record<string, Array<Record<string, unknown>>> {
  const byPath: Record<string, Array<Record<string, unknown>>> = {};
  for (const endpoint of endpoints) {
    (byPath[endpoint.path] ??= []).push({
      method: endpoint.method,
      summary: endpoint.summary,
      operationId: endpoint.operationId,
      source_url: endpoint.source_url,
      servers: endpoint.servers
    });
  }
  return byPath;
}

function markdownLink(label: string, url: string): string {
  return `[${label.replaceAll("|", "\\|")}](<${url}>)`;
}

function renderAnalysis(manifest: DocsManifest): string {
  return `# KIE.AI MCP Server Documentation Snapshot

This bundle was generated exclusively from the official KIE documentation index at ${KIE_DOCS_INDEX_URL}.

## Snapshot

- Generated: ${manifest.generatedAt}
- Official English pages fetched: ${manifest.pageCount}
- Pages with OpenAPI specifications: ${manifest.openapiPageCount}
- OpenAPI operations: ${manifest.operationCount}
- Unique documented API paths: ${manifest.endpointPathCount}
- Unified Market model schemas: ${manifest.marketModelCount}
- Fetch or parse failures: ${manifest.failures}
- Official schema/example conflicts resolved transparently: ${manifest.schemaCorrections.length}
- Official endpoint/server conflicts resolved transparently: ${manifest.endpointCorrections.length}

## Trust Boundary

- Accept only HTTPS pages whose hostname is exactly \`docs.kie.ai\`.
- Use \`${KIE_DOCS_INDEX_URL}\` as the page allowlist.
- Reject redirects away from \`docs.kie.ai\`.
- Abort without writing when any allowlisted page fails to fetch or parse.
- Write the full artifact set atomically only after validation succeeds.

Run \`npm run docs:check\` to detect drift and \`npm run docs:update\` to refresh this snapshot.
`;
}

function renderOpenApiCatalog(endpoints: NormalizedEndpoint[], generatedAt: string): string {
  const rows = endpoints.map(
    (endpoint) =>
      `| ${endpoint.method} | \`${endpoint.path.replaceAll("|", "\\|")}\` | ${endpoint.operationId ?? ""} | ${markdownLink(endpoint.source_title, endpoint.source_url)} |`
  );
  return `# KIE.AI OpenAPI Catalog

Generated ${generatedAt} from official \`docs.kie.ai\` Markdown pages.

| Method | Path | Operation ID | Official source |
| --- | --- | --- | --- |
${rows.join("\n")}
`;
}

function renderMarketRegistry(models: MarketModelRecord[], generatedAt: string): string {
  const rows = models.flatMap((model) =>
    model.model_values.map(
      (value) =>
        `| \`${value.replaceAll("|", "\\|")}\` | ${model.input_fields
          .filter((field) => field.required)
          .map((field) => `\`${field.name}\``)
          .join(", ")} | ${markdownLink(model.title, model.source_url)} |`
    )
  );
  return `# KIE.AI Market Model Registry

Generated ${generatedAt} from official \`docs.kie.ai\` OpenAPI schemas for \`POST /api/v1/jobs/createTask\`.

| Model | Required input | Official source |
| --- | --- | --- |
${rows.join("\n")}
`;
}

function renderEndpointIndex(
  byPath: Record<string, Array<{ method: string; path: string; title: string; url: string; file: string }>>,
  generatedAt: string
): string {
  const sections = Object.entries(byPath).map(([path, mentions]) => {
    const sources = mentions.map((mention) => `- ${mention.method || "Mention"}: ${markdownLink(mention.title, mention.url)}`);
    return `## \`${path}\`\n\n${sources.join("\n")}`;
  });
  return `# KIE.AI Documentation Endpoint Index

Generated ${generatedAt} exclusively from official \`docs.kie.ai\` pages.

${sections.join("\n\n")}
`;
}

function jsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildDocsArtifacts(args: {
  indexBody: string;
  pages: FetchedDocPage[];
  generatedAt: string;
}): DocsArtifacts {
  const parsedPages = args.pages.map(parseOpenApiPage);
  const endpointCorrections: EndpointCorrection[] = [];
  const endpoints = parsedPages
    .flatMap((page) => normalizeEndpoints(page, endpointCorrections))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method) || a.source_url.localeCompare(b.source_url));
  const market = extractMarketModels(parsedPages);
  const marketModels = market.models;
  const mentions = endpointMentions(parsedPages, endpoints);
  const openapiCatalog = {
    generated_at: args.generatedAt,
    source_index: KIE_DOCS_INDEX_URL,
    endpoints,
    by_path: catalogByPath(endpoints),
    failures: []
  };
  const marketRegistry = {
    generated_at: args.generatedAt,
    source_index: KIE_DOCS_INDEX_URL,
    count: marketModels.length,
    models: marketModels
  };
  const endpointIndex = {
    generated_at: args.generatedAt,
    source_index: KIE_DOCS_INDEX_URL,
    endpoints: mentions.endpoints,
    by_path: mentions.by_path
  };
  const openapiCatalogFile = jsonFile(openapiCatalog);
  const marketRegistryFile = jsonFile(marketRegistry);
  const endpointIndexFile = jsonFile(endpointIndex);
  const manifest: DocsManifest = {
    schemaVersion: 3,
    generatedAt: args.generatedAt,
    sourceIndex: KIE_DOCS_INDEX_URL,
    sourceHost: "docs.kie.ai",
    indexSha256: sha256(args.indexBody),
    contentSha256: sha256(
      [...args.pages]
        .sort((a, b) => a.url.localeCompare(b.url))
        .map((page) => `${page.url}\n${page.body}`)
        .join("\n\0\n")
    ),
    pageCount: args.pages.length,
    openapiPageCount: parsedPages.filter((page) => page.spec).length,
    operationCount: endpoints.length,
    endpointPathCount: Object.keys(mentions.by_path).length,
    marketModelCount: marketModels.length,
    failures: 0,
    artifactSha256: {
      openapi_endpoint_catalog: sha256(openapiCatalogFile),
      market_model_registry: sha256(marketRegistryFile),
      endpoint_index: sha256(endpointIndexFile)
    },
    schemaCorrections: market.corrections,
    endpointCorrections
  };

  return {
    manifest,
    files: {
      "docs_manifest.json": jsonFile(manifest),
      "openapi_endpoint_catalog.json": openapiCatalogFile,
      "market_model_registry.json": marketRegistryFile,
      "endpoint_index.json": endpointIndexFile,
      "ANALYSIS.md": renderAnalysis(manifest),
      "OPENAPI_CATALOG.md": renderOpenApiCatalog(endpoints, args.generatedAt),
      "MARKET_MODEL_REGISTRY.md": renderMarketRegistry(marketModels, args.generatedAt),
      "ENDPOINT_INDEX.md": renderEndpointIndex(mentions.by_path, args.generatedAt)
    }
  };
}

export async function fetchOfficialText(fetchImpl: typeof fetch, url: string): Promise<string> {
  const requested = new URL(url);
  if (requested.protocol !== "https:" || requested.hostname !== "docs.kie.ai") {
    throw new Error(`Refusing non-official documentation URL: ${url}`);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetchImpl(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/markdown, text/plain;q=0.9",
          "User-Agent": "kie-ai-mcp-docs-sync/0.1 (+https://github.com/alfman99/kie-mcp)"
        }
      });
      const finalUrl = new URL(response.url || url);
      if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "docs.kie.ai") {
        throw new Error(`Official docs redirected outside docs.kie.ai: ${url} -> ${finalUrl.href}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      const body = await response.text();
      if (body.length === 0) {
        throw new Error(`Empty response from ${url}`);
      }
      if (!body.trimStart().startsWith("#")) {
        throw new Error(`Official Markdown response has no heading and may be an upstream error page: ${url}`);
      }
      if (body.length > 10 * 1024 * 1024) {
        throw new Error(`Response exceeds the 10 MiB safety limit: ${url}`);
      }
      return body;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.includes("redirected outside docs.kie.ai")) {
        throw error;
      }
      if (attempt < 8) {
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Unable to fetch ${url}`);
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function readExistingGeneratedAt(dataDirectory: string): Promise<string> {
  try {
    const manifest = JSON.parse(await readFile(join(dataDirectory, "docs_manifest.json"), "utf8")) as { generatedAt?: unknown };
    return asString(manifest.generatedAt) ?? "1970-01-01T00:00:00.000Z";
  } catch {
    return "1970-01-01T00:00:00.000Z";
  }
}

async function changedFiles(dataDirectory: string, files: DocsArtifacts["files"]): Promise<string[]> {
  const changed: string[] = [];
  for (const fileName of OUTPUT_FILES) {
    try {
      if ((await readFile(join(dataDirectory, fileName), "utf8")) !== files[fileName]) {
        changed.push(fileName);
      }
    } catch {
      changed.push(fileName);
    }
  }
  return changed;
}

function validateOutputDirectory(dataDirectory: string): string {
  const resolved = resolve(dataDirectory);
  if (resolved === dirname(resolved) || basename(resolved).length === 0) {
    throw new Error(`Refusing unsafe catalog output directory: ${dataDirectory}`);
  }
  return resolved;
}

async function writeArtifactSet(dataDirectory: string, files: DocsArtifacts["files"]): Promise<void> {
  const target = validateOutputDirectory(dataDirectory);
  const parent = dirname(target);
  const targetName = basename(target);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, `.${targetName}.staging-`));
  const backup = join(parent, `.${targetName}.backup-${process.pid}-${Date.now()}`);
  let movedExisting = false;

  try {
    for (const fileName of OUTPUT_FILES) {
      const contents = files[fileName];
      if (fileName.endsWith(".json")) {
        JSON.parse(contents);
      }
      await writeFile(join(staging, fileName), contents, "utf8");
    }

    try {
      await rename(target, backup);
      movedExisting = true;
    } catch (error) {
      if (!isRecord(error) || error.code !== "ENOENT") {
        throw error;
      }
    }

    try {
      await rename(staging, target);
    } catch (error) {
      if (movedExisting) {
        await rename(backup, target);
        movedExisting = false;
      }
      throw error;
    }

    if (movedExisting) {
      await rm(backup, { recursive: true, force: true });
      movedExisting = false;
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function syncKieDocs(options: SyncOptions): Promise<{
  changed: string[];
  manifest: DocsManifest;
  wrote: boolean;
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const dataDirectory = options.dataDirectory ?? DATA_DIRECTORY;
  const indexBody = await fetchOfficialText(fetchImpl, KIE_DOCS_INDEX_URL);
  const entries = parseLlmsIndex(indexBody);
  if (entries.length < 25 || entries.length > 1000) {
    throw new Error(`Official docs index yielded an unexpected ${entries.length} English Markdown pages; refusing to continue.`);
  }

  const pages = await mapConcurrent(entries, options.concurrency ?? 2, async (entry) => ({
    ...entry,
    body: await fetchOfficialText(fetchImpl, entry.url)
  }));
  const priorGeneratedAt = await readExistingGeneratedAt(dataDirectory);
  const comparison = buildDocsArtifacts({
    indexBody,
    pages,
    generatedAt: priorGeneratedAt
  });
  const changed = await changedFiles(dataDirectory, comparison.files);

  if (options.mode === "write" && changed.length > 0) {
    const updated = buildDocsArtifacts({
      indexBody,
      pages,
      generatedAt: (options.now ?? new Date()).toISOString()
    });
    await writeArtifactSet(dataDirectory, updated.files);
    return { changed, manifest: updated.manifest, wrote: true };
  }

  return { changed, manifest: comparison.manifest, wrote: false };
}

async function main(): Promise<void> {
  const command = process.argv.slice(2).find((argument) => !argument.startsWith("-")) ?? "check";
  if (!["check", "update"].includes(command)) {
    throw new Error("Usage: kie-ai-docs <check|update> [--output /absolute/catalog/directory]");
  }
  const outputFlag = process.argv.indexOf("--output");
  const outputDirectory =
    outputFlag >= 0 ? process.argv[outputFlag + 1] : process.env.KIE_DOCS_DATA_DIR;
  if (outputFlag >= 0 && !outputDirectory) {
    throw new Error("--output requires a directory path.");
  }
  const mode = command === "update" ? "write" : "check";
  const result = await syncKieDocs({
    mode,
    dataDirectory: outputDirectory ? resolve(outputDirectory) : DATA_DIRECTORY
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        mode,
        officialSource: KIE_DOCS_INDEX_URL,
        pages: result.manifest.pageCount,
        openapiOperations: result.manifest.operationCount,
        marketModels: result.manifest.marketModelCount,
        changedFiles: result.changed,
        wrote: result.wrote
      },
      null,
      2
    )}\n`
  );

  if (mode === "check" && result.changed.length > 0) {
    process.stderr.write("KIE documentation drift detected. Review the official-source changes, then run `npm run docs:update`.\n");
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  await main();
}
