# KIE.AI MCP

Generate images, video, and voiceovers from Claude, Codex, Cursor, VS Code, or Windsurf using your own
pay-as-you-go [KIE.ai](https://kie.ai) credits. Free and open source — you pay KIE for generations, nothing else.

**→ [kie-mcp.alfredomanresa.com](https://kie-mcp.alfredomanresa.com)** — what it is, how to connect, what it can do.

> **Unofficial project.** This is an independent, community-built MCP server that talks to KIE.ai's public API.
> It is not affiliated with, endorsed by, or operated by the KIE.ai team, and neither is the hosted instance at
> `kie-mcp.alfredomanresa.com`. For anything about your KIE account, billing, or the models themselves, go to
> [kie.ai](https://kie.ai). Bugs in *this* server belong in
> [its issue tracker](https://github.com/alfman99/kie-ai-mcp/issues), not KIE's support channels.

## Connect in one step

Paste this to the coding agent in your IDE — it knows which config file its own editor uses:

```text
Add a remote MCP server to my editor's MCP configuration.

Name: kie
Transport: streamable HTTP (not stdio, not SSE)
URL: https://kie-mcp.alfredomanresa.com/mcp
Auth: send the header  Authorization: Bearer YOUR_KIE_API_KEY

Write it in whatever config file and JSON shape this editor expects. Leave a clear
YOUR_KIE_API_KEY placeholder for me to fill in rather than inventing a key, and do
not commit the key to git. When you are done, tell me which file you changed and
whether I need to restart the editor.
```

Prefer to do it by hand? The configuration block, the `claude mcp add` one-liner, and the tool list are all on
[the site](https://kie-mcp.alfredomanresa.com). Get a key at [kie.ai/api-key](https://kie.ai/api-key).

The hosted relay holds no key of its own and refuses keyless requests, so it only ever spends the credits of
whoever is calling it.

## Run it locally instead

Choose this if you want to upload reference media straight from your disk, or would rather nothing left your
machine but the API calls themselves. Same code, same tools.

- **Claude Desktop** — install [`kie-ai-mcp.mcpb`](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb),
  no Node.js or config file required. [Step by step](docs/INSTALL_OTHER_APPS.md#claude)
- **Everything else** — `npx kie-ai-mcp` over stdio with `KIE_API_KEY` set.
  [Per-app setup](docs/INSTALL_OTHER_APPS.md)

## How to use it

Talk to your AI normally. Describe what you want and, when useful, name the model, resolution, aspect ratio,
duration, style, or reference media.

> Create an image of a hairless Sphynx cat looking to the right. Use GPT Image 2 at 4K in 9:16, soft studio
> lighting, plain warm-gray background.

> Use Seedance 2.5 to turn this first frame into a five-second vertical ad. Slowly rotate the product on black
> glass and add subtle mist.

The agent picks the right tool, checks the model's parameters against the official KIE catalog, uploads any
references, submits the task, and returns the task ID and a direct media link. Independent jobs in one call run
in parallel, and one failure never discards the others. Videos take minutes, so they return a task ID
immediately and are collected when ready.

## Documentation

- [Install in the top five AI apps](docs/INSTALL_OTHER_APPS.md) · [Client compatibility](docs/CLIENT_COMPATIBILITY.md)
- [Creator guide: pricing, privacy, FAQ](docs/CREATOR_GUIDE.md)
- [Technical reference](docs/TECHNICAL_REFERENCE.md) · [How the local process works](docs/HOW_IT_RUNS.md)
- [Host the remote server yourself](docs/REMOTE_SERVER.md)
- [Security policy](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)
- [Official KIE documentation](https://docs.kie.ai/) — this server's model catalog is generated from it

## Support

Check your KIE key, your credit balance, and whether the app was restarted after installation. Then see the
[troubleshooting guide](docs/INSTALL_OTHER_APPS.md#troubleshooting) or
[open an issue](https://github.com/alfman99/kie-ai-mcp/issues) — without including keys or private media.

MIT licensed. Higgsfield is a trademark of its respective owner.
