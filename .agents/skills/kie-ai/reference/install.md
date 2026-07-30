# Install

Prefer a direct Node stdio registration for a local source checkout. This avoids a Docker daemon dependency.

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

Never place an API key in the repository, Docker image, command arguments, logs, or skill files.
