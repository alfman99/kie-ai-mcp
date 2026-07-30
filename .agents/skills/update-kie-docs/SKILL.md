---
name: update-kie-docs
description: Refresh, verify, or inspect the KIE.AI MCP documentation catalogs from the latest official Kie documentation. Use when asked to update Kie models or endpoints, check catalog freshness or documentation drift, regenerate bundled Kie data, or refresh an external KIE_DOCS_DATA_DIR snapshot for an installed MCP server.
---

# Update Kie Docs

Keep the MCP catalogs synchronized with the official Kie documentation while preserving a reviewed last-known-good snapshot.

## Source Boundary

- Use `https://docs.kie.ai/llms.txt` as the only discovery index.
- Fetch only HTTPS URLs whose hostname and final redirect hostname are exactly `docs.kie.ai`.
- Never crawl example links or infer API behavior from third-party pages.
- Treat the official request example as authoritative when it conflicts with a stale schema model enum. Require the updater to record the conflict in `docs_manifest.json`.
- Do not hand-edit generated files in `src/data`.

## Choose the Workflow

Use the repository workflow when `package.json` contains the `docs:check` and `docs:update` scripts. Use the installed-snapshot workflow only when the user wants a machine-level external catalog refreshed.

### Repository Workflow

1. Run `git status --short` and preserve unrelated changes. Stop if generated catalog files already contain unexplained edits.
2. Install dependencies only when they are missing.
3. Run `npm run docs:check`.
4. If it reports no changed files, report the snapshot timestamp and stop without rewriting.
5. If drift exists and the user asked to update, run `npm run docs:update`.
6. Inspect `src/data/docs_manifest.json`, especially `sourceIndex`, counts, hashes, `failures`, and `schemaCorrections`.
7. Inspect `git diff -- src/data`. Confirm every source URL remains under `https://docs.kie.ai/`.
8. Compare changed canonical model IDs and endpoints against curated defaults in `src/server.ts` and operations in `src/products.ts`. Update curated adapters only when the official docs require it; do not auto-generate user-facing tool design.
9. Run `npm test`, `npm run typecheck`, `npm run build`, and `npm pack --dry-run`.
10. Tell the user to rebuild the Docker image or restart the Node MCP process. A running process never hot-loads a replaced snapshot.

### Installed External Snapshot

1. Require an explicit writable directory; do not mutate files inside an installed package or a running container.
2. Run `kie-ai-docs check --output /absolute/path/to/kie-docs`.
3. When an update is requested and drift exists, run `kie-ai-docs update --output /absolute/path/to/kie-docs`.
4. Configure the MCP process with `KIE_DOCS_DATA_DIR=/absolute/path/to/kie-docs`.
5. For Docker, mount the same host directory read-only at a stable container path and pass `KIE_DOCS_DATA_DIR` for that container path.
6. Restart the MCP process and call `kie_get_local_catalogs`. Verify `catalogSource` is `external` and the reported hash/timestamp matches the new manifest.

## Failure Rules

- Do not write on a fetch, redirect, parse, duplicate-model, malformed-field, provenance, or count validation failure.
- Do not use a partial crawl. Preserve the last-known-good snapshot and report the exact official URL that failed.
- Do not silently choose between conflicting duplicate model schemas.
- Do not claim Docker or a running MCP was updated until it is rebuilt/restarted or is configured to load the refreshed external directory.
- Do not run a live generation or consume Kie credits as part of documentation verification.

## Report

Return the official index URL, previous and new snapshot timestamps, page/operation/model counts, schema corrections, curated adapter changes, validation commands, and the required restart/rebuild step. Link changed models or endpoints to their exact official `docs.kie.ai` source pages.
