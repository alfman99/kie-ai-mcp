# Technical Reference

This document is for maintainers and users connecting KIE Creator to an MCP client other than Claude Desktop. The beginner installation belongs in the main [README](../README.md).

## Runtime model

KIE Creator is a local stdio MCP server. The MCP client starts it as a child process, communicates over stdin/stdout, and closes it when the session ends.

It does not expose a listening port, run a daemon, host user media, or require a container. Live tools call KIE directly over HTTPS.

## Source installation

Requirements:

- Node.js 20 or newer
- An MCP client that supports local stdio servers
- A KIE API key for live creation tools

```bash
git clone https://github.com/alfman99/kie-mcp.git
cd kie-mcp
npm ci
npm run build
npm run mcp:doctor
```

Register this command in the client:

```text
node /absolute/path/to/kie-mcp/dist/src/index.js
```

Generic configuration:

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

Never commit a real key or place it in logs. Prefer the client's secret-backed environment configuration.

### Claude Code

```bash
claude mcp add --transport stdio kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

### Codex

```bash
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

Verify the saved registration:

```bash
codex mcp get kie-ai
```

A running agent may not hot-load a new MCP registration. Start a fresh task or reload the client after installing it.

## Claude Desktop extension

`npm run bundle:claude` creates:

```text
release/kie-creator-for-claude.mcpb
```

The bundle contains the built JavaScript server and production dependencies. Its manifest:

- requests the KIE API key through a required sensitive field;
- uses Claude's included Node runtime;
- enables local file uploads for reference-media workflows;
- fixes the API and upload base URLs to KIE's official endpoints.

The bundle is validated and inspected with the official MCPB tool before the build succeeds.

## Configuration

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `KIE_API_KEY` | Live tools | — | KIE bearer token |
| `KIE_API_BASE_URL` | No | `https://api.kie.ai` | Official KIE API base |
| `KIE_UPLOAD_BASE_URL` | No | `https://kieai.redpandaai.co` | Official KIE upload base |
| `KIE_ALLOW_LOCAL_FILE_UPLOADS` | No | `false` | Allow tools to read absolute local paths |
| `KIE_POLL_INTERVAL_MS` | No | `3000` | Async-task polling interval |
| `KIE_POLL_TIMEOUT_MS` | No | `600000` | Async-task polling timeout |
| `KIE_WEBHOOK_HMAC_KEY` | No | — | Default webhook verification key |
| `KIE_DOCS_DATA_DIR` | No | bundled snapshot | External reviewed catalog snapshot |

Catalog and supplied-key webhook tools work without `KIE_API_KEY`. Live KIE tools return a clear configuration error when it is absent.

External catalogs are validated at startup and are not hot-loaded. Restart the MCP after changing `KIE_DOCS_DATA_DIR`.

## Friendly creation tools

- `kie_create_image`: create an image or edit from reference URLs.
- `kie_create_video`: create video from text, frames, image references, video references, or audio references.
- `kie_create_speech`: create narration or voiceover.
- `kie_get_creation`: retrieve or wait for a submitted creation.
- `kie_upload_media`: upload one local file, public URL, or base64 source through KIE.

The friendly tools choose and format the relevant KIE task, submit it, and optionally wait for the final result. Advanced Market and product tools remain available for exact control.

## Native media upload

Uploads go directly to KIE's officially documented native service:

- `POST https://kieai.redpandaai.co/api/file-stream-upload`
- `POST https://kieai.redpandaai.co/api/file-url-upload`
- `POST https://kieai.redpandaai.co/api/file-base64-upload`

There is no third-party storage SDK or upload intermediary.

Local stream uploads use a file-backed `Blob` plus native `FormData`, without reading the complete file into a second application buffer. Local path access is disabled by default in source installations.

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
KIE_API_KEY="your-kie-api-key" npm run mcp:doctor:live
```

The live doctor calls the credit endpoint only. It does not consume generation credits.

An optional live smoke check is also available:

```bash
KIE_API_KEY="your-kie-api-key" npm run smoke
```

Without a key, the smoke command exits successfully after reporting that the live call was skipped.

## Bundled catalogs

The generated artifacts in `src/data/` are built exclusively from official [KIE documentation](https://docs.kie.ai/). Call `kie_get_local_catalogs` or read `kie://docs/manifest` for the exact generation timestamp, source index, hashes, failure count, and current operation/model totals.
