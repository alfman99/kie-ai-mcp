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
5. Set `KIE_ALLOW_LOCAL_FILE_UPLOADS=true` only when the user explicitly wants the agent to read and upload local paths.
6. Run `npm run mcp:doctor`.
7. Verify the saved registration with the agent's native MCP configuration command.
8. Start a fresh task or reload the agent if the current task cannot hot-load MCP changes.

Never place an API key in the repository, command arguments, logs, bundle contents, or skill files.
