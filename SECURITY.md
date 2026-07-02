# Security

## Secrets

Never commit real KIE API keys, webhook HMAC keys, `.env`, generated MCP client config with live secrets, or bearer tokens.

This server expects secrets at runtime through environment variables:

- `KIE_API_KEY`
- `KIE_WEBHOOK_HMAC_KEY`

Use `.env.example` as a template only.

## Reporting Issues

For security-sensitive reports, avoid posting live secrets or private media URLs in public issues. Open a minimal GitHub issue describing the affected area, or contact the repository owner through GitHub.

## Runtime Notes

The recommended Docker stdio setup runs one local container per MCP client session. The image does not contain API keys. Keys are passed into the container at runtime.
