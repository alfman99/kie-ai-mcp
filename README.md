# KIE.AI MCP Server

Local stdio MCP server for KIE.AI. It bundles endpoint/model catalogs generated exclusively from the [official Kie documentation](https://docs.kie.ai/) and exposes KIE media/task APIs as MCP tools for local agents.

For the process lifecycle and diagnostic flow, read [docs/HOW_IT_RUNS.md](docs/HOW_IT_RUNS.md). The short version: your MCP client starts the built Node command, talks JSON-RPC over stdio, and closes the process when the session ends.

## How It Runs

Yes: the MCP client spins it up, uses it, then turns it off.

This server is a local stdio MCP server. It is not a web app, and it does not keep a background port open. Your agent starts it as a subprocess.

From a source checkout, that subprocess is:

```bash
node /absolute/path/to/kie-mcp/dist/src/index.js
```

The lifecycle is:

1. You configure your MCP client with the absolute Node entry point.
2. The client starts the process and completes MCP initialization.
3. The client sends tool calls through stdin/stdout.
4. The server calls only KIE.AI endpoints over HTTPS when a live tool is used.
5. When the client closes the session, stdin closes and the Node process exits.

There is no background daemon, listening port, storage service, or upload intermediary. Docker remains an optional packaging method, not a runtime requirement.

## What It Covers

- Higgsfield-style creative tools: ask your agent to create an image, video, or voiceover with KIE and let the MCP server handle the KIE task call and polling.
- Common utilities: credits and temporary download URLs.
- Native KIE file uploads: one friendly media uploader plus URL, base64, and local file stream primitives.
- Unified Market tasks: list models, inspect model schemas, create tasks, poll tasks, and wait for completion.
- Webhook HMAC verification.
- Product-specific helper dispatch for 4o Image, Flux Kontext, Runway/Aleph, Suno, and Veo3.1.
- Local docs resources for the extracted OpenAPI catalog and Market model registry.

V1 intentionally does not expose KIE chat/LLM proxy endpoints. Those overlap with model configuration in most agents and should be a separate phase.

## Use It Like Higgsfield

After the MCP server is connected, the intended user experience is simple:

```text
Create a square image of a turtle using KIE.
```

```text
Create a 5 second 9:16 cinematic video of a perfume bottle rotating on black glass.
```

```text
Create a short energetic voiceover for this product launch script.
```

The agent should use the friendly tools first:

- `kie_create_image`: create or edit images. Defaults to GPT Image 2.
- `kie_create_video`: create text-to-video or image-to-video generations. Defaults to Seedance 2.0.
- `kie_create_speech`: create voiceover or narration.
- `kie_get_creation`: check or wait for any submitted creation task.
- `kie_upload_media`: upload a local file, public URL, or base64 payload directly through KIE.

These tools hide the annoying parts:

- picking the correct KIE task endpoint,
- formatting the KIE `input` object,
- submitting the async task,
- polling until KIE returns the result,
- returning the task id and full response for follow-up.

The lower-level `kie_market_*` and `kie_product_*` tools are still available when you need exact control, but normal creative requests should start with the friendly tools above.

## Install

```bash
git clone https://github.com/alfman99/kie-mcp.git
cd kie-mcp
npm install
npm run build
npm run mcp:doctor
```

## Optional Docker Runtime

Docker is supported when an isolated runtime is preferred. It is not required for Node or Codex setup.

```bash
docker build -t kie-ai-mcp-server:latest .
```

Then your MCP client can start and stop containers from that image whenever it needs the server.

Run a live smoke test by passing your key at runtime:

```bash
docker run --rm -e KIE_API_KEY="your-kie-api-key" kie-ai-mcp-server:latest npm run smoke
```

Run the MCP server over stdio:

```bash
docker run --rm -i -e KIE_API_KEY="your-kie-api-key" kie-ai-mcp-server:latest
```

The `-i` flag is important. Local MCP servers communicate over stdio, so Docker must keep stdin open for the MCP client.

This command does not print a normal app UI. It waits for an MCP client to send JSON-RPC messages over stdin. That is correct.

When you stop the command with `Ctrl+C`, or when an MCP client disconnects, the container stops. Because the command includes `--rm`, Docker cleans up that stopped container automatically.

You can also use an environment file for manual smoke checks:

```bash
cp .env.example .env
# edit .env and set KIE_API_KEY
docker compose run --rm kie-ai-mcp npm run smoke
```

## Configuration

Set environment variables in your MCP client config:

```bash
export KIE_API_KEY="your-kie-api-key"
```

Optional:

```bash
export KIE_API_BASE_URL="https://api.kie.ai"
export KIE_UPLOAD_BASE_URL="https://kieai.redpandaai.co"
export KIE_WEBHOOK_HMAC_KEY="your-webhook-hmac-key"
export KIE_POLL_INTERVAL_MS="5000"
export KIE_POLL_TIMEOUT_MS="600000"
export KIE_ALLOW_LOCAL_FILE_UPLOADS="false"
export KIE_DOCS_DATA_DIR="/absolute/path/to/an/external/kie-docs-snapshot"
```

Tools that only read local catalogs or verify webhooks with a supplied key work without `KIE_API_KEY`. Live KIE API tools fail clearly if the key is missing.

`KIE_DOCS_DATA_DIR` is optional. When omitted, the server uses the reviewed snapshot bundled into the build. When set, the server validates and loads that external snapshot at process startup. Restart the MCP process after refreshing it; catalogs are not hot-loaded.

## Keep the Kie Catalogs Current

The updater discovers pages only through [Kie’s official `llms.txt`](https://docs.kie.ai/llms.txt), rejects non-`docs.kie.ai` redirects, records hashes plus schema/executable-endpoint conflicts, and replaces the snapshot only after the complete crawl validates.

From a source checkout:

```bash
npm run docs:check
npm run docs:update
npm test
npm run typecheck
npm run build
```

`docs:check` is read-only and exits non-zero when official documentation drift exists. `docs:update` writes the validated artifacts in `src/data/` transactionally. Restart the Node MCP or rebuild an optional Docker image after an update.

The package also provides a portable CLI for an external snapshot:

```bash
kie-ai-docs check --output /absolute/path/to/kie-docs
kie-ai-docs update --output /absolute/path/to/kie-docs
```

Start the MCP with `KIE_DOCS_DATA_DIR` pointing to that directory. For Docker, mount the host directory read-only and use its container path:

```bash
docker run --rm -i \
  -e KIE_API_KEY \
  -e KIE_DOCS_DATA_DIR=/data/kie-docs \
  -v "/absolute/path/to/kie-docs:/data/kie-docs:ro" \
  kie-ai-mcp-server:latest
```

The Impeccable-style `$kie-ai` skill lives at `.agents/skills/kie-ai`. It routes `use`, `upload`, `status`, `doctor`, `install`, `check`, `update`, and `cleanup` workflows through focused references. Other MCP clients can use the same CLI and MCP tools without supporting skills.

## MCP Client Example

### Recommended: Direct Node

Most local MCP clients start stdio servers by running a command and passing environment variables:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "your-kie-api-key",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true"
      }
    }
  }
}
```

For Claude Code:

```bash
claude mcp add --transport stdio kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

