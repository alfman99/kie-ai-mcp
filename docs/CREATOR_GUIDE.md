# KIE.AI MCP Creator Guide

KIE.AI MCP brings image, video, editing, and voice-generation tools into the AI assistant you already use. The software is free and open source; generation costs are charged by KIE to your own KIE account.

## Comparison with Higgsfield MCP

Higgsfield MCP offers a convenient conversational workflow, but generations use Higgsfield plan credits. KIE.AI MCP offers a similar request-and-iterate workflow with a different cost structure:

- no recurring Higgsfield plan is required;
- KIE credits are pay as you go and, under KIE's current terms, do not expire;
- you can choose a faster, cheaper, or higher-quality KIE model for each job;
- the tools are open source and inspectable;
- uploads go directly to KIE without another media service in the middle.

This project does not copy Higgsfield-only products such as Soul character training, its web creation library, or its complete studio interface. It focuses on generating and iterating on images, videos, edits, and voiceovers from a conversation. It does not claim feature-for-feature parity with Higgsfield's full platform.

## What you can make

| You want | Ask your agent to… |
|---|---|
| Product images | Create studio, lifestyle, or advertising images |
| Image edits | Change a background, style, composition, or product setting |
| Short-form video | Make vertical ads, B-roll, product motion, or cinematic clips |
| Reference-based video | Animate frames or use image, video, and audio references |
| Voiceovers | Turn a script into speech or narration |
| Variations | Generate multiple concepts and iterate in one conversation |

You may name a KIE model or let the agent choose a sensible default. Different models expose different durations, resolutions, aspect ratios, and reference-media options.

## Costs

KIE.AI MCP itself has no subscription fee. You still need:

- the AI client and plan you normally use;
- KIE credits for generations.

KIE states that its API pricing is commonly below official model API pricing, but prices and promotions change. Check [KIE's current pricing](https://kie.ai/pricing) before a large project and review task credit use in [KIE logs](https://kie.ai/logs). Purchased credits do not expire under [KIE's current terms](https://kie.ai/terms-of-use).

No honest comparison can promise that every generation will cost less than every Higgsfield plan or promotion. The practical advantage is being able to pay as you go, select lower-cost models when appropriate, and avoid an additional creative subscription.

## Privacy and safety

- The local server runs inside your AI client and does not expose a public port.
- Your KIE key is provided through the client's protected configuration.
- Creation requests go directly to `https://api.kie.ai`.
- References go directly to KIE's [native upload service](https://docs.kie.ai/file-upload-api/quickstart).
- No Cloudinary, S3, ImgBB, Firebase, Supabase, or other media intermediary is used.
- Local file access is restricted to one dedicated folder selected during installation.
- KIE currently retains generated media for 14 days, so save anything you want to keep.

Treat your KIE key like a password. Never paste it into chats, screenshots, issues, logs, or public configuration. Only install extension files from this repository's [official Releases page](https://github.com/alfman99/kie-ai-mcp/releases/latest).

## Common questions

### Is this Higgsfield?

No. It is an independent, open-source alternative for conversational media creation and is not affiliated with or endorsed by Higgsfield or KIE.

### Do I need Docker or Node.js?

Not for Claude Desktop. Its `.mcpb` extension contains the server and production dependencies and uses Claude's included runtime. Source installations in Claude Code, Codex, Cursor, VS Code, and Windsurf require Node.js 20 or newer.

### Does it work on the Claude website?

The current one-file extension runs in Claude Desktop because it needs a local process and optional access to your chosen reference-media folder.

### Does it work in ChatGPT's website?

Not as a local installation. ChatGPT web requires a separately hosted HTTPS MCP endpoint or OpenAI's secure tunnel. The current release is local; use Codex desktop or CLI for OpenAI's coding agent.

### Which AI apps are supported?

The project focuses on Claude, ChatGPT/Codex, Cursor, VS Code/Copilot, and Windsurf. See the [app-by-app installation guide](INSTALL_OTHER_APPS.md).

### Can it use an image I already have?

Yes. Put it in the reference-media folder selected during installation, attach it when supported, or provide a public image URL. Describe how the image should be used.

### Where do finished creations go?

The agent returns the result supplied by KIE. Download media you want to keep because KIE's temporary generated files are not permanent storage.

### How do I update it?

Claude Desktop users install the newest `.mcpb` from [Releases](https://github.com/alfman99/kie-ai-mcp/releases/latest) over the current extension. Source users can follow the [update instructions](INSTALL_OTHER_APPS.md#update).

### What should I check when something fails?

Confirm that the KIE key remains valid, the account has enough credits, and the AI app was restarted after installation or update. Then use the [troubleshooting table](INSTALL_OTHER_APPS.md#troubleshooting) or [open an issue](https://github.com/alfman99/kie-ai-mcp/issues) without including keys or private media.

---

Higgsfield is a trademark of its respective owner. KIE.AI MCP is an independent project and does not claim feature-for-feature parity with Higgsfield's platform.
