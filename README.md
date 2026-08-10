# KIE.AI MCP

Create images, videos, edits, and voiceovers from Claude, Codex, Cursor, VS Code, or Windsurf using your own pay-as-you-go KIE credits.

It is a free, open-source alternative to subscription-based creative MCPs. Requests go directly from your AI app to KIE—there is no Docker service, hosted middleman, or third-party upload provider.

[Download for Claude Desktop](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb) · [Install in another AI app](docs/INSTALL_OTHER_APPS.md) · [Get a KIE API key](https://kie.ai/api-key)

## Install in Claude Desktop

No coding, Node.js, Docker, or configuration file is required.

1. Get a key from [KIE](https://kie.ai/api-key).
2. Download [`kie-ai-mcp.mcpb`](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb).
3. In Claude Desktop, open **Settings → Extensions → Advanced settings → Install Extension…**
4. Select the download, enter your KIE key, and choose a dedicated folder for reference media.
5. Start a new conversation.

Anthropic documents this installation flow in its [local MCP extension guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

## How to use it

Talk to your AI normally—there are no special commands to learn. Describe what you want and, when useful, include the model, resolution, aspect ratio, duration, style, or reference media.

For example:

> Create an image of a hairless Sphynx cat looking to the right. Use GPT Image 2 at 4K in a 9:16 aspect ratio, with soft studio lighting and a plain warm-gray background.

> Edit this reference photo: keep the product unchanged, replace the background with wet black stone, and add soft morning light. Make it square.

> Use Seedance 2.5 to turn this first frame into a five-second vertical ad. Slowly rotate the product on black glass and add subtle mist.

> Create a confident, energetic voiceover for this 20-second launch script. Use a natural conversational delivery.

The agent selects the appropriate KIE tool, checks the model parameters, uploads references directly to KIE when needed, submits the task, and returns a short result with the task ID and direct media link. Long-running calls send standard MCP progress updates when the AI client supports them. Temporary status-check failures retry automatically. If you do not specify a model or technical settings, ask the agent to choose sensible options for your goal and budget.

## Install in your AI app

| App | Best path |
|---|---|
| Claude Desktop | [Install the one-file extension](docs/INSTALL_OTHER_APPS.md#claude) |
| Claude Code | [Register the local server](docs/INSTALL_OTHER_APPS.md#claude-code) |
| ChatGPT / Codex | [Use Codex desktop or CLI](docs/INSTALL_OTHER_APPS.md#chatgpt-and-codex) |
| Cursor | [Use the included MCP configuration](docs/INSTALL_OTHER_APPS.md#cursor) |
| VS Code / Copilot | [Add the server to VS Code MCP settings](docs/INSTALL_OTHER_APPS.md#vs-code-and-github-copilot) |
| Windsurf | [Add it through Cascade MCP settings](docs/INSTALL_OTHER_APPS.md#windsurf) |

ChatGPT in a web browser cannot launch a local MCP process. See the [compatibility explanation](docs/CLIENT_COMPATIBILITY.md#chatgpt-in-a-browser).

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
Your AI app → local KIE.AI MCP → official KIE API
                                  ↳ native KIE upload service
```

Your API key stays in your AI client's protected configuration. Creation requests go to `https://api.kie.ai`; reference media goes to KIE's [official native upload API](https://docs.kie.ai/file-upload-api/quickstart). Local file access is limited to the folder you choose.

## Documentation

- [Install in the top five AI apps](docs/INSTALL_OTHER_APPS.md)
- [Creator guide, pricing context, privacy, and FAQ](docs/CREATOR_GUIDE.md)
- [Client compatibility](docs/CLIENT_COMPATIBILITY.md)
- [Technical reference](docs/TECHNICAL_REFERENCE.md)
- [How the local process works](docs/HOW_IT_RUNS.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Official KIE documentation](https://docs.kie.ai/)

## Updates and support

Install the newest file from [Releases](https://github.com/alfman99/kie-ai-mcp/releases/latest) over the existing Claude extension. Source installations can follow the [update instructions](docs/INSTALL_OTHER_APPS.md#update).

If something fails, check your KIE key, credit balance, and whether the AI app was restarted after installation. Then use the [troubleshooting guide](docs/INSTALL_OTHER_APPS.md#troubleshooting) or [open an issue](https://github.com/alfman99/kie-ai-mcp/issues) without including keys or private media.

KIE.AI MCP is independent and is not affiliated with or endorsed by KIE or Higgsfield. Higgsfield is a trademark of its respective owner.
