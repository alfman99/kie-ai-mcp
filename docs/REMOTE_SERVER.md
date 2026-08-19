# Remote MCP server (Streamable HTTP)

The same tool set that runs over stdio can be hosted at a URL, so clients only add a server entry —
nothing to download or install.

The hosted server is a **relay**. It holds no KIE credentials: every caller sends their own KIE API
key on each request, and the relay spends only that key's credits. Many people can use one
deployment at the same time with different keys.

A public instance runs at **`https://kie-mcp.alfredomanresa.com/mcp`** — see the
[quick start](../README.md#quick-start-the-hosted-server) to connect to it. It is an unofficial
deployment run by this project's author, not by KIE.ai. This document covers running your own.

## Endpoints

| Path | Method | Purpose |
| --- | --- | --- |
| `/` | `GET` | Human-facing landing page: what this is and how to connect |
| `/mcp` | `POST` | MCP Streamable HTTP transport (stateless — every JSON-RPC message is a POST) |
| `/upload` | `POST` | Send a local file to KIE under the caller's own key (see below) |
| `/healthz` | `GET` | Liveness probe: `{"status":"ok",...}` |

`GET /mcp` returns `405`. Stateless mode keeps no server-held session, so there is no stream to
resume and no session to delete.

## Authentication

Each request must carry a KIE API key in one of:

- `Authorization: Bearer <KIE_API_KEY>`
- `X-KIE-API-Key: <KIE_API_KEY>`

A request with no key gets `401`. There is no server-side fallback key by design.

Optionally gate the whole deployment with `KIE_REMOTE_ACCESS_TOKEN`. When set, callers must also
send `X-KIE-Access-Token: <token>` or get `401`. Use it to keep a deployment private without
touching KIE keys.

## Running it

```bash
npm run build && npm run start:http
```

`PORT` (default `3000`) and `HOST` (default `0.0.0.0`) control the listener. Every other
`KIE_*` variable from `.env.example` still applies, except that `KIE_API_KEY` is ignored on this
path and local file uploads are always disabled — a hosted relay never reads the server's disk on a
caller's behalf. Callers upload media by URL or base64 instead.

## Deploying on Coolify

1. New Resource → Application → your Git repository, branch `main`.
2. Build Pack: **Dockerfile** (the repo root `Dockerfile` is the one to use).
3. Port: `3000`.
4. Domain: `https://kie-mcp.alfredomanresa.com` — Coolify's proxy terminates TLS.
5. Health check path: `/healthz`.
6. Environment variables: none are required. Set `KIE_REMOTE_ACCESS_TOKEN` if you want the gate,
   and `KIE_PUBLIC_URL` if the proxy does not send `X-Forwarded-Host`/`X-Forwarded-Proto` (it is
   what the upload instructions handed to agents are built from).
   Do **not** set `KIE_API_KEY`.
7. Point a DNS `A`/`CNAME` record for `kie-mcp` at the Coolify host before deploying, so the
   certificate can be issued.

Make sure the proxy does not buffer responses — tool results stream back as
`text/event-stream`. Coolify's default Traefik setup passes them through unchanged.

## Client configuration

Claude Code:

```bash
claude mcp add --transport http kie-ai https://kie-mcp.alfredomanresa.com/mcp --header "Authorization: Bearer YOUR_KIE_API_KEY"
```

Claude Desktop, Cursor, VS Code, and Windsurf (`mcp.json` / `settings.json`):

```json
{
  "mcpServers": {
    "kie-ai": {
      "type": "http",
      "url": "https://kie-mcp.alfredomanresa.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KIE_API_KEY"
      }
    }
  }
}
```

Clients that cannot send custom headers cannot authenticate against this server. Keys are never
accepted in the URL — query strings end up in proxy logs and browser history.

## Verifying a deployment

```bash
curl -s https://kie-mcp.alfredomanresa.com/healthz
```

```bash
curl -sN -X POST https://kie-mcp.alfredomanresa.com/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -H "Authorization: Bearer $KIE_API_KEY" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Uploading local files

A hosted relay has no access to the caller's disk, and it must never read its own, so
`kie_upload_media` with `sourceType: "local_file"` is unavailable here. `POST /upload` is the way
in: it takes the file straight off the wire and forwards it to KIE's temporary File Upload API
under the caller's key, then returns KIE's response with the resulting URL.

```bash
curl -X POST "https://kie-mcp.alfredomanresa.com/upload?fileName=reference.png" \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -F file=@/path/to/reference.png
```

Same credentials as `/mcp`: the caller's KIE key, plus `X-KIE-Access-Token` when the gate is set.
Query parameters: `uploadPath` (relative, defaults to `agent-uploads`) and an optional `fileName`.
The relay injects both into the multipart body, so the form itself needs only the `file` field.

Nothing is written to the server's disk and the body is never buffered — it is streamed socket to
socket, so a large file costs one connection and no memory. Uploads over `KIE_MAX_UPLOAD_BYTES`
(default 100MB, KIE's own ceiling) are refused with `413`. Files live in KIE's temporary storage
under the caller's own account and are deleted after 3 days.

Agents are told about this endpoint without being asked: the server instructions, the
`kie_upload_media` description, and the error returned for a `local_file` attempt all carry the
exact command. That guidance appears only in remote mode — over stdio, local files upload from
disk as before.

## What is shared between callers

Nothing that carries a key. Each request builds its own MCP server bound to that caller's config.
The only per-caller state that outlives a request is the task store (idempotency keys and finished
task results), keyed by a SHA-256 hash of the API key and dropped after an hour of inactivity.
