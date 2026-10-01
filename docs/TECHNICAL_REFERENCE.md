# KIE.AI MCP technical reference

This document is for maintainers and users connecting KIE.AI MCP to a client other than Claude Desktop. The beginner installation belongs in the main [README](../README.md).

## Runtime model

In local stdio mode, the MCP client starts KIE.AI MCP as a child process, communicates over
stdin/stdout, and closes it when the session ends. It sends requests directly to KIE over HTTPS.

In HTTP mode, the server listens for remote MCP requests and forwards them with each caller's KIE
key. Local file uploads are disabled. See [remote hosting](REMOTE_SERVER.md) for this mode.
Neither mode stores media.

## Source installation

Requirements:

- Node.js 20 or newer
- An MCP client that supports local stdio servers
- A KIE API key for live creation tools

```bash
git clone https://github.com/alfman99/kie-ai-mcp.git
cd kie-ai-mcp
npm ci
npm run build
npm run mcp:doctor
```

Register this command in the client:

```text
node /absolute/path/to/kie-ai-mcp/dist/src/index.js
```

Generic configuration:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-ai-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "your-kie-api-key",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/your/kie-media"
      }
    }
  }
}
```

Never commit a real key or place it in logs. Prefer the client's secret-backed environment configuration.

### Claude Code

```bash
claude mcp add --transport stdio kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/your/kie-media" \
  -- node /absolute/path/to/kie-ai-mcp/dist/src/index.js
```

### Codex

```bash
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/your/kie-media" \
  -- node /absolute/path/to/kie-ai-mcp/dist/src/index.js
