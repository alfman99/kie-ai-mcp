# Use KIE

## Workflow

1. Read the user's requested output, references, aspect ratio, duration, resolution, and audio needs.
2. Use `kie_upload_media` first for each local file, base64 payload, or remote asset that the selected model requires as a URL.
3. Use `kie_create_image`, `kie_create_video`, or `kie_create_speech` for ordinary requests.
4. Use `kie_market_get_model_schema` before supplying an explicit model or advanced input.
5. Submit once. If waiting is disabled or times out, retain the task ID and continue with `kie_get_creation`.
6. Return the task ID, status, selected model, and final KIE media URL when available.

Do not upload media when the selected KIE tool accepts the existing public URL directly and no durable KIE temporary URL is needed.

## Escalation

- Use `kie_market_create_task` for models not covered by friendly tools.
- Use `kie_product_get_operation_schema` before `kie_product_api_call` for documented product-specific APIs. Product calls are validated against the bundled official schema before submission.
- Never invent a model ID or request field. Inspect the local official-docs catalog.
