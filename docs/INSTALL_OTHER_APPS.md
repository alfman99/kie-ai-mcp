# Install KIE Creator in the Top AI Apps

KIE Creator focuses on five mainstream AI products:

1. Claude
2. ChatGPT / Codex
3. Cursor
4. VS Code / GitHub Copilot
5. Windsurf

All five use the same KIE account and the same direct connection to KIE. Claude Desktop has the simplest no-code installation.

## Choose your app

| App | What to use |
|---|---|
| Claude | Install the `.mcpb` in Claude Desktop, or register the server in Claude Code |
| ChatGPT / Codex | Use Codex desktop or CLI for the local server; ChatGPT web needs a future hosted edition |
| Cursor | Use the included `.cursor/mcp.json` |
| VS Code / Copilot | Add the server through VS Code's MCP settings |
| Windsurf | Add the server through Cascade MCP settings |

## Claude

### Claude Desktop—recommended for most people

You do not need Node, Docker, Git, Terminal, or a configuration file.

1. Get a KIE key from [kie.ai/api-key](https://kie.ai/api-key).
2. Download [`kie-creator-for-claude.mcpb`](https://github.com/alfman99/kie-mcp/releases/latest/download/kie-creator-for-claude.mcpb).
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
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

Check the connection with `claude mcp list`. Inside Claude Code, `/mcp` opens the server status panel.

Official reference: [Claude Code MCP](https://code.claude.com/docs/en/mcp).

## ChatGPT / Codex

### Codex desktop and CLI

Codex desktop and the Codex CLI share the same MCP registration. Complete the [one-time source setup](#one-time-source-setup), then run:

```bash
codex mcp add kie-ai \
  --env KIE_API_KEY="$KIE_API_KEY" \
  --env KIE_ALLOW_LOCAL_FILE_UPLOADS="true" \
  --env KIE_LOCAL_UPLOAD_ROOT="/absolute/path/to/KIE Media" \
  -- node /absolute/path/to/kie-mcp/dist/src/index.js
```

Check it with `codex mcp get kie-ai`, then start a fresh Codex task.

Codex can use KIE Creator and its browser in the same task. The browser is a separate tool and does not need another KIE connection.

Official reference: [Codex MCP](https://developers.openai.com/codex/mcp/).

### ChatGPT website

The current release cannot be installed directly in `chatgpt.com`. ChatGPT's website cannot start a private local stdio process on your computer.

ChatGPT requires a separately hosted HTTPS MCP endpoint or OpenAI's Secure MCP Tunnel. That edition is not included yet because it needs per-user authentication, isolated KIE keys, secure attachment handling, monitoring, and a privacy policy.

Use Codex desktop for the current local version.

Official references: [MCP and Connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) and [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

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

Cursor Agent uses the same configuration. Check it with `cursor-agent mcp list-tools kie-ai`.

Official reference: [Cursor MCP](https://docs.cursor.com/context/model-context-protocol).

## VS Code / GitHub Copilot

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

4. Save the file and accept the trust prompt after reviewing the command.
5. Open Copilot Chat in **Agent** mode.
6. Select **Configure Tools** and enable the KIE tools.

VS Code uses `servers`, not `mcpServers`. Use **MCP: List Servers** to restart it or view its output.

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

The last command is a no-credit local health check. A successful run ends with `MCP doctor passed`.

Use these path formats:

| | macOS/Linux | Windows |
|---|---|---|
| Server | `/Users/YOU/kie-mcp/dist/src/index.js` | `C:/Users/YOU/kie-mcp/dist/src/index.js` |
| Media | `/Users/YOU/KIE Media` | `C:/Users/YOU/KIE Media` |

Use forward slashes in Windows JSON paths.

For terminal installers, load the key without putting it in shell history.

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

### Let the agent install it

Paste this into Claude Code, Codex, Cursor, VS Code, or Windsurf while the repository is open:

> Install this KIE Creator MCP server in the app I am currently using. Follow `docs/INSTALL_OTHER_APPS.md`, run the no-credit doctor, use an absolute path to `dist/src/index.js`, and create a dedicated `KIE Media` folder. Ask me to enter my KIE API key through the safest secret input the app supports. Never print, commit, or repeat my key.

## Confirm it works

Start a fresh chat and paste:

> Use `kie_check_configuration`. Tell me whether KIE Creator is ready, but do not show or repeat secret values. Do not generate media yet.

A ready setup reports the official KIE API, KIE's native upload service, and the dedicated local media folder.

Then, when you are ready to spend a small number of KIE credits:

> Use a low-cost image model to create a simple square test image. Tell me the model and estimated credit use before submitting it.

## Update

Claude Desktop users can install the newest `.mcpb` from [Releases](https://github.com/alfman99/kie-mcp/releases/latest) over the existing extension.

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
| KIE is not ready | Re-enter `KIE_API_KEY` and restart the MCP server. |
| A reference file is blocked | Put it inside the exact `KIE_LOCAL_UPLOAD_ROOT`; do not use a symlink outside it. |
| No KIE tools appear | Enable the server and tools, restart them, and start a fresh chat. |
| Windows paths fail | Use forward slashes, such as `C:/Users/Alex/KIE Media`. |

Never share logs or configuration containing your KIE key. Revoke exposed keys at [kie.ai/api-key](https://kie.ai/api-key).

## Direct KIE connection

```text
Your AI app → local KIE Creator MCP → official KIE API
                                    ↳ native KIE upload service
```

There is no Docker service, public port, Cloudinary, S3, ImgBB, Firebase, Supabase, or other media middleman. KIE behavior and parameters come only from [KIE's official documentation](https://docs.kie.ai/), including the [native file upload API](https://docs.kie.ai/file-upload-api/quickstart).
