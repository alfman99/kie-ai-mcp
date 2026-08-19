# Changelog

## 1.1.1 - 2026-08-19

Removes the `POST /upload` endpoint added in 1.1.0. It did not buy what its release notes claimed:
the key a caller connects with is the same key KIE's own upload API accepts, so the endpoint proxied
a request the agent could already make directly. 1.1.0 described this as making local files "work
against the hosted relay", which was wrong — nothing was unlocked, only rerouted through an extra
hop.

- Removed `POST /upload`, along with `KIE_PUBLIC_URL` and `KIE_MAX_UPLOAD_BYTES`, which only existed
  to serve it. It also authenticated nothing: it checked that a bearer token was present, not that
  it was valid, leaving a deployment without `KIE_REMOTE_ACCESS_TOKEN` acting as an open 100MB
  proxy to KIE for anyone.
- Kept what actually changed agent behaviour, repointed at KIE. The server instructions, the
  `kie_upload_media` description, and the error for a `local_file` attempt still carry an exact
  working command; it now names `/api/file-stream-upload` on the configured KIE upload host instead
  of this server. That error is still classified as an input error rather than unknown, so an agent
  is not advised to retry a call that can never succeed.

The MCP surface is unchanged in both releases: `allowLocalFileUploads` stays false on the relay and
`sourceType: "local_file"` remains unavailable over MCP. What a remote agent gains is being told
where to send the bytes, not a transfer through MCP.

## 1.1.0 - 2026-08-19

Local files now work against the hosted relay. A remote server has no access to the caller's disk and
must never touch its own, which left base64 as the only route — unusable in practice, since a 1MB
image is roughly 350k tokens of context.

- Added `POST /upload` to the remote server. It takes a `multipart/form-data` file off the wire and
  forwards it to KIE's temporary File Upload API under the caller's own key, returning the resulting
  URL. Authentication matches `/mcp`. The body is streamed socket to socket and never buffered or
  written to disk, so a large file costs one connection and no memory.
- Added `uploadPath` and `fileName` as query parameters on that endpoint. Both are validated — the
  path against the same rules as the tools, the name against anything that could break out of the
  multipart header — and injected into the body, so the form itself needs only a `file` field.