Secrets should be passed through the MCP client's environment configuration. Do not put real API keys in the repository, image, command arguments, or logs.

### Codex Setup

Build the server, then add its absolute entry point to Codex:

```bash
export KIE_API_KEY="your-kie-api-key"
npm run build
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
npm run mcp:doctor
```

Check the saved config with:

```bash
codex mcp get kie-ai
```

Fresh Codex threads/processes should load it automatically. Already-open threads may not hot-load newly added MCP servers; start a new thread or restart/reload Codex if the `kie-ai` tools are not visible.

The saved config should use the built Node process:

```text
node /absolute/path/to/kie-mcp/dist/src/index.js
```

Codex masks configured environment values in `codex mcp get`. Do not store real keys in this repo.

### Installed Binary

After publishing or linking the package, you can also run the binary:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "kie-ai-mcp",
      "env": {
        "KIE_API_KEY": "your-kie-api-key"
      }
    }
  }
}
```

## Tools

### Friendly Creation Tools

- `kie_create_image`: create a KIE image from a prompt, or edit/reference images with `inputUrls`.
- `kie_create_video`: create a KIE video from text, first/last frame, image references, video references, or audio references.
- `kie_create_speech`: create narrated speech or voiceover from text.
- `kie_get_creation`: check or wait for a KIE creation task.

Example image request:

```json
{
  "prompt": "A premium studio product photo of a matte black coffee grinder",
  "aspectRatio": "1:1",
  "resolution": "1K"
}
```

Example video request:

```json
{
  "prompt": "A 5 second cinematic shot of a glass skincare bottle floating through soft morning light",
  "aspectRatio": "9:16",
  "resolution": "720p",
  "duration": 5,
  "generateAudio": true
}
```

By default these tools wait for the final result. Set `waitForResult` to `false` if you want to submit the task first and check later with `kie_get_creation`.

### Configuration and Local Catalogs

- `kie_check_configuration`: reports configured base URLs and whether secrets are present without revealing them.
- `kie_get_local_catalogs`: returns snapshot provenance, hashes, schema corrections, catalog source, counts, and resource URIs.

### Common API

- `kie_get_credits`: `GET /api/v1/chat/credit`.
- `kie_get_download_url`: `POST /api/v1/common/download-url`.

### File Upload API

- `kie_upload_media`: friendly router for exactly one `local_file`, `url`, or `base64` source.
- `kie_upload_file_from_url`: `POST /api/file-url-upload`.
- `kie_upload_file_base64`: `POST /api/file-base64-upload`.
- `kie_upload_file_stream`: `POST /api/file-stream-upload`.

Uploads go directly to KIE's officially documented native upload service at `https://kieai.redpandaai.co`. No third-party storage SDK or service is involved.

