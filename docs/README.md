# KIE.AI MCP documentation

Use KIE image generation, video generation, and text-to-speech tools in your AI app.
Choose a guide below. If this is your first visit, start with the [project README](../README.md).

## Connect and create

| What you need | Guide |
| --- | --- |
| Connect Claude Code, Codex, Cursor, or VS Code | [App setup](INSTALL_OTHER_APPS.md#choose-your-app) |
| Install the Claude Desktop extension | [Desktop installation](INSTALL_OTHER_APPS.md#claude) |
| Create a first image, video, or voiceover | [Creator guide](CREATOR_GUIDE.md) |
| Find a model and its required inputs | [Model catalog](../src/data/MARKET_MODEL_REGISTRY.md) |
| Check web chat and authentication support | [Client compatibility](CLIENT_COMPATIBILITY.md) |
| Fix a connection or generation error | [Troubleshooting](INSTALL_OTHER_APPS.md#troubleshooting) |
| Update a local installation | [Update instructions](INSTALL_OTHER_APPS.md#update) |

You need your own KIE API key and credits for generations. The hosted connection sends that key
through this project's relay to KIE. A local connection sends requests directly to KIE.
Read [costs and privacy](CREATOR_GUIDE.md#costs) before creating a batch.

## Develop or host

| What you need | Guide |
| --- | --- |
| Run a local stdio process and check its lifecycle | [Local server](HOW_IT_RUNS.md) |
| Configure tools, polling, or API operations | [Technical reference](TECHNICAL_REFERENCE.md) |
| Deploy an HTTP server with Docker and Coolify | [Hosting guide](REMOTE_SERVER.md) |
| Contribute a fix or update the model catalog | [Contributing](../CONTRIBUTING.md) |
| Handle keys and report a security issue | [Security](../SECURITY.md) |
| Review release changes | [Changelog](../CHANGELOG.md) |

## Project and API sources

KIE.AI MCP is an independent, open-source project maintained by
[alfman99](https://github.com/alfman99). It is not an official KIE.ai product.

Model and API schemas come from [KIE's official documentation](https://docs.kie.ai/).
The [snapshot manifest](../src/data/docs_manifest.json) records the source, update time, hashes,
and failure count. Client setup guides link to the relevant vendor documentation.

For project bugs, [open a GitHub issue](https://github.com/alfman99/kie-ai-mcp/issues).
Contact KIE for account, billing, or model-service questions. Keep keys and private media out of reports.
