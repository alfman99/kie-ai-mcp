# SPEC

## Goal

Build a complete local MCP server for KIE.AI that lets any MCP-capable agent interact reliably with KIE common utilities, file uploads, asynchronous media/task APIs, market model schemas, webhook verification, and documented product-specific task APIs.

## Approved Product Decisions

- Runtime: TypeScript on Node.js 20+.
- MCP SDK: `@modelcontextprotocol/sdk`.
- Transport: stdio for v1.
- Scope: media/task APIs, file uploads, common utilities, market registry, webhook verification, and product-specific helpers for 4o Image, Flux Kontext, Runway, Suno, and Veo3.1.
- Non-goal for v1: KIE chat/LLM proxy endpoints.
- Validation: hybrid. Validate known models and tools against extracted schema where practical, while preserving permissive passthrough for newly added or evolving KIE models.
- Secrets: environment variables only.
- API testing: mocked HTTP by default. Live smoke tests are opt-in and only run when `KIE_API_KEY` is present.

## Research Inputs

The implementation must use the official KIE docs research bundle:

- `research/kie-docs/ANALYSIS.md`
- `research/kie-docs/OPENAPI_CATALOG.md`
- `research/kie-docs/openapi_endpoint_catalog.json`
- `research/kie-docs/MARKET_MODEL_REGISTRY.md`
- `research/kie-docs/market_model_registry.json`
- `research/kie-docs/ENDPOINT_INDEX.md`
- `research/kie-docs/crawl_manifest.json`

Research coverage on 2026-07-02:

- 258 official `docs.kie.ai` pages crawled up to depth 3.
- 176 OpenAPI operations extracted.
- 53 OpenAPI-declared paths.
- 59 API paths mentioned in docs.
- 114 model-specific schemas for `POST /api/v1/jobs/createTask`.
- 0 remaining crawl errors.

## User-Visible Behavior

The server should expose MCP tools that can:

- Read KIE account credits.
- Convert KIE-generated media URLs into temporary direct download URLs.
- Upload files by URL, base64 payload, or local file stream.
- List supported Market models from the extracted docs registry.
- Return a model-specific schema/metadata record from the local registry.
- Create unified Market tasks with model-aware validation for known models.
- Poll unified Market task status.
- Wait for unified Market tasks with bounded polling.
- Verify KIE webhook HMAC signatures.
- Call product-specific documented APIs for 4o Image, Flux Kontext, Runway/Aleph, Suno, and Veo3.1 through typed or endpoint-aware helper tools.

The server should expose MCP resources for the local docs catalog and registries:

- `kie://docs/analysis`
- `kie://docs/openapi-catalog`
- `kie://docs/market-model-registry`
- `kie://docs/endpoint-index`

## Configuration

Environment variables:

- `KIE_API_KEY`: required for live API tools.
- `KIE_API_BASE_URL`: optional, defaults to `https://api.kie.ai`.
- `KIE_UPLOAD_BASE_URL`: optional, defaults to `https://kieai.redpandaai.co`.
- `KIE_WEBHOOK_HMAC_KEY`: optional, used by webhook verification when a key is not passed to the tool.
- `KIE_POLL_INTERVAL_MS`: optional default poll interval.
- `KIE_POLL_TIMEOUT_MS`: optional default poll timeout.

Tools that do not require live KIE calls, such as model listing and webhook verification with a supplied key, must work without `KIE_API_KEY`.

## Architecture Constraints

- Keep the server local-first and stdio-based.
- Do not commit secrets or require `.env`.
- Do not make live KIE requests during normal tests.
- Keep generated docs data as local JSON artifacts so the MCP server works offline for model/schema discovery.
- Preserve raw KIE response details in tool output and errors.
- Treat non-2xx HTTP responses and JSON `code != 200` as failures unless a specific endpoint documents otherwise.
- For `resultJson`, return both raw and parsed JSON when parsing succeeds.
- Respect KIE's asynchronous task model: create calls return task ids, and wait tools must use bounded polling.
- Do not include chat/LLM proxy endpoints in v1 except as documented research notes.

## Edge Cases

- `taskId` vs `task_id` differences in webhook payloads.
- Missing `KIE_API_KEY` for live API tools.
- Unknown Market model names.
- Known Market models with incomplete or inconsistent docs schemas.
- `resultJson` that is empty, invalid JSON, or uses model-specific shapes.
- HTTP 429 rate limits.
- Upload endpoints using a different base URL from the main API.
- Product docs with missing `servers` fields; default to the main API base URL except upload endpoints.

## Scorecard

Primary checklist score: 12 required checks, passing threshold 12/12.

1. `npm test` passes with mocked HTTP tests.
2. `npm run build` passes.
3. `npm run typecheck` passes.
4. Server starts under stdio without requiring `KIE_API_KEY`.
5. Docs resources return local research artifacts.
6. Common tools are implemented: credits and download URL.
7. Upload tools are implemented: URL, base64, local stream.
8. Market tools are implemented: list models, get schema, create task, get task, wait for task.
9. Webhook verification supports `taskId` and `task_id`.
10. Product API helper covers 4o Image, Flux Kontext, Runway/Aleph, Suno, and Veo3.1 endpoint families.
11. Known KIE error shapes produce structured MCP errors.
12. README documents install, configuration, tools, resources, and live smoke testing.

Regression checks:

- No live KIE calls in unit tests.
- No API key appears in tracked files or logs.
- Existing research artifacts remain intact.

Stop condition: all 12 checklist items pass and the final verification commands succeed.

## Fast Feedback Loop

Fast check:

```bash
npm test
```

Expected runtime: under 10 seconds after dependencies are installed.

Cadence: run after each meaningful implementation slice.

Proxy validity: mocked HTTP covers request construction, auth headers, error handling, polling, schema lookup, and webhook signature logic without consuming credits.

Slower final checks:

```bash
npm run typecheck
npm run build
npm test
```

Optional live smoke check only when `KIE_API_KEY` is present:

```bash
npm run smoke
```

## Done When

- `package.json`, TypeScript source, tests, and README exist for a local KIE MCP server.
- `npm install` has succeeded and lockfile is present.
- `npm run typecheck`, `npm run build`, and `npm test` pass.
- The server can start with `npm start` without `KIE_API_KEY` and expose non-live docs/model tools.
- Live API tools read `KIE_API_KEY` from the environment and fail clearly when it is missing.
- The local docs-derived OpenAPI catalog and Market model registry are bundled into the server package.
- README includes MCP client configuration examples and documents the v1 non-goal of chat/LLM proxy endpoints.

