# Security

## Secrets

Never commit real KIE API keys, webhook HMAC keys, `.env`, generated MCP client config with live secrets, or bearer tokens.

This server expects secrets at runtime through environment variables:

- `KIE_API_KEY`
- `KIE_WEBHOOK_HMAC_KEY`

Use `.env.example` as a developer template only.

## Reporting Issues

For security-sensitive reports, avoid posting live secrets or private media URLs in public issues. Open a minimal GitHub issue describing the affected area, or contact the repository owner through GitHub.

## Claude Desktop extension

The `.mcpb` manifest marks the KIE API key as sensitive. Claude Desktop stores sensitive extension settings using the operating system's secure credential storage and injects the key only when starting the local server.

The extension enables local file uploads so Claude can use reference media, but requires a dedicated media folder. The server canonicalizes both the configured folder and requested file, then rejects traversal and symlinks outside that folder. Do not select a home directory, repository root, or drive root.

Requests and media are sent directly to KIE's official API and native upload endpoints. This project does not operate a proxy or media-storage service.
