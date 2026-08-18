# Changelog

## 0.6.0 - 2026-08-18

Breaking: the create tools now take a `jobs` array, and the batch variants added in 0.5.0 are gone.
`kie_create_images`, `kie_create_videos`, and `kie_create_speeches` are folded into `kie_create_image`,
`kie_create_video`, and `kie_create_speech`; `kie_get_creations` is folded into `kie_get_creation`,
which now takes `taskIds`. One tool per media type, always parallel-shaped, so an agent has no
single-versus-batch decision to get wrong and no reason to loop.

- Cut the default tool surface from 25 tools and about 6,800 tokens of schema per model request to 11 tools and about 4,000. `KIE_TOOL_PROFILE=full` restores the advanced upload, Market status, product-API, webhook, and catalog tools.
- Added `idempotencyKey` to every create tool. Reusing a key replays the original submission instead of paying for a second generation, and a duplicate arriving while the first is in flight joins it rather than racing it. Keys are scoped per job position, so two deliberately identical jobs in one call still produce two tasks.
- Added an in-memory cache for finished tasks, so repeated status checks return instantly without touching the network.
- Added `category`, `retryable`, and `nextStep` to every error, so automated callers branch on fields instead of parsing messages.
- A call is now marked `isError` only when every job failed; a partial success stays a success with per-job error rows.
- Rewrote the server instructions around the parallel-by-default workflow, idempotency, and the error contract.
- Added a startup connection pre-warm so the first live call skips DNS, TCP, and the TLS handshake. Disable with `KIE_PREWARM_CONNECTION=false`.
- Single-job progress messages now report the task status instead of a "1/1 finished" tally.
- Added `KIE_TOOL_PROFILE`, `KIE_SUBMISSION_TTL_MS`, `KIE_RESULT_CACHE_TTL_MS`, and `KIE_PREWARM_CONNECTION`.

## 0.5.0 - 2026-08-18

- Removed the exponential backoff that was applied to healthy status polls. The cadence now ramps quickly to a steady interval and only eases for clearly long renders, cutting average result-detection lag from about 13s to about 1.4s and worst case from about 30s to under 4s on a typical video.
- Added a fast first status re-check (about 0.6s) so short image and voice jobs are returned almost as soon as KIE finishes them.
- Reserved exponential backoff for failures only, and honoured `Retry-After` when KIE rate limits a status check.
- Added a per-request deadline so one stalled socket is retried instead of consuming the whole wait budget, and raised the transient-failure tolerance from three consecutive errors to six.
- Added `kie_create_images` and `kie_create_speeches` for parallel submission of up to 16 independent image or voice jobs, closing the gap where only video had a parallel tool.
- Kept batches alive when one job fails validation: the bad job is reported on its own row and the rest are still submitted.
- Added jittered poll sleeps and a `KIE_MAX_CONCURRENT_REQUESTS` ceiling so parallel batches do not reach KIE in one synchronized burst.
- Made progress notifications coalescing and non-blocking, so parallel poll loops no longer queue behind each other's client notifications.
- Added `KIE_POLL_FIRST_DELAY_MS`, `KIE_POLL_MAX_INTERVAL_MS`, `KIE_POLL_EASE_AFTER_MS`, `KIE_REQUEST_TIMEOUT_MS`, and `KIE_MAX_CONCURRENT_REQUESTS`, and lowered the default `KIE_POLL_INTERVAL_MS` from 3000 to 2500.

## 0.4.0 - 2026-08-10

- Added parallel submission for up to 16 independent Seedance video jobs and parallel status checks for up to 32 KIE tasks.
- Added standard MCP progress notifications with heartbeat updates, cancellation, request deadlines, and retry rules for temporary status failures.
- Added normalized friendly-tool results with structured task IDs, partial-failure handling, direct media links, and URL-derived MIME types.
- Preserved accepted KIE task IDs when waiting fails, so users can resume a paid task without submitting it again.
- Added Seedance 2 Fast and Seedance 2 Mini support, including a low-cost Mini smoke-test workflow.
- Split friendly media tools, Market task submission, progress reporting, and result formatting into focused modules.

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
