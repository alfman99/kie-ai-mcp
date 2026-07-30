# Changelog

## Unreleased

- Added the `kie-ai-docs` official-documentation sync CLI and routed, repo-scoped `$kie-ai` agent skill.
- Added provenance hashes, freshness metadata, schema-conflict reporting, transactional snapshot replacement, and an optional validated `KIE_DOCS_DATA_DIR`.
- Added executable-endpoint correction records for the three native KIE upload APIs when stale OpenAPI server declarations conflict with official request URLs.
- Added `kie_upload_media`, native file-backed multipart streaming, and an MCP doctor that verifies initialization, discovery, optional live authentication, shutdown, and child-process cleanup.
- Refreshed the bundled snapshot from `https://docs.kie.ai/llms.txt` to 244 pages, 210 OpenAPI operations, 78 paths, and 118 unique Market models.
- Corrected the Suno voice-availability operation to the officially documented `POST` method.
- Added updater rollback, origin, schema-invariant, package, MCP-resource, and curated-operation conformance coverage.

## 0.1.0 - 2026-07-02

- Initial Docker-ready local MCP server for KIE.AI.
- Added friendly creation tools for image, video, speech, and task result polling.
- Added raw KIE Market, product API, upload, credits, download URL, webhook verification, and local documentation tools.
- Bundled docs-derived KIE endpoint and model catalogs from the official KIE documentation crawl.
- Added Docker, Docker Compose, MCP client examples, tests, and direct Docker MCP smoke verification.