- Added `KIE_MAX_UPLOAD_BYTES` (default 100MB, KIE's own ceiling). An oversized upload is refused with
  `413`, before forwarding when `Content-Length` declares it and mid-stream otherwise.
- Added the endpoint to what agents are told: the server instructions, the `kie_upload_media`
  description, and the error returned for a `local_file` attempt now all carry the exact command.
  Previously that error read as a misconfiguration to fix, naming an environment variable a remote
  caller has no way to set. This guidance appears only when running as the relay.
- Added `KIE_PUBLIC_URL` for deployments behind a proxy that does not send `X-Forwarded-Host` or
  `X-Forwarded-Proto`. It is what the addresses handed to agents are built from.

## 1.0.0 - 2026-08-19

Deciding whether a KIE task finished, failed, or is still running is now read from one place, against
the documented contract of `GET /api/v1/jobs/recordInfo`. This was the largest source of tasks that
appeared to hang, and of failures reported as flaky infrastructure.

- Fixed a failed generation being reported as still processing. `recordInfo` answers HTTP 200 with an
  envelope `code`, and `501 Generation Failed` and `408` (upstream produced nothing for over ten
  minutes) both mean the task is finished and unsuccessful. Those were being thrown as generic server
  errors and retried six times before surfacing as an infrastructure fault. They now end the wait
  immediately and report the failure with its code.
- Fixed a freshly created task being declared dead. `recordInfo` can briefly answer `422 recordInfo is
  null` or `404 Task not found` before a just-submitted task becomes queryable; `422` was classified as
  a caller input error and aborted the whole wait on the first poll. A not-yet-queryable record now
  gets its own 90-second grace budget, separate from the consecutive-error allowance, and a task id
  that never appears fails with a message saying so instead of timing out.
- Fixed the task state being read from the wrong field. The documented field is `data.state`; `status`
  is now only a fallback. The two readers in this server disagreed about which came first.
- Added `outcome` to every generation row — `pending`, `success`, `failed`, or `unrecognized` — as the
  single field callers should branch on. An undocumented state is reported as unfinished and named,
  rather than being silently treated as either done or broken.
- Fixed generated assets being mixed up with echoed input URLs. Results are now read from the fields
  the reference documents (`resultUrls`, `firstFrameUrl`/`lastFrameUrl`, `resultObject.mask_urls`) in
  their documented order, with a whole-payload scan kept only as a fallback.
- Added the non-URL `resultObject` to the result, for models documented to return one, and surfaced
  `failCode` alongside `failMsg`.
- A task KIE calls successful but returns nothing for is now flagged instead of reported as a clean
  success with an empty URL list.
- A wait that times out now names the last state KIE reported and says to collect the task rather than
  resubmit it.
- `kie_get_creation` now states the documented result-URL lifetime (as little as 24 hours, with generated media deleted after 14 days), and `kie_get_download_url` states that the link it returns expires after 20 minutes.
- Fixed generation requests being able to exceed KIE's documented account rate limit. KIE allows 20 new
  generation requests per 10 seconds and does **not** queue the excess — it rejects it, so an overrun lost
  work rather than delaying it. `KIE_MAX_CONCURRENT_REQUESTS` capped concurrency, not rate, and nothing
  retried a refused submission. Task creation now takes a slot from a sliding window before being sent, and
  a submission refused with 429 is re-sent honouring `Retry-After`. Only 429 is retried: a create request
  that may have landed is never sent twice. Tunable via `KIE_GENERATION_RATE_LIMIT`,
  `KIE_GENERATION_RATE_WINDOW_MS`, and `KIE_GENERATION_MAX_RETRIES`.
- Verified all 47 endpoints this server calls against the endpoint catalog extracted from the official docs:
  every path and method matches.
- Refreshed the official documentation snapshot to 2026-08-19. Same page, operation, and model counts, with
  upstream schema corrections picked up (Grok Imagine Image 2.0 segment-map inputs, a removed `nsfw_checker`
  field, clarified `task_id` semantics).
- `kie_upload_media` and the transport-specific upload tools now state the documented limits they are subject
  to: uploads are deleted after 3 days, base64 is for small files with the stream path preferred above 10MB,
  and URL uploads must resolve within a 30 second download timeout under a ~100MB ceiling.
- Polling now runs at a flat 3 second cadence by default, matching the interval KIE recommends for
  `recordInfo`. The fast initial ramp and the long-render ease are still implemented and still configurable
  via `KIE_POLL_FIRST_DELAY_MS` and `KIE_POLL_MAX_INTERVAL_MS`; they are simply inert at the new defaults.
- Added a landing page at `/` on the hosted relay, so someone who opens the bare hostname gets a short
  explanation, a copy-paste client configuration, a one-click-copy prompt they can hand to their IDE agent,
  and a link to the source, instead of a JSON 404.
- Cut the README roughly in half. It now leads with the agent prompt that does the setup, and sends readers to
  the site for the rest rather than repeating it.
- Documented throughout that this is an unofficial, community-built server with no affiliation to the
  KIE.ai team, and that the hosted instance is not run by them either.
- Rewrote the README around the hosted server as the default path, with local stdio installation as the
  alternative for anyone who wants local file uploads or wants nothing but API calls leaving their machine.
- Added a remote Streamable HTTP transport so the server can be hosted at a URL and used without installing anything locally. `npm run start:http` serves `POST /mcp` plus a `/healthz` probe, and a root `Dockerfile` deploys it on any container host.
- Made the hosted path a multi-tenant relay: every request carries its own KIE key in an `Authorization: Bearer` or `X-KIE-API-Key` header, so many people share one deployment without sharing credits. The relay keeps no key of its own, refuses keyless requests, and disables local file uploads. Optional `KIE_REMOTE_ACCESS_TOKEN` gates the deployment itself.

## 0.7.0 - 2026-08-18

- Refreshed the official KIE documentation snapshot from 254 to 264 pages, 220 to 230 OpenAPI operations, and 128 to 135 Market models. No model or endpoint was removed.
- Added seven newly documented models: Kling 3.0 Omni (text-to-video, image-to-video, reference-to-video, transformation) and Grok Imagine Image 2.0 (text-to-image, image-edit, segment-map).
- Fixed Seedance 2.5 rejecting inputs KIE now accepts. The catalog widened it to 1080p output and a 30000 character prompt, but hardcoded copies of the old limits still refused both.
- Stopped restating per-field model limits in the friendly video tool. Resolution and format enums, prompt length, reference-array sizes, and unsupported fields are now validated straight from the official catalog, so a `docs:update` keeps them correct instead of leaving hardcoded copies to drift. Cross-field rules that no schema can express are unchanged.
- Raised the video prompt ceiling to the highest documented model limit; the narrower per-model limits are still enforced before any billable request.

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
