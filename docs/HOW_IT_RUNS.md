# How This MCP Server Runs

This project is a local KIE.AI MCP server. It does not listen on a port or keep a background daemon alive. An MCP client starts it as a child process and communicates over standard input and standard output.

## Direct Node Lifecycle

Build once:

```bash
npm install
npm run build
```

Register this absolute command in the MCP client:

```bash
node /absolute/path/to/kie-mcp/dist/src/index.js
```

The lifecycle is:

```text
Codex / Claude / Cursor / another MCP client
        |
        | starts a child process and initializes MCP
        v
node /absolute/path/to/dist/src/index.js
        |
        | exposes tools and local docs resources
        v
KIE creation, upload, task, catalog, and utility tools
        |
        | live tools call KIE over HTTPS
        v
KIE.AI APIs
        |
        | client closes stdin
        v
Node process exits
```

The server stores no media. It uses KIE's native upload endpoints and returns KIE's temporary upload URLs.

## What Codex Is Configured To Do

This machine has a global Codex MCP entry named `kie-ai`. Inspect it with:

```bash
codex mcp get kie-ai
```

Expected shape:

```text
kie-ai
  enabled: true
  transport: stdio
  command: node
  args: /absolute/path/to/kie-mcp/dist/src/index.js
```

Codex masks configured environment values. Fresh tasks load the MCP automatically. An already-open task may require a new task or Codex reload after registration changes.

## Deterministic Doctor

Run the complete no-credit lifecycle test:

```bash
npm run build
npm run mcp:doctor
```

The doctor:

1. Spawns the built server over stdio.
2. Completes MCP initialization.
3. Lists required tools and resources.
4. Calls configuration and local-catalog tools.
5. Closes the client and stdin transport.
6. Confirms the child process exited.
7. Fails on unexpected stderr or an orphan process.

Verify the configured API key without generating media:

```bash
KIE_API_KEY="your-kie-api-key" npm run mcp:doctor:live
```

The live doctor calls only KIE's credit endpoint. It does not consume generation credits.

## Native Media Uploads

`kie_upload_media` accepts exactly one source:

- `local_file`: native multipart upload from an absolute local path.
- `url`: KIE downloads a public HTTP or HTTPS URL.
- `base64`: KIE receives raw base64 or a data URL.

It routes directly to:

- `POST https://kieai.redpandaai.co/api/file-stream-upload`
- `POST https://kieai.redpandaai.co/api/file-url-upload`
- `POST https://kieai.redpandaai.co/api/file-base64-upload`

These are the native endpoints in the official [KIE File Upload API](https://docs.kie.ai/file-upload-api/quickstart). No Cloudinary, S3, ImgBB, Supabase, Firebase, or other media intermediary is used.

Local file access is disabled by default. Set `KIE_ALLOW_LOCAL_FILE_UPLOADS=true` only for an agent that should read local paths. The Node client uses a file-backed `Blob` and native `FormData`, so the application does not load the complete file into a separate memory buffer.

## Tool Groups

Friendly creation:

- `kie_create_image`
- `kie_create_video`
- `kie_create_speech`
- `kie_get_creation`

Native upload:

- `kie_upload_media`
- `kie_upload_file_from_url`
- `kie_upload_file_base64`
- `kie_upload_file_stream`

Configuration and local docs:

- `kie_check_configuration`
- `kie_get_local_catalogs`

Advanced Market, product, and utility tools remain available for exact API control.

## Cleanup

Normal stdio shutdown leaves no server running. After a diagnostic:

```bash
pgrep -af 'dist/src/index.js'
```

An empty result confirms no matching MCP child remains. Do not terminate unrelated Node processes. Temporary test directories are created under the operating system's temp directory and removed by the test suite.

## Security

- Keep real API keys out of the repository and command arguments.
- Do not log base64 media, webhook secrets, or private temporary URLs.
- Enable local file uploads only for trusted agents.
- KIE generation is asynchronous. Preserve task IDs until the final result is retrieved.
