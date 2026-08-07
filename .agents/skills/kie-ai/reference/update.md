# Update Official Docs

Resolve the `kie-ai-mcp` source checkout, then run the bundled maintenance script from this skill:

```bash
node "<skill-directory>/scripts/update-kie-mcp.mjs" --repo "/absolute/path/to/kie-ai-mcp"
```

The script:

1. Checks `https://docs.kie.ai/llms.txt` and stops without writes when the snapshot is current.
2. Refuses to overwrite existing generated-catalog changes.
3. Updates the official snapshot only when drift exists.
4. Runs typecheck, tests, build, MCP doctor, package dry-run, and a final drift check.
5. Restores the previous generated snapshot if post-update validation fails.

Use `--check-only` to report drift without updating. If `--repo` is omitted, the script tries `KIE_MCP_REPO`, the current directory, and the Codex `kie-ai` registration.

After a successful update:

1. Inspect the manifest and generated-data diff.
2. Compare changed models and endpoints with curated tools in `src/server.ts` and `src/products.ts`.
3. Restart the MCP process.
4. Call `kie_get_local_catalogs` and verify its manifest matches the refreshed files.
5. Commit and push only when the user authorized repository changes.

Abort without replacing the last-known-good snapshot on any fetch, redirect, parse, provenance, duplicate, or schema validation failure.
