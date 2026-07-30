# KIE Creator for Claude

### Higgsfield-style image and video creation in Claude—without a Higgsfield subscription.

Tell Claude what you want to make. KIE Creator gives it the tools to generate images, edit with reference pictures, create videos, and produce voiceovers using your own KIE credits.

No coding. No Docker. No configuration files.

[Download KIE Creator for Claude](https://github.com/alfman99/kie-mcp/releases/latest/download/kie-creator-for-claude.mcpb)

## Why creators use it

- **Create inside Claude.** Stay in the same conversation from idea to finished asset.
- **Avoid another creative subscription.** The extension is free; you pay KIE only when you generate.
- **Choose the right model for each job.** Use KIE's image, video, and audio model marketplace instead of being locked into one workflow.
- **Use reference media.** Create from prompts, images, first and last frames, video, or audio.
- **Keep the simple Higgsfield experience.** Describe the result and let Claude handle model selection, task submission, and waiting for the output.
- **Connect directly to KIE.** Your key and media are not routed through our servers or an outside upload service.

KIE says its API pricing is typically 30%–50% below official model APIs, with larger discounts on some models. Prices change, so check [KIE's current pricing](https://kie.ai/pricing) before a large project. Purchased KIE credits do not expire under [KIE's current terms](https://kie.ai/terms-of-use).

## Why use this instead of Higgsfield MCP?

Higgsfield MCP is convenient, but its generations use Higgsfield plan credits. KIE Creator is for people who want the same conversational creation pattern with a different cost structure:

- no recurring Higgsfield plan required;
- pay-as-you-go KIE credits that do not expire under KIE's current terms;
- freedom to choose a faster, cheaper, or higher-quality model for each job;
- open-source tools you can inspect instead of a closed creative gateway;
- direct KIE uploads with no extra media service in the middle.

The trade-off is that this extension does not copy Higgsfield-only products such as Soul character training, its web creation library, or its complete studio interface. It focuses on the part creators want most inside Claude: generating and iterating on images, videos, edits, and voiceovers from a conversation.

## Install in about five minutes

### 1. Get a KIE key

Create a KIE account, add credits, and open the [KIE API key page](https://kie.ai/api-key). Copy your key.

Treat this key like a password. Do not post it in a chat, screenshot, or public document.

### 2. Download the extension

Download [`kie-creator-for-claude.mcpb`](https://github.com/alfman99/kie-mcp/releases/latest/download/kie-creator-for-claude.mcpb).

### 3. Add it to Claude Desktop

In Claude Desktop:

1. Open **Settings → Extensions**.
2. Open **Advanced settings**.
3. Click **Install Extension…**
4. Choose the `.mcpb` file you downloaded.
5. Paste your KIE API key when Claude asks for it.
6. Finish the installation and start a new chat.

Claude stores the key as a protected secret on your device. You do not need to install Node, edit JSON, use Terminal, or keep another app running.

If you cannot find **Install Extension…**, update Claude Desktop first. Anthropic's official instructions are available in [Installing local MCP extensions](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

## Start creating

Try one of these in a new Claude conversation:

> Create a premium square product photo of a matte black perfume bottle on wet stone. Use soft morning light and leave room for a headline.

> Turn this reference image into a five-second vertical ad. Slowly rotate the product on black glass and add subtle mist.

> Make three different hooks for this product, create a matching image for each one, and recommend the strongest concept.

> Create an energetic voiceover for this 20-second launch script.

You can also name a model:

> Use Seedance 2.0 to turn this first frame into a 9:16 video.

If you do not name one, Claude can choose a sensible default.

## What you can make

| You want | Ask Claude to… |
|---|---|
| Product images | Create polished studio, lifestyle, or advertising images |
| Image edits | Change a background, style, composition, or product setting |
| Short-form video | Make vertical ads, B-roll, product motion, or cinematic clips |
| Reference-based video | Animate a first frame or use image, video, and audio references |
| Voiceovers | Turn a script into speech or narration |
| Variations | Generate multiple concepts and iterate in the same conversation |

## What it costs

KIE Creator itself is free and open source.

You still need:

- Claude Desktop and whatever Claude plan you normally use.
- KIE credits for generations.

There is no KIE Creator subscription and no Higgsfield subscription required. Different models, durations, and resolutions use different amounts of KIE credit. Claude can check your remaining balance, and you can review every task and its credit use in your [KIE logs](https://kie.ai/logs).

No honest comparison can promise that every individual generation will always cost less than every Higgsfield plan or promotion. The savings proposition is straightforward: pay as you go, pick lower-cost models when they are good enough, and avoid paying for a separate Higgsfield subscription you may not fully use.

## Privacy and safety

- The extension runs locally inside Claude Desktop.
- Claude stores your KIE key as a sensitive setting using your device's secure storage.
- Creation requests go directly to `https://api.kie.ai`.
- Reference files go directly to KIE's [official native upload service](https://docs.kie.ai/file-upload-api/quickstart).
- There is no Cloudinary, S3, ImgBB, Firebase, Supabase, or other media middleman.
- KIE currently retains generated media for 14 days, so download anything you want to keep.

Only install extension files downloaded from this repository's official Releases page. Never send anyone your KIE API key.

## Common questions

### Is this Higgsfield?

No. KIE Creator is an independent, open-source alternative that offers a similar “ask your agent to create” workflow. It is not affiliated with or endorsed by Higgsfield or KIE.

### Do I need Docker or Node?

No. The Claude Desktop extension contains what it needs, and Claude supplies the runtime.

### Does it work in the Claude website?

This version is designed for the Claude Desktop app because it runs locally and can work with reference files on your computer.

### Can it use an image I already have?

Yes. Attach the image to Claude or tell Claude where the file is saved, then describe how it should be used. Public image links also work.

### Where do my creations go?

Claude returns the result supplied by KIE. Download finished media you want to keep; KIE's official documentation says generated files are retained for 14 days.

### How do I update it?

Download the newest `.mcpb` file from [Releases](https://github.com/alfman99/kie-mcp/releases/latest) and install it over the existing extension. Extensions distributed through Anthropic's official directory can update automatically if this project is accepted there.

### Something is not working

Check these three things first:

1. Your KIE key is still valid.
2. Your KIE account has enough credits.
3. You restarted Claude Desktop after installing or updating the extension.

Then review the extension in **Settings → Extensions** or [report an issue](https://github.com/alfman99/kie-mcp/issues) without including your API key or private media.

## For developers and other agents

The consumer README intentionally avoids build commands and protocol details.

- [Technical reference](docs/TECHNICAL_REFERENCE.md)
- [How the local process works](docs/HOW_IT_RUNS.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Official KIE documentation](https://docs.kie.ai/)

All API behavior and bundled model catalogs are derived exclusively from KIE's official documentation.

---

Higgsfield is a trademark of its respective owner. KIE Creator is an independent project and does not claim feature-for-feature parity with Higgsfield's full platform.
