# KIE.AI MCP setup for Claude, Codex, Cursor, and VS Code

Get a key from [kie.ai/api-key](https://kie.ai/api-key). Choose a hosted connection or a local
installation. Both use your own KIE credits.

## Choose your app

| App | What to use |
|---|---|
| Claude Desktop | [Install the local extension](#claude) |
| Claude Code | [Remote setup](#claude-code-remote) or [local setup](#claude-code) |
| Codex desktop / CLI | [Remote setup](#codex-remote) or [local setup](#codex-desktop-and-cli) |
| Cursor | [Remote setup](#cursor-remote) or [local setup](#cursor) |
| VS Code / Copilot | [Remote setup](#vs-code-remote) or [local setup](#vs-code-and-github-copilot) |
| Windsurf legacy Cascade | [Local setup](#windsurf) |
| ChatGPT website | See [authentication limits](CLIENT_COMPATIBILITY.md#authentication-limits) |

For remote setup, you need your app and a KIE key. For a local extension, use Claude Desktop.
For a local source installation, you also need Node.js 20 or newer.
Load your [key](#load-your-key) before using the terminal registration commands below.

## Remote setup

The hosted server is `https://kie-mcp.alfredomanresa.com/mcp`. It uses Streamable HTTP and requires
your KIE key in the `Authorization` header. It receives that key and forwards requests to KIE.
It cannot read local files.

You do not need this repository or Node.js for a remote connection. The CLI and environment-variable
examples below assume you have [loaded your key](#load-your-key). Start a new chat after setup.

If your coding agent can edit its app's configuration, paste this instead:

```text
Add a remote MCP server named kie-ai to this app.
Use Streamable HTTP at https://kie-mcp.alfredomanresa.com/mcp.
Send Authorization: Bearer YOUR_KIE_API_KEY.
Leave the key as a placeholder and tell me where to enter it privately.
Tell me whether I need to restart the app.
```

### Claude Code remote

```bash
claude mcp add --scope user --transport http kie-ai \
  https://kie-mcp.alfredomanresa.com/mcp \
  --header "Authorization: Bearer $KIE_API_KEY"
```

Claude saves the header in its private client configuration. Keep that configuration out of Git.
Check the connection with `/mcp` inside Claude Code.

### Codex remote

```bash
codex mcp add kie-ai \
  --url https://kie-mcp.alfredomanresa.com/mcp \
  --bearer-token-env-var KIE_API_KEY
```

Codex stores the environment-variable name, not the key. Make `KIE_API_KEY` available to the Codex
process and start a fresh task. An app opened from the Dock may not inherit your terminal environment.
See [Codex MCP configuration](https://developers.openai.com/codex/mcp/).

### Cursor remote

Add this entry to `~/.cursor/mcp.json`, preserving any existing servers:

```json
{
  "mcpServers": {
    "kie-ai": {
      "url": "https://kie-mcp.alfredomanresa.com/mcp",
      "headers": { "Authorization": "Bearer ${env:KIE_API_KEY}" }
    }
  }
}
```

Make `KIE_API_KEY` available to Cursor, then restart it and enable the server.
Cursor Agent uses the same configuration. See [Cursor's remote setup](https://cursor.com/docs/mcp).

### VS Code remote

Run **MCP: Open User Configuration** and add this configuration. Preserve existing servers and inputs:

```json
{
  "inputs": [
    { "type": "promptString", "id": "kie-api-key", "description": "KIE API key", "password": true }
  ],
  "servers": {
    "kie-ai": {
      "type": "http",
      "url": "https://kie-mcp.alfredomanresa.com/mcp",
      "headers": { "Authorization": "Bearer ${input:kie-api-key}" }
    }
  }
}
```

Start the server, enter the key when VS Code asks, and enable its tools in Copilot Chat.
Interactive inputs apply to the VS Code client; Agent Host sessions need a configuration without
interactive inputs. See [VS Code MCP setup](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

## Claude

### Claude Desktop extension

You do not need Node, Docker, Git, Terminal, or a configuration file.

1. Get a KIE key from [kie.ai/api-key](https://kie.ai/api-key).
2. Download [`kie-ai-mcp.mcpb`](https://github.com/alfman99/kie-ai-mcp/releases/latest/download/kie-ai-mcp.mcpb).
3. Open **Claude Desktop → Settings → Extensions → Advanced settings → Install Extension…**
4. Choose the downloaded file.
5. Paste your KIE key when Claude asks.
6. Choose a dedicated `KIE Media` folder.
7. Start a new conversation.

Claude stores the key as a sensitive extension setting. See Anthropic's [official local extension guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

### Claude Code

First complete the [one-time source setup](#one-time-source-setup), then run:

```bash
claude mcp add \
  --scope user \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/KIE Media" \
  --transport stdio \
  kie-ai \
  -- node /absolute/path/to/kie-ai-mcp/dist/src/index.js
```

Check the connection with `claude mcp list`. Inside Claude Code, `/mcp` opens the server status panel.

Official reference: [Claude Code MCP](https://code.claude.com/docs/en/mcp).

## ChatGPT and Codex

### Codex desktop and CLI

Codex desktop and the Codex CLI share the same MCP registration. Complete the [one-time source setup](#one-time-source-setup), then run:

```bash
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/KIE Media" \
  -- node /absolute/path/to/kie-ai-mcp/dist/src/index.js
```

Check it with `codex mcp get kie-ai`, then start a fresh Codex task.

Codex can use KIE.AI MCP and its browser in the same task. The browser is a separate tool and does not need another KIE connection.

Official reference: [Codex MCP](https://developers.openai.com/codex/mcp/).

### ChatGPT website

ChatGPT's website cannot start a local stdio server or supply the custom KIE key header that this
relay requires. The project does not provide an OAuth integration for ChatGPT. Use Codex desktop
or CLI, or another client with header support.

Official reference: [ChatGPT authentication requirements](https://developers.openai.com/plugins/build/auth).

## Cursor

This repository already includes `.cursor/mcp.json`.

1. Complete the [one-time source setup](#one-time-source-setup).
2. Create `~/KIE Media`.
3. Make `KIE_API_KEY` available to Cursor.
4. Open this repository in Cursor and restart it.
5. Open **Settings → MCP** and enable `kie-ai`.

For a global installation, add this to `~/.cursor/mcp.json` and replace both paths:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-ai-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "${env:KIE_API_KEY}",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

Cursor Agent uses the same configuration. Check it with `cursor-agent mcp list-tools kie-ai`.

Official reference: [Cursor MCP](https://docs.cursor.com/context/model-context-protocol).

## VS Code and GitHub Copilot

VS Code can ask for the KIE key once and store it securely.

1. Complete the [one-time source setup](#one-time-source-setup).
2. Open the Command Palette and run **MCP: Open User Configuration**.
3. Paste the following and replace both paths:

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
      "args": ["/absolute/path/to/kie-ai-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "${input:kie-api-key}",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

4. Save the file and accept the trust prompt after reviewing the command.
5. Open Copilot Chat in **Agent** mode.
6. Select **Configure Tools** and enable the KIE tools.

VS Code's user configuration uses `servers`. Its portable `.mcp.json` format uses `mcpServers`.
Use **MCP: List Servers** to restart a server or view its output.

Official references: [VS Code MCP setup](https://code.visualstudio.com/docs/agent-customization/mcp-servers) and [MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## Windsurf

These instructions apply to Windsurf's legacy Cascade agent. Devin Desktop now uses the Devin Local agent by default, which has separate configuration.

1. Complete the [one-time source setup](#one-time-source-setup).
2. Open the **MCPs** icon in Cascade, or **Devin Settings → Cascade → MCP Servers**.
3. Open `~/.codeium/windsurf/mcp_config.json`.
4. Add the following and replace both paths:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-ai-mcp/dist/src/index.js"],
      "env": {
        "KIE_API_KEY": "${env:KIE_API_KEY}",
        "KIE_ALLOW_LOCAL_FILE_UPLOADS": "true",
        "KIE_LOCAL_UPLOAD_ROOT": "/absolute/path/to/KIE Media"
      }
    }
  }
}
```

5. Save the file, open `kie-ai` in the MCP panel, and enable its tools.

Official reference: [Windsurf / Cascade MCP](https://docs.devin.ai/desktop/cascade/mcp).

## One-time source setup

Skip this section when using the Claude Desktop `.mcpb`.

You need:

- [Node.js 20 or newer](https://nodejs.org/en/download);
- a local copy of this repository;
- a KIE API key from [kie.ai/api-key](https://kie.ai/api-key);
- one dedicated `KIE Media` folder.

Download the repository from **GitHub → Code → Download ZIP**, unzip it, and open Terminal or PowerShell inside the folder. Developers can use `git clone` instead.

Run:

```bash
npm ci
npm run build
npm run mcp:doctor
```

The last command checks the local server without generating media. A successful run reports
`"ok": true` and `"childProcessExited": true`.

Use these path formats:

| | macOS/Linux | Windows |
|---|---|---|
| Server | `/Users/YOU/kie-ai-mcp/dist/src/index.js` | `C:/Users/YOU/kie-ai-mcp/dist/src/index.js` |
| Media | `/Users/YOU/KIE Media` | `C:/Users/YOU/KIE Media` |

Use forward slashes in Windows JSON paths.

## Load your key

For terminal setup, load the key without putting it in shell history. This does not require a
source installation. The app must inherit the environment variable from this terminal.

macOS/Linux:

```bash
read -s KIE_API_KEY
export KIE_API_KEY
```

Windows PowerShell:

```powershell
$secureKieKey = Read-Host "Paste your KIE API key" -AsSecureString
$env:KIE_API_KEY = [System.Net.NetworkCredential]::new("", $secureKieKey).Password
```

## Agent setup from source

Paste this into Claude Code, Codex, Cursor, VS Code, or Windsurf while the repository is open:

> Install this KIE.AI MCP server in the app I am currently using. Follow `docs/INSTALL_OTHER_APPS.md`, run the no-credit doctor, use an absolute path to `dist/src/index.js`, and create a dedicated `KIE Media` folder. Ask me to enter my KIE API key through the safest secret input the app supports. Never print, commit, or repeat my key.

## Confirm it works

Start a fresh chat and paste:

> Use `kie_check_configuration`. Tell me whether KIE.AI MCP is ready, but do not show or repeat secret values. Do not generate media yet.

A ready setup reports `hasApiKey: true`, the official KIE API, and KIE's native upload service.
A local installation with file uploads enabled also needs a configured media folder.

Then, when you are ready to spend a small number of KIE credits:

> Use a low-cost image model to create a simple square test image. Tell me the model and estimated credit use before submitting it.

## Update

The hosted server receives updates from its operator. Claude Desktop users can install the newest
published `.mcpb` from [Releases](https://github.com/alfman99/kie-ai-mcp/releases/latest) over the existing extension.

Git-based source installations can run:

```bash
git pull --ff-only
npm ci
npm run build
npm run mcp:doctor
```

ZIP users can download the newest ZIP and repeat the three `npm` commands. Restart the app or MCP server afterward.

## Troubleshooting

| Problem | Fix |
|---|---|
| `node` is not found | Install Node.js 20+, restart the app, or use the absolute Node executable path. |
| `dist/src/index.js` is missing | Run `npm run build`. |
| Remote server returns `401` | Check the key and `Authorization` header. The base URL must end in `/mcp`. |
| Remote server returns `405` in a browser | `/mcp` accepts MCP `POST` requests. Add it in your app; the browser page is not a connection test. |
| KIE is not ready | Re-enter `KIE_API_KEY` and restart the MCP server. |
| A reference file is blocked | Put it inside the exact `KIE_LOCAL_UPLOAD_ROOT`; do not use a symlink outside it. |
| No KIE tools appear | Enable the server and tools, restart them, and start a fresh chat. |
| Windows paths fail | Use forward slashes, such as `C:/Users/Alex/KIE Media`. |
| A generation wait times out | Keep the task ID and call `kie_get_creation`. Do not submit the generation again. |

Never share logs or configuration containing your KIE key. Revoke exposed keys at [kie.ai/api-key](https://kie.ai/api-key).

## Local KIE connection

```text
Your AI app → local KIE.AI MCP → official KIE API
                                    ↳ native KIE upload service
```

Local stdio runs without a public port or Docker. The hosted option uses a relay; see
[remote hosting](REMOTE_SERVER.md). Both use KIE's official API and native upload service.
Model parameters come from [KIE's official documentation](https://docs.kie.ai/).

[Documentation index](README.md)
