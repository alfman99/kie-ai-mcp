# KIE.AI MCP

Create images, videos, and voiceovers from your AI chat with [KIE.ai](https://kie.ai).
Use models such as Seedream, GPT Image, Seedance, Wan, Veo, and ElevenLabs.

The software is free and open source. You pay KIE for generations through your own account.
This is an independent project, not an official KIE.ai product.

## Connect to the hosted server

Get your key at [kie.ai/api-key](https://kie.ai/api-key), then add a remote MCP server in your app:

| Setting | Value |
| --- | --- |
| Name | `kie-ai` |
| Transport | Streamable HTTP |
| URL | `https://kie-mcp.alfredomanresa.com/mcp` |
| `Authorization` | `Bearer YOUR_KIE_API_KEY` |

Use the app's key field or private configuration. Keep your key out of chats and Git.

[App-by-app setup](docs/INSTALL_OTHER_APPS.md#remote-setup) covers Claude Code, Codex, Cursor,
and VS Code. The [connection page](https://kie-mcp.alfredomanresa.com) also has setup examples.

The hosted server forwards your key and requests to KIE. Use a local installation if you want
requests to go directly from your computer to KIE.

## Make your first image

Start a new chat after connecting and ask:

> Use Seedream 5.0 Pro to create a square photo of a red ceramic mug on a wooden table in morning light.

The agent submits the request and returns an image link. This uses your KIE credits.

You can also ask for a video or voiceover:

> Use Seedance 2.5 to create a five-second video of waves reaching a sandy beach, at 720p in 16:9.

> Read this in a calm voice: “Your order is ready for collection.”

For edits, provide a reference image URL and describe the change. Videos can take several minutes.
Keep the task ID and ask the agent to check it again rather than submit the same request twice.
See the [creator guide](docs/CREATOR_GUIDE.md) for models, references, and costs.

## Run it locally

- Claude Desktop: [download the extension](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb)
  and follow the [installation steps](docs/INSTALL_OTHER_APPS.md#claude).
- Other apps: [build from source](docs/INSTALL_OTHER_APPS.md#one-time-source-setup) with Node.js 20 or newer.

Local installations can upload files from a folder you select. The hosted server cannot read your disk.
Check [client compatibility](docs/CLIENT_COMPATIBILITY.md) before connecting a web chat app.

## More help

- [Setup and troubleshooting](docs/INSTALL_OTHER_APPS.md#troubleshooting)
- [Technical reference](docs/TECHNICAL_REFERENCE.md) and [local process](docs/HOW_IT_RUNS.md)
- [Host your own server](docs/REMOTE_SERVER.md)
- [Contribute](CONTRIBUTING.md), [security](SECURITY.md), and [changes](CHANGELOG.md)
- [Model catalog](src/data/MARKET_MODEL_REGISTRY.md) and [official KIE documentation](https://docs.kie.ai/)

For server bugs, [open an issue](https://github.com/alfman99/kie-ai-mcp/issues).
For account or billing questions, contact KIE. Keep keys and private media out of public reports.

[MIT license](LICENSE).
