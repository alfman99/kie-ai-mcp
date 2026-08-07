# Changelog

## 0.3.0 - 2026-08-07

- Renamed the project and extension to KIE.AI MCP, with the `kie-ai-mcp` repository, package, server, and release-asset names.
- Reorganized the README into a shorter creator-first quick start with focused links to installation, compatibility, technical, privacy, cost, and troubleshooting documentation.

## 0.2.3 - 2026-08-07

- Updated transitive `fast-uri`, `hono`, and `ip-address` dependencies to patched releases, resolving five Dependabot advisories covering host confusion, SSRF/trust-boundary bypasses, and CORS middleware ReDoS.

## 0.2.2 - 2026-08-07

- Refreshed the official KIE documentation snapshot from 244 to 254 pages, 210 to 220 OpenAPI operations, and 119 to 128 Market models.
- Added nine newly documented models across Seedance 2.5, MiniMax H3, Qwen3, and Seedream 5 Pro Layer Decomposition.
- Added Seedance 2.5 to the friendly video tool with its official duration, resolution, reference-media, prompt, and output-format limits.
- Updated changed official schemas for existing Grok, Wan, Topaz, Omnihuman, Bytedance, Hailuo, Qwen, Seedream, Flux, and Z-Image models.

## 0.2.1 - 2026-07-31

- Added focused setup guidance for Claude, ChatGPT/Codex, Cursor, VS Code/Copilot, and Windsurf.
- Documented the separate remote HTTPS requirement for ChatGPT web instead of misrepresenting the local stdio release as browser-compatible.
- Restricted local reference uploads to a required, user-selected media folder with canonical-path and symlink containment.
- Replaced Unix-only build commands with a cross-platform Node build and added Windows CI coverage.
- Added release tag/version validation and a SHA-256 checksum asset.
- Aligned the MCP protocol version with the package and extension release version.
- Refreshed the official KIE snapshot for current safety-checker fields across Bytedance, Hailuo, Qwen2, and Z-Image schemas.

## 0.2.0 - 2026-07-30

- Added a one-file Claude Desktop extension with secure KIE key configuration and bundled runtime dependencies.
- Repositioned the project as KIE Creator for Claude, a pay-as-you-go alternative to subscription-based creative MCPs.
- Rewrote the README for non-technical creators and moved source installation, tools, configuration, and maintenance details to a technical reference.
- Removed Docker, Docker Compose, Docker scripts, and container-specific documentation.
- Added validated `.mcpb` release packaging and an automated tagged-release workflow.
- Fixed `$kie-ai update` handling of the updater's intentional drift-detected exit status.
- Refreshed the official snapshot for the latest Market schema changes, including `nsfw_checker` placement across Seedance, Bytedance, Wan, and Qwen2 models.
- Added a deterministic `$kie-ai update` maintenance script with checkout discovery, no-op drift checks, full release validation, and generated-snapshot rollback on failure.
- Added the `kie-ai-docs` official-documentation sync CLI and routed, repo-scoped `$kie-ai` agent skill.
- Added provenance hashes, freshness metadata, schema-conflict reporting, transactional snapshot replacement, and an optional validated `KIE_DOCS_DATA_DIR`.
- Added executable-endpoint correction records for the three native KIE upload APIs when stale OpenAPI server declarations conflict with official request URLs.
- Added `kie_upload_media`, native file-backed multipart streaming, and an MCP doctor that verifies initialization, discovery, optional live authentication, shutdown, and child-process cleanup.
- Refreshed the bundled snapshot from `https://docs.kie.ai/llms.txt` to 244 pages, 210 OpenAPI operations, 78 paths, and 119 unique Market models.
- Corrected the Suno voice-availability operation to the officially documented `POST` method.
- Added updater rollback, origin, schema-invariant, package, MCP-resource, and curated-operation conformance coverage.
- Added official-schema validation for Market inputs and product-specific query/body parameters, plus a product operation schema discovery tool.
- Aligned friendly GPT Image 2, Seedance 2, and ElevenLabs Turbo 2.5 limits and cross-field rules with their official KIE schemas.
- Added exponential Market task polling and robust OpenAPI fence parsing for official pages containing nested code examples.

## 0.1.0 - 2026-07-02

- Initial local MCP server for KIE.AI.
- Added friendly creation tools for image, video, speech, and task result polling.
- Added raw KIE Market, product API, upload, credits, download URL, webhook verification, and local documentation tools.
- Bundled docs-derived KIE endpoint and model catalogs from the official KIE documentation crawl.
- Added MCP client examples, tests, and direct stdio MCP smoke verification.
