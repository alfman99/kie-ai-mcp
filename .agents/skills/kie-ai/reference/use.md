# Use KIE

## Workflow

1. Read the user's requested output, references, aspect ratio, duration, resolution, and audio needs.
2. Use `kie_upload_media` first for each local file, base64 payload, or remote asset that the selected model requires as a URL.
3. Use `kie_create_image`, `kie_create_video`, or `kie_create_speech` for ordinary requests.
4. Use `kie_market_get_model_schema` before supplying an explicit model or advanced input.
5. Submit once. If waiting is disabled or times out, retain the task ID and continue with `kie_get_creation`.
6. Return the task ID, status, selected model, and final KIE media URL when available.

When the client supports standard MCP progress notifications, let the friendly tools report live generation progress. Do not add a separate progress UI or repeatedly call a status tool while a wait-enabled call is active.

## Parallel media workflow

When the user asks for two or more independent videos:

1. Upload all local reference files with `kie_upload_media`.
2. Create one clearly labeled job per shot in one `kie_create_videos` call.
3. Set `waitForResult` to `false` so all jobs are submitted together and the client keeps every task ID.
4. Call `kie_get_creations` once with the returned `taskIds`, matching `labels`, and `waitForResult: true`.
5. Return the normalized status summary and direct media links.

Do not serialize independent shots by waiting for one video before you submit the next video. KIE can queue several accepted tasks at the same time. The KIE account and provider control how many tasks render at the same time.

For smoke tests, use `bytedance/seedance-2-mini`, 480p, 4 seconds, and no audio. Do not use the full Seedance 2 model when the user asks for the cheapest practical test.

Do not upload media when the selected KIE tool accepts the existing public URL directly and no durable KIE temporary URL is needed.

## Escalation

- Use `kie_market_create_task` for models not covered by friendly tools.
- Use `kie_product_get_operation_schema` before `kie_product_api_call` for documented product-specific APIs. Product calls are validated against the bundled official schema before submission.
- Never invent a model ID or request field. Inspect the local official-docs catalog.
