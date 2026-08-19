# Remote MCP server (Streamable HTTP)

The same tool set that runs over stdio can be hosted at a URL, so clients only add a server entry —
nothing to download or install.

The hosted server is a **relay**. It holds no KIE credentials: every caller sends their own KIE API
key on each request, and the relay spends only that key's credits. Many people can use one
deployment at the same time with different keys.

## Endpoints

| Path | Method | Purpose |
| --- | --- | --- |
| `/mcp` | `POST` | MCP Streamable HTTP transport (stateless — every JSON-RPC message is a POST) |
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
6. Environment variables: none are required. Set `KIE_REMOTE_ACCESS_TOKEN` if you want the gate.
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

## What is shared between callers

Nothing that carries a key. Each request builds its own MCP server bound to that caller's config.
The only per-caller state that outlives a request is the task store (idempotency keys and finished
task results), keyed by a SHA-256 hash of the API key and dropped after an hour of inactivity.
