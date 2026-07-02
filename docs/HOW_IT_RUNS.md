# How This MCP Server Runs

This project is a local MCP server for KIE.AI. It does not run as a normal website and it does not listen on a port.

It runs as a command-line process that speaks MCP over standard input and standard output.

## The Short Version

An MCP client starts this command:

```bash
docker run --rm -i \
  -e KIE_API_KEY \
  -e KIE_API_BASE_URL \
  -e KIE_UPLOAD_BASE_URL \
  -e KIE_WEBHOOK_HMAC_KEY \
  -e KIE_POLL_INTERVAL_MS \
  -e KIE_POLL_TIMEOUT_MS \
  -e KIE_ALLOW_LOCAL_FILE_UPLOADS \
  kie-ai-mcp-server:latest
```

Then the MCP client sends JSON-RPC messages into the container through stdin. The server replies through stdout.

That is why the Docker command needs `-i`: it keeps stdin open.

## Mental Model

```text
Codex / Claude / Cursor / other MCP client
        |
        | starts a subprocess
        v
docker run --rm -i ... kie-ai-mcp-server:latest
        |
        | starts Node inside the container
        v
node dist/src/index.js
        |
        | registers MCP tools
        v
kie_get_credits, kie_market_create_task, kie_market_get_task, ...
        |
        | when a tool is called
        v
KIE.AI HTTPS API
```

The server is only alive while the MCP client keeps it open. There is no background daemon required.

## What Docker Does Here

Docker gives everyone the same runtime:

- Node 20
- production dependencies
- compiled JavaScript in `dist/`
- bundled KIE docs registry data

The API key is not baked into the image. It is passed at runtime through environment variables.

## What Codex Is Configured To Do

This machine has a global Codex MCP entry named `kie-ai`.

You can inspect it with:

```bash
codex mcp get kie-ai
```

It should show:

```text
kie-ai
  enabled: true
  transport: stdio
  command: docker
  args: run --rm -i ... kie-ai-mcp-server:latest
```

Codex masks the configured environment values in its output.

Fresh Codex threads/processes load this MCP server automatically. Already-open threads may not hot-load newly added MCP servers; start a new thread or restart/reload Codex if the `kie-ai` tools do not appear.

## Build The Image

From the repo root:

```bash
npm run docker:build
```

Equivalent raw command:

```bash
docker build -t kie-ai-mcp-server:latest .
```

## Run A Live Smoke Test

```bash
KIE_API_KEY="your-kie-api-key" npm run docker:smoke
```

Expected success shape:

```json
{
  "ok": true,
  "credits": {
    "code": 200,
    "msg": "success",
    "data": 7781
  }
}
```

The credit number will vary.

## Run The MCP Server Manually

This starts the MCP server and waits for MCP messages:

```bash
docker run --rm -i -e KIE_API_KEY="your-kie-api-key" kie-ai-mcp-server:latest
```

You will not see a normal prompt. That is expected. It is waiting for an MCP client to speak JSON-RPC over stdin.

Use `Ctrl+C` to stop it.

## Direct MCP Test Through Docker

This is the strongest test because it uses a real MCP client talking to the Docker container over stdio.

Run it like this:

```bash
KIE_API_KEY="your-kie-api-key" npm run docker:mcp:test
```

The checked-in script is [direct-docker-test-snippet.mjs](direct-docker-test-snippet.mjs). It starts Docker, connects with the MCP SDK, lists tools/resources, reads `kie://docs/analysis`, and calls `kie_get_credits`.

## Available Tool Groups

Friendly creation:

- `kie_create_image`
- `kie_create_video`
- `kie_create_speech`
- `kie_get_creation`

Configuration and local docs:

- `kie_check_configuration`
- `kie_get_local_catalogs`

Common KIE API:

- `kie_get_credits`
- `kie_get_download_url`

Uploads:

- `kie_upload_file_from_url`
- `kie_upload_file_base64`
- `kie_upload_file_stream`

Market tasks:

- `kie_market_list_models`
- `kie_market_get_model_schema`
- `kie_market_create_task`
- `kie_market_get_task`
- `kie_market_wait_for_task`

Webhooks:

- `kie_verify_webhook_signature`

Product helpers:

- `kie_product_list_operations`
- `kie_product_api_call`

## Example: Generate An Image

The generated turtle was created through:

1. `kie_market_create_task`
2. model: `gpt-image-2-text-to-image`
3. input:

```json
{
  "prompt": "A charming turtle, centered composition, detailed natural shell texture, gentle curious expression, clean studio lighting, subtle soft shadow, high quality image, no text, no watermark.",
  "aspect_ratio": "1:1",
  "resolution": "1K"
}
```

4. Poll with `kie_market_get_task`.
5. Download the result URL from `resultJson.resultUrls[0]`.
6. Resize locally to 720x720 when an exact `720p` model option is not available.

The output files are in `outputs/`.

## Important Notes

- Do not commit real API keys.
- `.env` is ignored by git.
- The Docker image does not contain the key.
- MCP stdio servers need `-i` when run through Docker.
- If Docker Desktop is not running, `docker build` or `docker run` will fail until the daemon starts.
- KIE generation tasks are asynchronous. Creation returns a task id; final media appears later through polling or callbacks.
