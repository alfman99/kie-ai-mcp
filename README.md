# KIE.AI MCP

Create images, videos, edits, and voiceovers from Claude, Codex, Cursor, VS Code, or Windsurf using your own pay-as-you-go KIE credits.

It is a free, open-source alternative to subscription-based creative MCPs. Whichever way you run it, generations are billed to your own KIE account — there is no creative subscription, no Docker service, and no third-party upload provider.

[Use the hosted server](https://kie-mcp.alfredomanresa.com) · [Download for Claude Desktop](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb) · [Install in another AI app](docs/INSTALL_OTHER_APPS.md) · [Get a KIE API key](https://kie.ai/api-key)

> **Unofficial project.** This is an independent, community-built MCP server that talks to KIE.ai's public API.
> It is not affiliated with, endorsed by, or operated by the KIE.ai team, and neither is the hosted instance at
> `kie-mcp.alfredomanresa.com`. KIE is a third-party service you hold your own account with; for anything about
> that account, your billing, or the models themselves, go to [kie.ai](https://kie.ai). Bugs in *this* server
> belong in [its issue tracker](https://github.com/alfman99/kie-ai-mcp/issues), not KIE's support channels.

## Quick start: the hosted server

Nothing to install. Point your MCP client at `https://kie-mcp.alfredomanresa.com/mcp` and send your own KIE key as a header:

```json
{
  "mcpServers": {
    "kie": {
      "type": "http",
      "url": "https://kie-mcp.alfredomanresa.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KIE_API_KEY"
      }
    }
  }
}
```

With the Claude Code CLI:

```bash
claude mcp add --transport http kie https://kie-mcp.alfredomanresa.com/mcp \
  --header "Authorization: Bearer YOUR_KIE_API_KEY"
```

Or paste this to the coding agent in your IDE and let it write the config for you — Cursor, VS Code, Windsurf,
Claude Code, and Codex each expect a slightly different file, and the agent already knows which one it is in:

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

Get a key at [kie.ai/api-key](https://kie.ai/api-key). The relay holds no key of its own and refuses keyless
requests, so it can only ever spend the credits of whoever is calling it. It keeps a short-lived per-caller
cache so idempotency keys and finished results work across your calls, and local file access is disabled
entirely on the hosted path — [upload reference media](docs/CREATOR_GUIDE.md) by URL or base64 instead.

Two things the hosted path cannot do: read files from your disk, and outlive its cache. If you want local
file uploads, or you would rather nothing left your machine but the API calls themselves, run it locally.

## Run it locally instead

No coding, Node.js, Docker, or configuration file is required for Claude Desktop.

1. Get a key from [KIE](https://kie.ai/api-key).
2. Download [`kie-ai-mcp.mcpb`](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb).
3. In Claude Desktop, open **Settings → Extensions → Advanced settings → Install Extension…**
4. Select the download, enter your KIE key, and choose a dedicated folder for reference media.
5. Start a new conversation.

Anthropic documents this installation flow in its [local MCP extension guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

For any other client, `npx kie-ai-mcp` runs the same server over stdio with `KIE_API_KEY` in the environment.

## How to use it

Talk to your AI normally—there are no special commands to learn. Describe what you want and, when useful, include the model, resolution, aspect ratio, duration, style, or reference media.

For example:

> Create an image of a hairless Sphynx cat looking to the right. Use GPT Image 2 at 4K in a 9:16 aspect ratio, with soft studio lighting and a plain warm-gray background.

> Edit this reference photo: keep the product unchanged, replace the background with wet black stone, and add soft morning light. Make it square.

> Use Seedance 2.5 to turn this first frame into a five-second vertical ad. Slowly rotate the product on black glass and add subtle mist.

> Create a confident, energetic voiceover for this 20-second launch script. Use a natural conversational delivery.

The agent selects the appropriate KIE tool, checks the model parameters, uploads references directly to KIE when needed, submits the task, and returns a short result with the task ID and direct media link. Long-running calls send standard MCP progress updates when the AI client supports them. Temporary status-check failures retry automatically. If you do not specify a model or technical settings, ask the agent to choose sensible options for your goal and budget.

## Install in your AI app

| App | Hosted (HTTP) | Local (stdio) |
|---|---|---|
| Claude Desktop | Supported | [One-file extension](docs/INSTALL_OTHER_APPS.md#claude) |
| Claude Code | `claude mcp add --transport http` | [Register the local server](docs/INSTALL_OTHER_APPS.md#claude-code) |
| ChatGPT / Codex | Supported | [Codex desktop or CLI](docs/INSTALL_OTHER_APPS.md#chatgpt-and-codex) |
| Cursor | Supported | [Included MCP configuration](docs/INSTALL_OTHER_APPS.md#cursor) |
| VS Code / Copilot | Supported | [VS Code MCP settings](docs/INSTALL_OTHER_APPS.md#vs-code-and-github-copilot) |
| Windsurf | Supported | [Cascade MCP settings](docs/INSTALL_OTHER_APPS.md#windsurf) |

For the hosted column, use the JSON block from the [quick start](#quick-start-the-hosted-server) — the shape is
the same in every client that speaks MCP over HTTP. ChatGPT in a web browser cannot launch a local MCP process,
so the hosted server is the only option there; see the [compatibility explanation](docs/CLIENT_COMPATIBILITY.md#chatgpt-in-a-browser).

Want your own deployment rather than mine? [Host it yourself](docs/REMOTE_SERVER.md) — it is one container.

## Why creators use it

- Work inside the AI conversation you already use.
- Pay only for KIE generations instead of adding another creative subscription.
- Choose among KIE image, video, and audio models.
- Use reference images, first and last frames, video, or audio.
- Send files directly through KIE's native upload service.
- Submit independent videos together and keep successful results if one job fails.

Read the [creator guide](docs/CREATOR_GUIDE.md) for the full [Higgsfield comparison](docs/CREATOR_GUIDE.md#comparison-with-higgsfield-mcp), [cost explanation](docs/CREATOR_GUIDE.md#costs), [privacy details](docs/CREATOR_GUIDE.md#privacy-and-safety), and [FAQ](docs/CREATOR_GUIDE.md#common-questions).

## Direct and private by design

```text
Hosted:  Your AI app → kie-mcp.alfredomanresa.com → official KIE API
Local:   Your AI app → local KIE.AI MCP           → official KIE API
                                                    ↳ native KIE upload service
```

Your API key stays in your AI client's protected configuration. Creation requests go to `https://api.kie.ai`;
reference media goes to KIE's [official native upload API](https://docs.kie.ai/file-upload-api/quickstart).

Running locally, your key never leaves your machine and local file access is limited to the folder you choose.
On the hosted path your key travels to the relay as a request header so it can be forwarded to KIE — it is used
for that request and nothing else, is never written to disk, and is only ever held in memory as a hash used to
key your own result cache. If that trade is not one you want to make, run it locally; both paths are the same
code and the same tools.

## Documentation

- [Install in the top five AI apps](docs/INSTALL_OTHER_APPS.md)
- [Creator guide, pricing context, privacy, and FAQ](docs/CREATOR_GUIDE.md)
- [Client compatibility](docs/CLIENT_COMPATIBILITY.md)
- [Technical reference](docs/TECHNICAL_REFERENCE.md)
- [How the local process works](docs/HOW_IT_RUNS.md)
- [Hosting it as a remote HTTP server](docs/REMOTE_SERVER.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Official KIE documentation](https://docs.kie.ai/)

## Updates and support

Install the newest file from [Releases](https://github.com/alfman99/kie-ai-mcp/releases/latest) over the existing Claude extension. Source installations can follow the [update instructions](docs/INSTALL_OTHER_APPS.md#update).

If something fails, check your KIE key, credit balance, and whether the AI app was restarted after installation. Then use the [troubleshooting guide](docs/INSTALL_OTHER_APPS.md#troubleshooting) or [open an issue](https://github.com/alfman99/kie-ai-mcp/issues) without including keys or private media.

KIE.AI MCP is independent and is not affiliated with or endorsed by KIE or Higgsfield. Higgsfield is a trademark of its respective owner.
