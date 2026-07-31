# Client Compatibility

KIE Creator uses one MCP implementation across supported agents. The local server speaks MCP over standard input/output and calls only KIE's official HTTPS API and native upload endpoints.

## Support matrix

| Client | Status | Connection | Best installation |
|---|---|---|---|
| Claude | Desktop is release-tested; Code is stdio-compatible | Local stdio | Install the `.mcpb` or use `claude mcp add` |
| ChatGPT / Codex | Codex is locally tested; ChatGPT web needs hosting | Local stdio in Codex; remote HTTP in ChatGPT | Use `codex mcp add` for the current release |
| Cursor | Supported | Local stdio | Use global or project `mcp.json` |
| VS Code + GitHub Copilot | Compatible; vendor-documented stdio | Local stdio | Add it to user or workspace `mcp.json` |
| Windsurf | Compatible with legacy Cascade's documented stdio support | Local stdio | Add it to Cascade MCP settings |

The browser inside Codex does not need its own KIE connection. Codex calls KIE through the local MCP and can use its browser separately in the same task.

For beginner-friendly, app-by-app instructions, use [Install KIE Creator in Your App](INSTALL_OTHER_APPS.md). This page records the compatibility boundary and shared technical requirements.

## Shared safety requirement

For local reference files, configure both:

```text
KIE_ALLOW_LOCAL_FILE_UPLOADS=true
KIE_LOCAL_UPLOAD_ROOT=/absolute/path/to/a/dedicated/media-folder
```

The server resolves the real paths of the selected folder and file before upload. It rejects relative paths, files outside the folder, `..` escapes, and symlinks that point outside the folder. URL and base64 uploads continue to use KIE's native endpoints and do not require local file access.

## Cursor IDE and Cursor Agent

Cursor officially supports local stdio MCP servers in `.cursor/mcp.json` for a project or `~/.cursor/mcp.json` globally. Its CLI uses the same configuration.

Build the checkout:

```bash
npm ci
npm run build
npm run mcp:doctor
```

This repository includes a project-scoped `.cursor/mcp.json`. It uses Cursor's `${workspaceFolder}`, `${userHome}`, and `${env:KIE_API_KEY}` interpolation, so it keeps the key out of version control. Create `~/KIE Media`, make `KIE_API_KEY` available to Cursor, open this repository, and restart Cursor.

For a different checkout or a global installation, add this entry to the chosen Cursor configuration file, replacing every placeholder with an absolute path:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "your-kie-api-key",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/your/kie-media"
      }
    }
  }
}
```

Restart Cursor, open **Settings → MCP**, and confirm `kie-ai` is enabled. Cursor Agent CLI users can additionally run:

```bash
cursor-agent mcp list
cursor-agent mcp list-tools kie-ai
```

Official Cursor reference: [Model Context Protocol](https://docs.cursor.com/context/model-context-protocol).

On macOS, an app opened from the Dock may not inherit variables from a shell startup file. Start Cursor from a terminal where `KIE_API_KEY` is available, or provide it through your normal OS-level secret-management workflow.

## Top local AI apps

Claude Code, Cursor, VS Code, Windsurf's legacy Cascade agent, and Codex support a local stdio command with arguments and environment variables. They can therefore launch the same built entry point:

```text
node /absolute/path/to/kie-mcp/dist/src/index.js
```

Their configuration wrappers and secret-input capabilities differ. The [app-by-app install guide](INSTALL_OTHER_APPS.md) provides verified menu paths and the correct JSON shape for each client.

Official client references:

- [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Windsurf / Cascade MCP](https://docs.devin.ai/desktop/cascade/mcp)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)

## Codex desktop and CLI

Codex desktop and the CLI share the same MCP configuration. Register the built server:

```bash
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/your/kie-media" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

Verify it without printing or sharing secret values:

```bash
codex mcp get kie-ai
```

Start a fresh Codex task after changing an MCP registration. The repository's `kie-ai` skill teaches an installed agent how to inspect configuration, use KIE tools, refresh the official-docs snapshot, validate the server, and cleanly shut it down.

Official OpenAI reference: [Connect Codex to MCP servers](https://developers.openai.com/codex/mcp/).

## ChatGPT in a browser

`chatgpt.com` cannot launch this repository's local Node stdio command. OpenAI's remote MCP integration expects a reachable server URL and supports Streamable HTTP or HTTP/SSE. Private or on-premises servers can use OpenAI's Secure MCP Tunnel where that product is available.

That is a different deployment and security model from the local release:

- the server must be hosted or tunneled over HTTPS;
- each user needs isolated authentication and KIE credentials;
- local file paths cannot be used by a remote server;
- uploads must arrive as user-authorized attachments, URLs, or request bodies;
- the remote endpoint needs production monitoring, rate limits, privacy terms, and an incident process.

The current release intentionally exposes no listening port and no public endpoint. Do not paste a KIE API key into a third-party hosted connector.

Official OpenAI references:

- [MCP and Connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
- [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## Cross-client verification

Every supported local client uses the same built entry point. Before registering it:

```bash
npm run typecheck
npm test
npm run build
npm run mcp:doctor
```

The doctor initializes MCP, lists tools and resources, calls only no-credit diagnostics, closes stdio, and verifies that the child process exits. CI runs typechecking, tests, the cross-platform build, and extension packaging on both Windows and Ubuntu.
