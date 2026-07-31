# Install

Choose the installation path that matches the client.

## Claude Desktop

Prefer the release `.mcpb` extension. It bundles the built server and dependencies, requests the KIE key through a sensitive configuration field, and does not require Node or terminal configuration.

1. Download `kie-creator-for-claude.mcpb` from the repository's latest GitHub release.
2. In Claude Desktop, open **Settings → Extensions → Advanced settings → Install Extension…**
3. Select the bundle and enter the user's KIE API key when Claude requests it.
4. Restart Claude Desktop or start a fresh conversation.
5. Confirm the KIE creation tools are visible.

## Agent-managed source checkout

Prefer a direct Node stdio registration when an agent is installing from source.

1. Run `npm ci` only when dependencies are missing or the lockfile changed.
2. Run `npm run build`.
3. Register the absolute built entry point:

```text
node /absolute/path/to/dist/src/index.js
```

4. Preserve the user's existing `KIE_API_KEY` in the agent's secret-backed MCP environment.
5. Set `KIE_ALLOW_LOCAL_FILE_UPLOADS=true` only when the user explicitly wants local uploads, and set `KIE_LOCAL_UPLOAD_ROOT` to one absolute folder containing only intended media.
6. Run `npm run mcp:doctor`.
7. Verify the saved registration with the agent's native MCP configuration command.
8. Start a fresh task or reload the agent if the current task cannot hot-load MCP changes.

Never place an API key in the repository, command arguments, logs, bundle contents, or skill files.

## Client routing

- Claude Desktop: use the `.mcpb` release.
- Cursor IDE or Agent CLI: use a global or project `.cursor/mcp.json` stdio entry.
- VS Code + GitHub Copilot: use user or workspace `mcp.json`; prefer a password input variable for the KIE key.
- JetBrains AI Assistant: add a global or project STDIO server in **Settings → Tools → AI Assistant → Model Context Protocol (MCP)**.
- Zed: add a local server in **Settings → AI → MCP Servers** using the `context_servers` shape.
- Cline: use the MCP Servers panel or `~/.cline/mcp.json`.
- Roo Code: use global MCP settings or project `.roo/mcp.json`.
- Windsurf / legacy Cascade: use `~/.codeium/windsurf/mcp_config.json`; do not confuse this with the newer Devin Local agent's separate configuration.
- Visual Studio: add a custom stdio MCP server from the Copilot Agent tool picker.
- Codex desktop or CLI: use `codex mcp add` with the built stdio entry point.
- Codex browser-assisted work: use the normal Codex MCP registration; the browser is a separate Codex tool.
- Claude Code: use `claude mcp add --transport stdio` with the built entry point.
- ChatGPT web: do not claim the local stdio server is compatible. It requires a hosted or securely tunneled remote MCP endpoint with per-user authentication.

Use the repository's `docs/INSTALL_OTHER_APPS.md` for app-specific copy/paste instructions and `docs/CLIENT_COMPATIBILITY.md` for the transport and support matrix.
