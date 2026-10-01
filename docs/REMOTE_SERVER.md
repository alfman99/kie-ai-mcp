# Host a KIE.AI MCP server with Docker and Coolify

KIE.AI MCP can run as a Streamable HTTP relay. Clients connect to a URL and send their own KIE key
with every request. The relay forwards requests to KIE and charges the caller's account.
It does not need a shared server-side KIE key.

The project's public instance is `https://kie-mcp.alfredomanresa.com/mcp`.
It is an independent deployment, not a KIE.ai service. To use it, follow the
[README setup](../README.md#connect-to-the-hosted-server) or [app-by-app instructions](INSTALL_OTHER_APPS.md#remote-setup).
The steps below are for hosting your own instance.

## Endpoints

| Path | Method | Purpose |
| --- | --- | --- |
| `/` | `GET` / `HEAD` | Connection instructions |
| `/mcp` | `POST` | MCP requests |
| `/healthz` | `GET` | Health check, including transport and tenant count |

The MCP transport is stateless: clients send each JSON-RPC message with `POST`.
`GET /mcp` returns `405`; the server does not keep a stream for clients to resume.

## Authentication

Clients send their KIE key in one of these headers:

```text
Authorization: Bearer <KIE_API_KEY>
X-KIE-API-Key: <KIE_API_KEY>
```

A request without a key returns `401`. The server ignores its own `KIE_API_KEY` in HTTP mode.
Each client's key passes through the relay to KIE. Keep authentication headers out of proxy logs.

To restrict access to the deployment, set `KIE_REMOTE_ACCESS_TOKEN`. Clients must then also send
`X-KIE-Access-Token` with that value. This gate is separate from each caller's KIE key.
The server does not implement OAuth; see [client compatibility](CLIENT_COMPATIBILITY.md).

## Run from source

After [building the project](INSTALL_OTHER_APPS.md#one-time-source-setup):

```bash
npm run start:http
```

The listener uses `HOST=0.0.0.0` and `PORT=3000` by default. Other `KIE_*` settings apply except
that caller keys replace `KIE_API_KEY`, local file uploads are disabled, and API prewarming is disabled.

## Deploy on Coolify

1. Create an Application from this Git repository, branch `main`.
2. Select the **Dockerfile** build pack and the root `Dockerfile`.
3. Set the container port to `3000`.
4. Set your domain. The public instance uses `https://kie-mcp.alfredomanresa.com`.
5. Set the health check path to `/healthz`.
6. Set `KIE_REMOTE_ACCESS_TOKEN` only if you need the extra gate. A KIE key is not required in server configuration.
7. Point the domain's DNS record at the Coolify host before deploying.

Coolify's proxy terminates TLS. The proxy must pass `text/event-stream` responses without buffering.
Use HTTPS for client connections.

## Verify the deployment

```bash
curl -fsS https://kie-mcp.alfredomanresa.com/healthz
```

Load `KIE_API_KEY` in your terminal, then check the authenticated tool list:

```bash
curl -sN -X POST https://kie-mcp.alfredomanresa.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Add the access-token header if you enabled the gate. These checks do not generate media.
Use your own domain when testing a different deployment.

## Uploading local files

A remote server cannot read the caller's disk. `kie_upload_media` with `sourceType: "local_file"`
is unavailable in HTTP mode. The relay's error and connection instructions explain how to send a
file directly to KIE instead:

```bash
curl -X POST "https://kieai.redpandaai.co/api/file-stream-upload" \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -F file=@/absolute/path/reference.png \
  -F uploadPath=agent-uploads
```

Pass the returned `downloadUrl` to a creation tool. The relay provides no separate upload endpoint.
Public URL and small base64 uploads remain available through `kie_upload_media`.
KIE upload URLs are temporary; they are not permanent file storage.

## State and storage

Each request creates an MCP server for that caller's key. Task submissions and finished results
are cached in memory per caller, using a SHA-256 hash of the key as the identifier. The tenant cache
is bounded and expires after an hour of inactivity. Restarting the relay clears its caches;
accepted tasks still run at KIE and can be checked by task ID.

The relay does not store media or allow remote callers to read its disk.

[Documentation index](README.md)
