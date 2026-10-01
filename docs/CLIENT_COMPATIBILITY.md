# KIE.AI MCP client compatibility

KIE.AI MCP supports two connections:

- Local stdio: your app starts the Node process and sends requests directly to KIE.
- Remote Streamable HTTP: your app connects to the hosted server and sends its KIE key with each request.

Use the [installation guide](INSTALL_OTHER_APPS.md) for commands and configuration files.

## Choose a connection

| Client | Connection | Setup |
| --- | --- | --- |
| Claude Desktop | Local extension | Install the `.mcpb` release |
| Claude Code | Remote HTTP or local stdio | Use `claude mcp add` |
| Codex desktop and CLI | Remote HTTP or local stdio | Use `codex mcp add` |
| Cursor IDE and Agent | Remote HTTP or local stdio | Use `mcp.json` |
| VS Code / GitHub Copilot | Remote HTTP or local stdio | Use MCP configuration |
| Windsurf legacy Cascade | Local stdio instructions provided | Use Cascade MCP settings |
| ChatGPT website | Cannot connect directly to this key-based relay | An OAuth integration would be required |

The local MCP checks and extension build run in CI on Windows and Linux. The hosted transport,
authentication, catalog, and a Seedream 5.0 Pro generation were checked on the production server.
This does not mean every app and model has been tested.

## Authentication limits

The hosted server requires `Authorization: Bearer <KIE_API_KEY>` or `X-KIE-API-Key` on each request.
It does not implement OAuth. A client must support these headers to connect.

ChatGPT's custom MCP integrations cannot send a custom KIE API key as this server requires.
Hosting alone does not make the relay compatible with ChatGPT's website.
See [OpenAI's authentication requirements](https://developers.openai.com/plugins/build/auth).

Claude Desktop instructions use the local extension. Use a coding client with configurable headers
for the hosted connection.

## Local files

Local source installations need both settings to upload files:

```text
KIE_ALLOW_LOCAL_FILE_UPLOADS=true
KIE_LOCAL_UPLOAD_ROOT=/absolute/path/to/a/dedicated/media-folder
```

The server rejects files and symlinks outside that folder. URL and base64 uploads do not need local
file access. A remote connection cannot read the caller's disk; see
[remote uploads](REMOTE_SERVER.md#uploading-local-files).

## Results and progress

The tools return task IDs, status data, and media links. Clients that support MCP progress
notifications can show updates while a wait-enabled call runs. Other clients receive the final result.

Cancelling a wait stops polling, not the accepted KIE generation. Keep the task ID and check it later.
The server retries temporary status errors with backoff. It retries creation only when KIE returns
429 and refuses the request. See [retry rules](TECHNICAL_REFERENCE.md#task-creation-rate-limit).

## Vendor references

- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Codex MCP](https://developers.openai.com/codex/mcp/)
- [Cursor MCP](https://cursor.com/docs/mcp)
- [VS Code MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Windsurf / Cascade MCP](https://docs.devin.ai/desktop/cascade/mcp)

[Documentation index](README.md)
