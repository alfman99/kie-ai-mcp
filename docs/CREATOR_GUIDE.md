# Creator guide

KIE.AI MCP adds image, video, and voice tools to your AI chat. Connect with the
[setup guide](INSTALL_OTHER_APPS.md), then describe what you want to make.

## Describe the result

Include the subject, action, style, and format when they matter. You can name a model or let the
agent use its default.

> Use Seedream 5.0 Pro to create a square photo of a red ceramic mug on a wooden table in morning light.

> Create two vertical product images with GPT Image 2, one on a white background and one beside a window.

> Use Seedance 2.5 to make a five-second, 720p video of waves reaching a sandy beach.

> Read this in a calm voice: “Your order is ready for collection.”

Models support different sizes, durations, and reference inputs. Ask the agent to check the model's
schema before submitting a request. The [model catalog](../src/data/MARKET_MODEL_REGISTRY.md)
lists the documented models. The Market tools give access to models beyond the default creation tools.

## Use reference media

With a local installation, put files in the dedicated media folder you selected during setup.
The agent can upload those files to KIE and use the returned URLs.

With the hosted server, provide a public media URL or upload the file directly to KIE's
[native upload service](https://docs.kie.ai/file-upload-api/quickstart).
The hosted server cannot read files on your computer. See the
[remote upload instructions](REMOTE_SERVER.md#uploading-local-files).

Tell the agent what to preserve and what to change:

> Use this image as the reference. Keep the mug's shape and red glaze. Place it on a pale stone countertop.

## Collect the result

Images and voiceovers usually wait for a result. Videos return a task ID first.
Ask the agent to check that ID with `kie_get_creation` when the video is ready.

A timeout does not mean the generation stopped. Check the existing task before submitting again.
Download media you want to keep; KIE result URLs are temporary.

For several independent images or clips, ask for them together. The agent can submit them in one
batch. Each task still has its own cost and result.

## Costs

This project has no software subscription fee. You need your usual AI app and KIE credits.
KIE sets generation prices, which vary by model and settings. Check
[KIE pricing](https://kie.ai/pricing) before a large batch and review spending in
[KIE logs](https://kie.ai/logs).

## Privacy

A local installation sends requests directly to KIE. The hosted server receives your KIE key with
each request and forwards it to KIE. It does not use a shared KIE account.

Local file access is limited to the media folder you select. Use a folder that contains only files
you intend to upload. Keep your key out of chat messages, public issues, and Git.
See the [security guide](../SECURITY.md) for details.

## If something fails

Check the key, credit balance, and model settings. After changing a client configuration, restart
the server or start a new chat. Follow the [troubleshooting guide](INSTALL_OTHER_APPS.md#troubleshooting)
for connection and file-access errors.

For local updates, see [Update](INSTALL_OTHER_APPS.md#update). The hosted server receives updates
from its operator. Check [client compatibility](CLIENT_COMPATIBILITY.md) for web chat limitations.
