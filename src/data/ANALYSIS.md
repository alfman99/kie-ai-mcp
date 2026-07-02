# KIE.AI MCP Server Research Analysis

Research date: 2026-07-02

## Crawl Coverage

- Seeded from the official docs root and `https://docs.kie.ai/llms.txt`.
- Crawled official `docs.kie.ai` pages up to depth 3.
- Collected 258 official documentation pages with 0 remaining crawl errors.
- Extracted 176 OpenAPI operations across 53 OpenAPI-declared paths.
- Built a unified endpoint index with 59 API paths mentioned in docs.
- Built a market model registry with 114 model-specific schemas for `POST /api/v1/jobs/createTask`.

Local artifacts:

- `crawl_manifest.json`: fetched pages, source URLs, local raw-file mapping.
- `OPENAPI_CATALOG.md` / `openapi_endpoint_catalog.json`: normalized OpenAPI operation inventory.
- `ENDPOINT_INDEX.md` / `endpoint_index.json`: broader endpoint mentions from all crawled docs.
- `MARKET_MODEL_REGISTRY.md` / `market_model_registry.json`: model-aware schemas for the unified Market endpoint.
- `raw/`: fetched official docs pages.

## Global API Rules

- Main API base URL: `https://api.kie.ai`.
- File upload base URL: `https://kieai.redpandaai.co`.
- Auth: `Authorization: Bearer <YOUR_API_KEY>`.
- JSON endpoints use `Content-Type: application/json`.
- Generation endpoints are asynchronous: a successful create request returns HTTP 200 plus a task id, not the generated result.
- Result retrieval uses either a user-provided `callBackUrl` or polling record/detail endpoints.
- Default generation rate limit: 20 new generation requests per 10 seconds per account.
- Generated media retention: 14 days.
- Log/text metadata retention: 2 months.
- Uploaded files are temporary. The quickstart says 24 hours; one stream-upload detail page says 3 days, so the MCP docs should treat uploads as short-lived and prefer 24 hours unless KIE confirms otherwise.

## Error Handling

Common response codes documented across APIs:

- `200`: success.
- `400`: bad request, especially upload validation.
- `401`: missing or invalid authentication.
- `402`: insufficient credits.
- `404`: missing resource or endpoint.
- `408`: upstream service delay/no result for over 10 minutes.
- `422`: request validation error.
- `429`: rate limited.
- `433`: callback-related failure appears in some generated schemas.
- `455`: service unavailable or maintenance.
- `500`: server error.
- `501`: generation failed.
- `505`: feature disabled.

Implementation implication: the MCP client should treat non-2xx HTTP statuses and JSON `code != 200` as failures, preserving `code`, `msg`, and raw `data` in structured MCP errors.

## Core Utility APIs

Main sources:

- `https://docs.kie.ai/common-api/quickstart.md`
- `https://docs.kie.ai/common-api/get-account-credits.md`
- `https://docs.kie.ai/common-api/download-url.md`
- `https://docs.kie.ai/market/common/get-task-detail.md`

Endpoints:

- `GET /api/v1/chat/credit`: returns current credit balance in `data`.
- `POST /api/v1/common/download-url`: body `url`; returns a temporary direct download URL valid for about 20 minutes.
- `GET /api/v1/jobs/recordInfo`: query `taskId`; unified Market task polling endpoint.

Market task status values documented on the unified record endpoint:

- `waiting`
- `queuing`
- `generating`
- `success`
- `fail`

Market result payloads commonly include `resultJson` as a JSON string. The MCP server should parse it when possible and also return the raw string.

## File Upload APIs

Base URL: `https://kieai.redpandaai.co`

Endpoints:

- `POST /api/file-url-upload`: JSON body `fileUrl`, `uploadPath`, optional `fileName`.
- `POST /api/file-base64-upload`: JSON body `base64Data`, `uploadPath`, optional `fileName`.
- `POST /api/file-stream-upload`: multipart body `file`, `uploadPath`, optional `fileName`.

Typical response shape:

- `success`
- `code`
- `msg`
- `data.fileName`
- `data.filePath`
- `data.downloadUrl`
- `data.fileSize`
- `data.mimeType`
- `data.uploadedAt`

Implementation implication: expose three separate upload tools rather than one overloaded tool, because JSON upload and multipart upload need different client handling.

## Webhook Verification

Source: `https://docs.kie.ai/common-api/webhook-verification.md`

When HMAC verification is enabled, callbacks include:

- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

Signature rule:

```text
base64(HMAC-SHA256(taskId + "." + timestamp, webhookHmacKey))
```

Docs inconsistently refer to callback task ids as `taskId` and `task_id`; implementation should support both by checking `data.taskId`, `data.task_id`, top-level `taskId`, and top-level `task_id`.

## Unified Market Models

The majority of image, video, and some audio model pages use:

- `POST /api/v1/jobs/createTask`
- body includes `model`, optional/recommended `callBackUrl`, and model-specific `input`
- response includes `data.taskId`
- poll with `GET /api/v1/jobs/recordInfo?taskId=...`

The local registry found 114 model-specific OpenAPI schemas for this endpoint.

Major families:

- Image: Seedream, Z-Image, Google Imagen/Nano Banana, Flux-2, Grok Imagine, GPT Image, Topaz, Recraft, Ideogram, Qwen/Qwen2, Wan image.
- Video: Grok Imagine, Kling, Bytedance/Seedance, Hailuo, Wan, Topaz, Infinitalk, HappyHorse, Gemini Omni, OmniHuman, Volcengine.
- Audio-ish Market models: ElevenLabs audio isolation, TTS, dialogue.

