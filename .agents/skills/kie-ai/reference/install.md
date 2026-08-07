# Install

Choose the installation path that matches the client.

## Claude Desktop

Prefer the release `.mcpb` extension. It bundles the built server and dependencies, requests the KIE key through a sensitive configuration field, and does not require Node or terminal configuration.

1. Download `kie-ai-mcp.mcpb` from the repository's latest GitHub release.
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

- Claude: use the `.mcpb` release for Desktop or `claude mcp add --transport stdio` for Claude Code.
- ChatGPT / Codex: use `codex mcp add` for the current local release; ChatGPT web requires a hosted or securely tunneled remote endpoint with per-user authentication. Codex's browser is a separate tool.
- Cursor: use a global or project `.cursor/mcp.json` stdio entry; Cursor Agent uses the same configuration.
- VS Code + GitHub Copilot: use user or workspace `mcp.json`; prefer a password input variable for the KIE key.
- Windsurf: use legacy Cascade's `~/.codeium/windsurf/mcp_config.json`; the newer Devin Local agent has separate configuration.

Use the repository's `docs/INSTALL_OTHER_APPS.md` for app-specific copy/paste instructions and `docs/CLIENT_COMPATIBILITY.md` for the transport and support matrix.