```

Verify the saved registration:

```bash
codex mcp get kie-ai
```

A running agent may not hot-load a new MCP registration. Start a fresh task or reload the client after installing it.

## Claude Desktop extension

`npm run bundle:claude` creates:

```text
release/kie-ai-mcp.mcpb
```

The bundle contains the built JavaScript server and production dependencies. Its manifest:

- requests the KIE API key through a required sensitive field;
- uses Claude's included Node runtime;
- enables local file uploads for reference-media workflows;
- requires a user-selected reference-media folder and enforces real-path containment;
- fixes the API and upload base URLs to KIE's official endpoints.

The bundle is validated and inspected with the official MCPB tool before the build succeeds.

## Configuration

The table lists runtime defaults. `.env.example` includes optional overrides; copying that file
does not load environment variables into the MCP process. HTTP authentication settings are in
[remote hosting](REMOTE_SERVER.md#authentication).

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `KIE_API_KEY` | Live tools | Not set | KIE bearer token |
| `KIE_API_BASE_URL` | No | `https://api.kie.ai` | Official KIE API base |
| `KIE_UPLOAD_BASE_URL` | No | `https://kieai.redpandaai.co` | Official KIE upload base |
| `KIE_ALLOW_LOCAL_FILE_UPLOADS` | No | `false` | Enable reads from the restricted local media folder |
| `KIE_LOCAL_UPLOAD_ROOT` | With local uploads | Not set | Restrict local reads to one absolute media folder |
| `KIE_POLL_INTERVAL_MS` | No | `3000` | Steady async-task polling cadence |
| `KIE_POLL_TIMEOUT_MS` | No | `600000` | Async-task polling timeout |
| `KIE_POLL_FIRST_DELAY_MS` | No | `3000` | Delay before the first status re-check |
| `KIE_POLL_MAX_INTERVAL_MS` | No | `3000` | Cadence ceiling for long-running renders |
| `KIE_POLL_EASE_AFTER_MS` | No | `90000` | Elapsed wait before easing toward the ceiling |
| `KIE_REQUEST_TIMEOUT_MS` | No | `20000` | Per-request deadline |
| `KIE_MAX_CONCURRENT_REQUESTS` | No | `8` | Ceiling on simultaneous in-flight KIE requests |
| `KIE_GENERATION_RATE_LIMIT` | No | `20` | New generation requests allowed per window (KIE's documented account limit) |
| `KIE_GENERATION_RATE_WINDOW_MS` | No | `10000` | Width of the generation rate-limit window |
| `KIE_GENERATION_MAX_RETRIES` | No | `3` | Re-sends of a submission KIE refused with 429 |
| `KIE_TOOL_PROFILE` | No | `standard` | `full` adds the advanced escape-hatch tools |
| `KIE_SUBMISSION_TTL_MS` | No | `1800000` | How long an `idempotencyKey` replays its original submission |
| `KIE_RESULT_CACHE_TTL_MS` | No | `1800000` | How long a finished task is served from memory |
| `KIE_PREWARM_CONNECTION` | No | `true` | Open the API connection at startup |
| `KIE_WEBHOOK_HMAC_KEY` | No | Not set | Default webhook verification key |
| `KIE_DOCS_DATA_DIR` | No | bundled snapshot | External reviewed catalog snapshot |

Catalog and supplied-key webhook tools work without `KIE_API_KEY`. Live KIE tools return a clear configuration error when it is absent.

External catalogs are validated at startup and are not hot-loaded. Restart the MCP after changing `KIE_DOCS_DATA_DIR`.

## Creation tools

Every create tool is batch-shaped: it takes a `jobs` array and submits all entries in parallel. There is one tool per media type, so an agent never has to choose between a single and a batch variant, and never has a reason to loop.

- `kie_create_image`: 1-16 images per call with GPT Image 2 (default) or GPT Image 2.5 Flare/Sunburst, waits for results by default.
- `kie_create_video`: 1-16 Seedance 2.0, Fast, Mini, 2.5, Wan 3.0, Wan 3.0 Prime, or Gemini Omni 1.1 Flash shots per call from text, frames, image references, video references, or audio references. Returns task IDs immediately by default because videos take minutes.
- `kie_create_speech`: 1-16 ElevenLabs Turbo 2.5 lines per call, waits for results by default.
- `kie_get_creation`: check or wait for up to 32 task IDs in parallel while preserving partial success. Finished tasks are served from memory.
- `kie_upload_media`: upload one local file, public URL, or base64 source through KIE.

All create and status tools return the same structured result shape with `taskIds`, normalized generations, and direct media links. Wait-enabled calls send standard MCP progress notifications when the client supports them. A job that fails validation is reported on its own row and does not stop the other jobs; a call is only marked `isError` when every job failed.

### Tool profiles

`KIE_TOOL_PROFILE=standard` exposes 11 tools. `KIE_TOOL_PROFILE=full` exposes all 21, adding separate
upload transports, raw Market status, product APIs, webhook verification, and the catalog summary tool.
Both profiles expose the model-list, model-schema, and Market creation tools.

### Automation and idempotency

The friendly create tools accept an optional `idempotencyKey`. Reusing the key replays the original
submission for `KIE_SUBMISSION_TTL_MS` instead of paying for a second generation. Concurrent calls
with the same key share the pending request. Within a batch, the key is scoped per job position.
The raw `kie_market_create_task` tool does not accept an idempotency key.

Creation requests retry only after KIE refuses them with 429. Other submission failures do not
retry automatically. When a wait times out, the accepted task ID is preserved so the work can be
collected with `kie_get_creation` rather than resubmitted.

### Error shape

Every error carries `category`, `retryable`, and `nextStep` alongside the message, so automated callers branch on fields instead of parsing text.

| Category | Retryable | Meaning |
|---|---|---|
| `auth` | No | Missing or rejected `KIE_API_KEY` |
| `input` | No | The request itself is invalid |
| `credits` | No | The KIE account needs a top-up |
| `rate_limit` | Yes | Honour `retryAfterMs` when present |
| `server` | Yes | Transient KIE-side failure |
| `network` | Yes | Transient connectivity failure |
| `timeout` | Yes | Poll the task ID; do not resubmit |
| `cancelled` | No | The caller cancelled the request |

## Status polling

The default polling interval is three seconds, with jitter to spread concurrent checks:

- `KIE_POLL_FIRST_DELAY_MS`, `KIE_POLL_INTERVAL_MS`, and `KIE_POLL_MAX_INTERVAL_MS` are all `3000` by default.
- Configure a smaller first delay to ramp up to the steady interval. Configure a larger maximum
  interval to ease toward it after `KIE_POLL_EASE_AFTER_MS`.
- Exponential backoff applies to failures only, and a `Retry-After` header is honoured when KIE sends one.
- Each poll carries `KIE_REQUEST_TIMEOUT_MS` of its own, so a stalled socket is retried instead of consuming the whole wait budget.
- `KIE_MAX_CONCURRENT_REQUESTS` caps in-flight requests within each KIE client. A remote MCP request
  creates its own client, so this limit does not combine traffic from separate HTTP requests.

## Task creation rate limit

KIE allows [up to 20 new generation requests per 10 seconds per account](https://docs.kie.ai/1973359m0.md), and states that
rejected requests do not enter the queue. Requests above that limit are refused.

- Task-creating requests take a slot from a sliding window (`KIE_GENERATION_RATE_LIMIT` per `KIE_GENERATION_RATE_WINDOW_MS`)
  before they are sent. This covers `POST /api/v1/jobs/createTask`, including product operations that create tasks.
- Status reads, credit checks, uploads, and downloads are not metered against that budget.
- A submission KIE still refuses with 429 is re-sent up to `KIE_GENERATION_MAX_RETRIES` times, honouring `Retry-After`.
  A 429 means the request was refused outright, so nothing was created and nothing was charged. **No other failure is ever
  retried automatically**, because a create request that may have landed must not be sent twice.
- Neither the rate-limit wait nor the retry backoff holds a concurrency slot, so a waiting submission never blocks a working one.

The generation window applies per KIE client instance. HTTP requests create separate clients, so
the relay does not enforce one shared generation window across remote requests. KIE's account
limit still applies.

## Native media upload

Uploads go directly to KIE's officially documented native service:

- `POST https://kieai.redpandaai.co/api/file-stream-upload`
- `POST https://kieai.redpandaai.co/api/file-url-upload`
- `POST https://kieai.redpandaai.co/api/file-base64-upload`

There is no third-party storage SDK or upload intermediary.

Local stream uploads use a file-backed `Blob` plus native `FormData`, without reading the complete file into a second application buffer. Local path access is disabled by default in source installations. When enabled, the server resolves real paths and rejects files, traversal, and symlinks outside `KIE_LOCAL_UPLOAD_ROOT`.

For verified client-specific setup, see [Client Compatibility](CLIENT_COMPATIBILITY.md).

## Tool inventory

### Configuration and local catalogs

- `kie_check_configuration`
- `kie_get_local_catalogs`

### Common API

- `kie_get_credits`
- `kie_get_download_url`

### File upload API

- `kie_upload_media`
- `kie_upload_file_from_url`
- `kie_upload_file_base64`
- `kie_upload_file_stream`

### Unified Market API

- `kie_market_list_models`
- `kie_market_get_model_schema`
- `kie_market_create_task`
- `kie_market_get_task`
- `kie_market_wait_for_task`

Known models are checked against fields, types, enums, limits, item counts, and URL formats extracted from the official documentation. Undocumented fields are rejected by default. Set `validateKnownModel` to `false` only as an explicit forward-compatibility escape hatch. Unknown models remain pass-through.

The bundled catalog supplies per-field limits. The friendly tools also enforce rules that KIE
documents in prose, such as `lastFrameUrl` requiring `firstFrameUrl` and incompatible frame/reference
inputs. After a catalog update, review those rules against the current documentation. Models with
no documented input fields remain pass-through.

### Product APIs

- `kie_product_list_operations`
- `kie_product_get_operation_schema`
- `kie_product_api_call`

Supported product families:

- `4o_image`
- `flux_kontext`
- `runway`
- `aleph`
- `suno`
- `veo`

Product query parameters and JSON bodies are validated against the bundled official OpenAPI snapshot.

KIE now uses `POST /api/v1/jobs/createTask` for product creation and
`GET /api/v1/jobs/recordInfo` for task status. Creation bodies use `{model, input, callBackUrl}`;
the previous flat product bodies are no longer accepted. Read `kie_product_get_operation_schema`
before calling an operation. Each operation selects its schema by its official source URL because
many operations now share the same path. The Market tools also expose these unified product models.

### Webhooks

- `kie_verify_webhook_signature`

The verifier checks `base64(HMAC-SHA256(taskId + "." + timestamp, webhookHmacKey))` and supports both `taskId` and `task_id` callback shapes.

## Resources

- `kie://docs/manifest`
- `kie://docs/analysis`
- `kie://docs/openapi-catalog`
- `kie://docs/market-model-registry`
- `kie://docs/endpoint-index`

## Official documentation maintenance

The updater discovers pages only through [KIE's official `llms.txt`](https://docs.kie.ai/llms.txt), rejects non-`docs.kie.ai` redirects, records hashes and schema conflicts, and replaces the snapshot only after a complete crawl validates.

```bash
npm run docs:check
npm run docs:update
```

`docs:check` is read-only and exits non-zero when official drift exists. `docs:update` writes generated artifacts in `src/data/` transactionally.

The installed `$kie-ai` skill in `.agents/skills/kie-ai` provides `check` and `update` workflows. Its updater runs the full validation suite and restores the previous snapshot if validation fails.

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run mcp:doctor
npm run bundle:claude
npm pack --dry-run
```

Tests use mocked HTTP and do not call KIE.

To verify a real key without generating media:

```bash
npm run mcp:doctor:live
```

Load `KIE_API_KEY` into the environment first. The live doctor calls the credit endpoint only.
It does not consume generation credits.

An optional live smoke check is also available:

```bash
npm run smoke
```

Without a key, the smoke command exits successfully after reporting that the live call was skipped.

## Bundled catalogs

The generated artifacts in `src/data/` are built exclusively from official [KIE documentation](https://docs.kie.ai/). Call `kie_get_local_catalogs` or read `kie://docs/manifest` for the exact generation timestamp, source index, hashes, failure count, and current operation/model totals.

[Documentation index](README.md)