Local stream uploads use Node's native file-backed `Blob` and multipart `FormData`, without buffering the complete media file in application memory. Local path access is disabled by default; set `KIE_ALLOW_LOCAL_FILE_UPLOADS=true` only when agents should upload files from that runtime.

### Unified Market API

- `kie_market_list_models`: lists local docs-derived model records.
- `kie_market_get_model_schema`: returns one model schema record by model value.
- `kie_market_create_task`: calls `POST /api/v1/jobs/createTask`.
- `kie_market_get_task`: calls `GET /api/v1/jobs/recordInfo`.
- `kie_market_wait_for_task`: polls `recordInfo` until terminal status or timeout.

Known models are validated against required input fields from the extracted docs registry. Unknown models are allowed through so newly added KIE models can still be used.

### Webhooks

- `kie_verify_webhook_signature`: verifies `base64(HMAC-SHA256(taskId + "." + timestamp, webhookHmacKey))`.

The verifier supports both `taskId` and `task_id` callback shapes.

### Product APIs

- `kie_product_list_operations`: lists product-specific operations.
- `kie_product_api_call`: dispatches a supported operation for:
  - `4o_image`
  - `flux_kontext`
  - `runway`
  - `aleph`
  - `suno`
  - `veo`

Example:

```json
{
  "family": "veo",
  "operation": "generate",
  "body": {
    "prompt": "A cinematic shot of a glass sculpture in morning light",
    "model": "veo3.1",
    "generationType": "TEXT_2_VIDEO"
  }
}
```

## Resources

- `kie://docs/manifest`
- `kie://docs/analysis`
- `kie://docs/openapi-catalog`
- `kie://docs/market-model-registry`
- `kie://docs/endpoint-index`

## Development

```bash
npm run typecheck
npm run build
npm test
npm run docs:check
npm run mcp:doctor
```

Tests use mocked HTTP and do not call KIE.

Live authentication check without media generation or credit consumption:

```bash
KIE_API_KEY="your-kie-api-key" npm run mcp:doctor:live
```

Docker checks:

```bash
npm run docker:build
KIE_API_KEY="your-kie-api-key" npm run docker:smoke
```

Direct Docker MCP check:

```bash
KIE_API_KEY="your-kie-api-key" npm run docker:mcp:test
```

The script starts `docker run --rm -i ... kie-ai-mcp-server:latest`, connects with the MCP SDK over stdio, lists tools/resources, reads bundled docs, and calls the live `kie_get_credits` tool.

Optional live smoke test:

```bash
KIE_API_KEY="your-kie-api-key" npm run smoke
```

Without `KIE_API_KEY`, the smoke script exits successfully after reporting that it skipped the live call.

For development before running `npm run build`, use:

```bash
KIE_API_KEY="your-kie-api-key" npm run smoke:dev
```

## Bundled Catalogs

The bundled local catalogs in `src/data/` were generated on 2026-07-30 exclusively from the official Kie documentation:

- 244 official English Markdown pages.
- 210 OpenAPI operations.
- 78 unique API paths.
- 118 unique model schemas for `POST /api/v1/jobs/createTask`.

Read `kie://docs/manifest` or call `kie_get_local_catalogs` for the exact timestamp, source index, hashes, model-schema corrections, and executable-endpoint corrections.
