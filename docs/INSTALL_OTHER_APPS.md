# Install KIE Creator in Your App

KIE Creator works anywhere that can run a local MCP server. Claude Desktop has the easiest no-code installation. Other apps use the same local server and the same KIE account; only the screen where you add it changes.

## Pick your app

| App | Difficulty | Start here |
|---|---:|---|
| Claude Desktop | Easiest—no Node or Terminal | [Claude Desktop](#claude-desktop) |
| Cursor | Easy if this repository is already open | [Cursor](#cursor) |
| Visual Studio Code + GitHub Copilot | Easy, with a protected key prompt | [VS Code](#vs-code-with-github-copilot) |
| JetBrains AI Assistant | Copy and paste in Settings | [JetBrains](#jetbrains-ai-assistant) |
| Zed | Copy and paste in Settings | [Zed](#zed) |
| Cline | Copy and paste in the MCP panel | [Cline](#cline) |
| Roo Code | Copy and paste in the MCP panel | [Roo Code](#roo-code) |
| Windsurf / legacy Cascade | Copy and paste in MCP settings | [Windsurf / Cascade](#windsurf--cascade) |
| Visual Studio on Windows | Add through the Copilot tool picker | [Visual Studio](#visual-studio-on-windows) |
| Codex desktop or CLI | One terminal command | [Codex](#codex-desktop-and-cli) |
| Claude Code | One terminal command | [Claude Code](#claude-code) |
| ChatGPT website | Needs a hosted edition; local install is not supported | [ChatGPT](#chatgpt-in-a-web-browser) |

## What every local IDE needs

Skip this section if you are installing the Claude Desktop extension.

You need:

- [Node.js 20 or newer](https://nodejs.org/en/download);
- a local copy of this repository;
- a KIE API key from [KIE's API key page](https://kie.ai/api-key);
- one dedicated folder for media you want the agent to be able to upload.

To get the repository, open the [KIE Creator GitHub page](https://github.com/alfman99/kie-mcp), select **Code → Download ZIP**, and unzip it. Developers can instead run:

```bash
git clone https://github.com/alfman99/kie-mcp.git
```

Open Terminal on macOS/Linux or PowerShell on Windows, move into the downloaded repository, and run:

```bash
npm ci
npm run build
npm run mcp:doctor
```

The last command performs a no-credit local MCP health check. A successful run ends with `MCP doctor passed`.

Create a folder named `KIE Media` somewhere easy to find. The server can upload local files only from that folder. It rejects relative paths, path escapes, and symlinks that lead outside it.

You will use these values in your app:

| Setting | macOS/Linux example | Windows example |
|---|---|---|
| Server file | `/Users/YOU/kie-mcp/dist/src/index.js` | `C:/Users/YOU/kie-mcp/dist/src/index.js` |
| Media folder | `/Users/YOU/KIE Media` | `C:/Users/YOU/KIE Media` |
| API key | Your private KIE key | Your private KIE key |

Use forward slashes in Windows JSON paths. Replace `YOU` and `kie-mcp` with the real location on your computer.

For terminal-based installers, load the key into only the current terminal without putting it in shell history.

On macOS/Linux:

```bash
read -s KIE_API_KEY
export KIE_API_KEY
```

Paste the key and press Enter when the terminal waits; the key remains hidden.

On Windows PowerShell:

```powershell
$secureKieKey = Read-Host "Paste your KIE API key" -AsSecureString
$env:KIE_API_KEY = [System.Net.NetworkCredential]::new("", $secureKieKey).Password
```

Closing that terminal clears this temporary environment value.

### Let your agent install it

If Terminal and JSON are unfamiliar, paste this into your coding agent while this repository is open:

> Install this KIE Creator MCP server for the app I am currently using. Follow `docs/INSTALL_OTHER_APPS.md`, run the no-credit doctor, use an absolute path to `dist/src/index.js`, and create a dedicated `KIE Media` folder. Ask me to enter my KIE API key through the safest secret input the app supports. Never print, commit, or repeat my key.

## Claude Desktop

This is the recommended path for nontechnical creators.

1. Get a KIE key from [kie.ai/api-key](https://kie.ai/api-key).
2. Download [`kie-creator-for-claude.mcpb`](https://github.com/alfman99/kie-mcp/releases/latest/download/kie-creator-for-claude.mcpb).
3. In Claude Desktop, open **Settings → Extensions → Advanced settings → Install Extension…**
4. Choose the downloaded file.
5. Paste your KIE key when Claude asks.
6. Choose your dedicated `KIE Media` folder.
7. Start a new conversation.

Claude stores the key as a sensitive extension setting. You do not need Node, Docker, Git, a config file, or a separately running server. See Anthropic's [official local extension guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

## Cursor

This repository already includes `.cursor/mcp.json`.

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Make `KIE_API_KEY` available as an environment variable on your computer.
3. Create `~/KIE Media`, or edit `.cursor/mcp.json` to use another dedicated folder.
4. Open this repository in Cursor and restart Cursor.
5. Open **Settings → MCP** and enable `kie-ai`.

For a global installation, open `~/.cursor/mcp.json` and add:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "${env:KIE_API_KEY}",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

Cursor Agent uses the same configuration. Check it with `cursor-agent mcp list-tools kie-ai`. See Cursor's [official MCP guide](https://docs.cursor.com/context/model-context-protocol).

## VS Code with GitHub Copilot

VS Code can ask for the key once and store it securely.

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Open the Command Palette and run **MCP: Open User Configuration**.
3. Add the following, replacing both paths:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "kie-api-key",
      "description": "KIE API key",
      "password": true
    }
  ],
  "servers": {
    "kie-ai": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "${input:kie-api-key}",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

4. Save the file.
5. Accept the trust prompt after reviewing the command and path.
6. Open Copilot Chat in **Agent** mode, select **Configure Tools**, and enable the KIE tools.

VS Code uses `servers`, not `mcpServers`. Use **MCP: List Servers** to restart the server or show its output. See Microsoft's official [MCP setup guide](https://code.visualstudio.com/docs/agent-customization/mcp-servers) and [configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## JetBrains AI Assistant

These steps cover IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, Rider, and the other JetBrains IDEs with AI Assistant.

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Open **Settings → Tools → AI Assistant → Model Context Protocol (MCP)**.
3. Click **Add** and choose **STDIO**.
4. Paste the configuration below and replace the key and both paths:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "PASTE_YOUR_PRIVATE_KIE_KEY_HERE",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

5. Choose **Global** if you want KIE Creator in every project, or **Project** for only the current one.
6. Click **OK → Apply** and confirm the status is connected.

Keep this configuration private because it contains your key. JetBrains can also import an existing Claude Desktop configuration. See JetBrains' [official MCP guide](https://www.jetbrains.com/help/ai-assistant/mcp.html).

## Zed

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Open **Settings → AI → MCP Servers → Add Server → Add Local Server**.
3. Add this server to the settings file, replacing the key and both paths:

```json
{
  "context_servers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "PASTE_YOUR_PRIVATE_KIE_KEY_HERE",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

4. Return to **Settings → AI → MCP Servers**. A green dot with “Server is active” confirms the connection.

Keep the settings file private because it contains your key. Zed also forwards configured MCP servers to supported external agents. See Zed's [official MCP guide](https://zed.dev/docs/ai/mcp).

## Cline

The same setup works in Cline for VS Code and JetBrains.

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. In the Cline panel, click the **MCP Servers** icon.
3. Open **Configure → Configure MCP Servers**.
4. Add the [standard `mcpServers` configuration](#standard-mcpservers-configuration).
5. Save, confirm `kie-ai` is enabled, and check that its tools appear.

Cline CLI users can edit `~/.cline/mcp.json` or run `cline mcp`. See Cline's [official MCP guide](https://docs.cline.bot/mcp/mcp-overview).

## Roo Code

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Click the MCP icon in the Roo Code panel.
3. Choose **Edit Global MCP** for every project, or **Edit Project MCP** for `.roo/mcp.json`.
4. Add the [standard `mcpServers` configuration](#standard-mcpservers-configuration).
5. Save and make sure **Enable MCP Servers** is on.
6. Restart `kie-ai` from the same panel if it does not connect immediately.

Keep automatic approval off until you understand which tools you want to run without confirmation. See Roo Code's [official MCP guide](https://docs.roocode.com/features/mcp/using-mcp-in-roo).

## Windsurf / Cascade

These instructions are for the legacy Cascade agent. Devin Desktop now opens the Devin Local agent by default, and that newer agent uses separate Devin CLI configuration.

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Open the **MCPs** icon in Cascade, or **Devin Settings → Cascade → MCP Servers**.
3. Open the raw configuration at `~/.codeium/windsurf/mcp_config.json`.
4. Add:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "${env:KIE_API_KEY}",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

5. Save, open `kie-ai` in the MCP panel, and enable the tools you want.

Cascade supports `${env:KIE_API_KEY}` interpolation so the key does not need to live in the JSON file. KIE Creator exposes fewer than Cascade's 100-tool limit. See the current [official Cascade MCP guide](https://docs.devin.ai/desktop/cascade/mcp).

## Visual Studio on Windows

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Open Copilot Chat and switch to **Agent** mode.
3. Select **Tools → + → Add custom MCP server**.
4. Name it `kie-ai`, choose `stdio`, set the command to `node`, and set the argument to `C:/absolute/path/to/kie-mcp/dist/src/index.js`.
5. Add the three environment values shown in the [standard configuration](#standard-mcpservers-configuration), using a Windows media path such as `C:/Users/YOU/KIE Media`.
6. Save, then manually enable the KIE tools in the tool picker; Visual Studio disables newly discovered MCP tools by default.

Visual Studio can also discover `.mcp.json`, `.vscode/mcp.json`, and `.cursor/mcp.json` files in a solution. See Microsoft's [official Visual Studio MCP guide](https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers?view=visualstudio).

## Codex desktop and CLI

Codex desktop and the Codex CLI share the same MCP registration.

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Run:

```bash
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/KIE Media" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

3. Check it with `codex mcp get kie-ai`.
4. Start a fresh Codex task so the new tools load.

Codex can use KIE Creator and its browser in the same task. The browser is separate; it does not need another KIE connection. See OpenAI's [official Codex MCP guide](https://developers.openai.com/codex/mcp/).

## Claude Code

1. Complete [the shared local setup](#what-every-local-ide-needs).
2. Run:

```bash
claude mcp add \
  --scope user \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/KIE Media" \
  --transport stdio \
  kie-ai \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

3. Run `claude mcp list` and confirm `kie-ai` says **Connected**.
4. Inside Claude Code, `/mcp` opens the server status panel.

See Anthropic's [official Claude Code MCP guide](https://code.claude.com/docs/en/mcp).

## Standard `mcpServers` configuration

Cursor, JetBrains AI Assistant, Cline, Roo Code, and legacy Cascade all accept this basic shape. Some of those apps can replace the key with an environment variable; their sections above show the safest documented option.

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "PASTE_YOUR_PRIVATE_KIE_KEY_HERE",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

Never commit or share a file after pasting your real key into it.

## Confirm it works

Start a new chat in your chosen app and paste:

> Use `kie_check_configuration`. Tell me whether KIE Creator is ready, but do not show or repeat any secret values. Do not generate media yet.

A ready setup reports:

- the API key is configured;
- the official KIE API base is `https://api.kie.ai`;
- the native KIE upload base is `https://kieai.redpandaai.co`;
- local file upload is enabled;
- the dedicated media folder is configured.

Then try a real creation:

> Use a low-cost image model to create a simple square test image. Tell me the model and estimated credit use before you submit it.

Generation spends KIE credits. Configuration checks, model discovery, task status checks, and the local doctor do not submit a generation.

## Update it later

Claude Desktop users can download the newest `.mcpb` from [Releases](https://github.com/alfman99/kie-mcp/releases/latest) and install it over the existing extension.

Source installations can update from the repository folder:

```bash
git pull --ff-only
npm ci
npm run build
npm run mcp:doctor
```

Restart the IDE or its MCP server after updating.

If you installed from a ZIP instead of Git, download the newest ZIP, replace the old source folder, and run the three `npm` commands again.

## Troubleshooting

| Problem | Fix |
|---|---|
| `node` is not found | Install Node.js 20+, restart the app, or replace `node` with the absolute Node executable path. |
| The server file is missing | Run `npm run build` and confirm `dist/src/index.js` exists. |
| The server connects but KIE is not ready | Re-enter `KIE_API_KEY`, then restart the MCP server. |
| Local reference upload is blocked | Put the file inside the exact `KIE_LOCAL_UPLOAD_ROOT`; do not use a symlink to another folder. |
| No KIE tools appear | Enable the server and tools, restart them from the app's MCP panel, then start a new chat. |
| Tools look out of date | Restart the MCP server or fully quit and reopen the app. |
| A GUI app cannot see `KIE_API_KEY` | Use the app's protected secret prompt, launch it from a terminal that has the variable, or use a private local config entry. |
| Windows JSON paths fail | Use forward slashes, for example `C:/Users/Alex/KIE Media`. |

Do not send logs containing your API key. If you accidentally expose it, revoke it on [KIE's API key page](https://kie.ai/api-key) and create a new one.

## ChatGPT in a web browser

The local release uses stdio: your app starts a private process on your computer, and no port is opened. `chatgpt.com` cannot start that local process.

ChatGPT connectors require a reachable remote MCP endpoint using Streamable HTTP or HTTP/SSE. A private deployment can use OpenAI's Secure MCP Tunnel where available. That hosted edition needs per-user authentication, isolated KIE credentials, safe attachment handling, monitoring, and a public privacy policy; it is not included in this local release.

Codex desktop is supported and can use its browser alongside the local KIE MCP. ChatGPT's website is a different product boundary. See OpenAI's official [MCP and Connectors guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) and [Secure MCP Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

## Data path

Every supported local app uses the same direct path:

```text
Your app → local KIE Creator MCP → official KIE API
                                ↳ native KIE upload service
```

No Docker service, public port, Cloudinary, S3, ImgBB, Firebase, Supabase, or other media middleman is involved. KIE behavior and parameters are maintained against [KIE's official documentation](https://docs.kie.ai/), including its [native file upload API](https://docs.kie.ai/file-upload-api/quickstart).
