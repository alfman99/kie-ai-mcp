# Security

## Secrets

Never commit real KIE API keys, webhook HMAC keys, `.env`, generated MCP client config with live secrets, or bearer tokens.

Local stdio installations read secrets from environment variables:

- `KIE_API_KEY`
- `KIE_WEBHOOK_HMAC_KEY`

Use `.env.example` as a developer template only.

The HTTP relay requires the caller's KIE key on every request through `Authorization` or
`X-KIE-API-Key`. It ignores a server-side `KIE_API_KEY`. An optional `KIE_REMOTE_ACCESS_TOKEN`
adds a separate access gate. Keep these headers and tokens out of proxy logs.

## Reporting Issues

For security-sensitive reports, avoid posting live secrets or private media URLs in public issues. Open a minimal GitHub issue describing the affected area, or contact the repository owner through GitHub.

## Claude Desktop extension

The `.mcpb` manifest marks the KIE API key as sensitive. Claude Desktop stores sensitive extension settings using the operating system's secure credential storage and injects the key only when starting the local server.

The extension enables local file uploads so Claude can use reference media, but requires a dedicated media folder. The server canonicalizes both the configured folder and requested file, then rejects traversal and symlinks outside that folder. Do not select a home directory, repository root, or drive root.

Local installations send requests directly to KIE. The hosted relay receives each caller's key and
forwards requests to KIE; it does not store media. Each caller's task cache is separate and held in
memory. Remote callers cannot read the server's disk or upload files from their own local paths.

Both connections use KIE's official API and native upload endpoints. Read
[remote hosting](docs/REMOTE_SERVER.md) before operating a public relay.