Recurring `input` fields:

- `prompt`
- `image_url` / `image_urls`
- `video_url` / `video_urls`
- `audio_url`
- `aspect_ratio` / `aspectRatio`
- `resolution`
- `duration`
- `seed`
- `negative_prompt`
- `nsfw_checker`
- `watermark`
- `output_format`

Implementation implication: the MCP server should provide:

- a generic `kie_market_create_task` tool accepting `model` and `input`;
- a `kie_market_list_models` tool backed by the local registry;
- optional model-aware validation using the extracted schema for known models;
- a `kie_market_get_task` polling tool;
- a convenience `kie_market_wait_for_task` tool with bounded polling.

## Product-Specific APIs

### 4o Image

- `POST /api/v1/gpt4o-image/generate`
- `GET /api/v1/gpt4o-image/record-info`
- `POST /api/v1/gpt4o-image/download-url`

### Flux Kontext

- `POST /api/v1/flux/kontext/generate`
- `GET /api/v1/flux/kontext/record-info`

### Runway

- `POST /api/v1/runway/generate`
- `POST /api/v1/runway/extend`
- `GET /api/v1/runway/record-detail`
- `POST /api/v1/aleph/generate`
- `GET /api/v1/aleph/record-info`

### Suno

Music and audio endpoints include:

- `POST /api/v1/generate`
- `POST /api/v1/generate/extend`
- `POST /api/v1/generate/upload-cover`
- `POST /api/v1/generate/upload-extend`
- `POST /api/v1/generate/add-instrumental`
- `POST /api/v1/generate/add-vocals`
- `POST /api/v1/generate/replace-section`
- `POST /api/v1/generate/mashup`
- `POST /api/v1/generate/sounds`
- `GET /api/v1/generate/record-info`
- `POST /api/v1/lyrics`
- `GET /api/v1/lyrics/record-info`
- `POST /api/v1/wav/generate`
- `GET /api/v1/wav/record-info`
- `POST /api/v1/vocal-removal/generate`
- `GET /api/v1/vocal-removal/record-info`
- `POST /api/v1/midi/generate`
- `GET /api/v1/midi/record-info`
- `POST /api/v1/mp4/generate`
- `GET /api/v1/mp4/record-info`
- `POST /api/v1/voice/validate`
- `GET /api/v1/voice/validate-info`
- `POST /api/v1/voice/generate`
- `GET /api/v1/voice/record-info`
- `POST /api/v1/voice/regenerate`
- `GET /api/v1/voice/check-voice`

### Veo3.1

- `POST /api/v1/veo/generate`
- `GET /api/v1/veo/record-info`
- `GET /api/v1/veo/get-1080p-video`
- `POST /api/v1/veo/get-4k-video`
- `POST /api/v1/veo/extend`

### Chat / LLM Proxy APIs

The docs include OpenAI-style and vendor-style chat proxy endpoints, including:

- `/gpt-5-2/v1/chat/completions`
- `/codex/v1/responses`
- `/api/v1/responses`
- `/claude/v1/messages`
- Gemini OpenAI-style `/v1/chat/completions` endpoints under model-specific prefixes.
- Gemini native-style `:streamGenerateContent` endpoints.

Implementation implication: these should be a second-phase MCP surface unless the user wants the first version to include LLM proxying. Media/task APIs are more naturally useful as MCP tools; chat proxying overlaps with agent model configuration.

## Recommended MCP Server Shape

Recommended implementation: TypeScript MCP server using `@modelcontextprotocol/sdk`, Zod schemas, Node 20+, stdio transport by default.

Recommended first-class tools:

- `kie_get_credits`
- `kie_get_download_url`
- `kie_upload_file_from_url`
- `kie_upload_file_base64`
- `kie_upload_file_stream`
- `kie_market_list_models`
- `kie_market_get_model_schema`
- `kie_market_create_task`
- `kie_market_get_task`
- `kie_market_wait_for_task`
- `kie_verify_webhook_signature`
- product-specific helpers for 4o Image, Flux Kontext, Runway, Suno, and Veo3.1 where schemas are stable enough.

Recommended resources:

- `kie://docs/openapi-catalog`
- `kie://docs/market-model-registry`
- `kie://docs/endpoint-index`

Recommended configuration:

- `KIE_API_KEY` required.
- `KIE_API_BASE_URL` optional, default `https://api.kie.ai`.
- `KIE_UPLOAD_BASE_URL` optional, default `https://kieai.redpandaai.co`.
- `KIE_WEBHOOK_HMAC_KEY` optional.
- `KIE_POLL_INTERVAL_MS` optional.
- `KIE_POLL_TIMEOUT_MS` optional.

## Historical Product Decisions

These choices shaped the first public release:

1. Implementation language/runtime: TypeScript is recommended, but Python is also reasonable if your agent stack prefers it.
2. First release scope: media/task APIs only, or include chat/LLM proxy endpoints too.
3. Validation strictness: strict model-specific validation from the extracted OpenAPI schemas, permissive pass-through, or hybrid.
4. Transport: stdio only for local agents, or stdio plus HTTP/SSE.
5. Secret handling: env vars only, or support a local `.env` file.
6. Live API testing: avoid real KIE calls by default, or run opt-in smoke tests if `KIE_API_KEY` is present.
