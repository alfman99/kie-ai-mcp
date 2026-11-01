/**
 * The page served at `/` on the hosted relay.
 *
 * Someone who lands here typed the bare hostname: they want to know what this is and how to
 * connect to it, in that order. Setup comes first and fits one screen; everything else belongs
 * in the README.
 */

export const REPOSITORY_URL = "https://github.com/alfman99/kie-ai-mcp";
export const HOSTED_URL = "https://kie-mcp.alfredomanresa.com";

export function landingPage(mcpPath: string): string {
  const endpoint = `${HOSTED_URL}${mcpPath}`;
  const setupGuide = `${REPOSITORY_URL}/blob/main/docs/INSTALL_OTHER_APPS.md`;
  const loadKey = "read -s KIE_API_KEY &amp;&amp; export KIE_API_KEY";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KIE.AI MCP: AI Image, Video and Voice Generation</title>
<meta name="description" content="Connect Claude Code, Codex, Cursor or VS Code to KIE.ai for AI image, video and voice generation. Open-source MCP server using your own KIE credits.">
<link rel="canonical" href="${HOSTED_URL}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="KIE.AI MCP">
<meta property="og:title" content="KIE.AI MCP: AI Image, Video and Voice Generation">
<meta property="og:description" content="Create images, videos and voiceovers with KIE.ai from your AI app. Connect to the hosted MCP server or run it locally.">
<meta property="og:url" content="${HOSTED_URL}/">
<meta name="twitter:card" content="summary">
<style>
  :root {
    color-scheme: light dark;
    --bg: #fbfbfa; --fg: #16150f; --muted: #67665f; --line: #e5e3dd;
    --surface: #ffffff; --accent: #b4501f;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #131210; --fg: #edebe4; --muted: #9a978d; --line: #2b2924;
      --surface: #1a1915; --accent: #e08b5a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font: 16px/1.6 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 42rem; margin: 0 auto; padding: 0 1.25rem; }
  a { color: var(--accent); text-underline-offset: 2px; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  code, pre { font-family: var(--mono); }
  p code { font-size: .875em; }
  p { margin: 0 0 1rem; }

  header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 0; font-size: .9375rem; }
  header a { color: var(--muted); text-decoration: none; }
  header a:hover { color: var(--fg); }
  header .name { color: var(--fg); font-weight: 600; letter-spacing: -0.01em; }

  .hero { padding: 3.5rem 0 1rem; }
  h1 {
    font-size: clamp(2.1rem, 1.3rem + 3.2vw, 3.1rem); line-height: 1.08; letter-spacing: -0.035em;
    font-weight: 600; margin: 0 0 1.25rem; text-wrap: balance;
  }
  .lede { color: var(--muted); font-size: 1.125rem; max-width: 34rem; margin: 0; }
  .unofficial { color: var(--muted); font-size: .875rem; margin: 1.5rem 0 0; }

  h2 { font-size: 1.25rem; letter-spacing: -0.02em; font-weight: 600; margin: 0 0 1.25rem; }
  h3 { font-size: 1.0625rem; letter-spacing: -0.01em; font-weight: 600; margin: 0 0 .5rem; }
  section { padding: 3.5rem 0 0; }
  .steps { list-style: none; margin: 0; padding: 0; }
  .steps > li { padding: 0 0 2.25rem; }
  .steps > li:last-child { padding-bottom: 0; }
  .steps .n { color: var(--muted); font-weight: 500; font-variant-numeric: tabular-nums; margin-right: .5rem; }
  .note { color: var(--muted); font-size: .9375rem; }
  .muted { color: var(--muted); }

  .block { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); margin: 0 0 1rem; }
  .bar {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: .375rem .375rem .375rem .875rem; border-bottom: 1px solid var(--line);
    color: var(--muted); font-size: .8125rem;
  }
  .block pre { margin: 0; padding: .875rem 1rem 1rem; overflow-x: auto; font-size: .8125rem; line-height: 1.65; }
  .prompt pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .875rem; }
  .copy {
    min-height: 2rem; padding: 0 .75rem; border: 1px solid var(--line); border-radius: 7px;
    background: var(--bg); color: var(--fg); font: inherit; font-size: .8125rem; font-weight: 500; cursor: pointer;
  }
  .copy:hover { border-color: var(--muted); }
  .copy.primary { background: var(--fg); border-color: var(--fg); color: var(--bg); }
  .copy.primary:hover { opacity: .85; }

  .apps { border: 0; margin: 2rem 0 1rem; padding: 0; display: flex; flex-wrap: wrap; gap: .375rem; }
  .apps legend { padding: 0; margin-bottom: .75rem; font-weight: 600; }
  .apps label {
    position: relative; padding: .375rem .875rem; border: 1px solid var(--line); border-radius: 8px;
    color: var(--muted); font-size: .9375rem; cursor: pointer;
  }
  .apps label:hover { color: var(--fg); }
  .apps input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
  .apps label:has(:checked) { color: var(--fg); background: var(--surface); border-color: var(--fg); }
  .apps label:has(:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  .panel { display: none; }
  .setup:has([value=claude]:checked) [data-app=claude],
  .setup:has([value=codex]:checked) [data-app=codex],
  .setup:has([value=cursor]:checked) [data-app=cursor],
  .setup:has([value=vscode]:checked) [data-app=vscode],
  .setup:has([value=other]:checked) [data-app=other] { display: block; }

  .rows { margin: 0 0 1rem; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
  .rows div {
    display: grid; grid-template-columns: 7rem 1fr; gap: .25rem 1rem; align-items: center;
    min-height: 2.875rem; padding: .375rem .375rem .375rem .875rem; border-top: 1px solid var(--line);
  }
  .rows div:first-child { border-top: 0; }
  .rows dt { color: var(--muted); font-size: .875rem; }
  .rows dd { margin: 0; display: flex; justify-content: space-between; align-items: center; gap: .75rem; min-width: 0; }
  .rows dd code { font-size: .8125rem; overflow-wrap: anywhere; }
  .tools dt { color: var(--fg); font-family: var(--mono); font-size: .8125rem; }
  .tools dd { color: var(--muted); font-size: .9375rem; }
  .tools div { grid-template-columns: 11rem 1fr; padding-right: .875rem; }

  .examples { list-style: none; margin: 0 0 1.5rem; padding: 0; }
  .examples li { padding: .625rem 0; border-top: 1px solid var(--line); }
  .examples li:last-child { border-bottom: 1px solid var(--line); }

  footer {
    margin-top: 4rem; padding: 1.5rem 0 3rem; border-top: 1px solid var(--line);
    color: var(--muted); font-size: .875rem; display: flex; flex-wrap: wrap; gap: .5rem 1.25rem;
  }
  footer a { color: var(--muted); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  @media (max-width: 34rem) {
    .hero { padding: 2rem 0 .5rem; }
    section { padding-top: 2.5rem; }
    .rows div, .tools div { grid-template-columns: 1fr; padding-top: .625rem; padding-bottom: .625rem; }
  }
</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="name" href="/">KIE.AI MCP</a>
  <a href="${REPOSITORY_URL}">GitHub</a>
</header>

<main>
  <div class="hero">
    <h1>Images, video and voice from your coding agent</h1>
    <p class="lede">
      An open-source <a href="https://modelcontextprotocol.io">MCP</a> server for
      <a href="https://kie.ai">KIE.ai</a>. Connect Claude Code, Codex, Cursor or VS Code, and
      generate with your own KIE credits.
    </p>
    <p class="unofficial">
      Unofficial project, maintained independently of KIE.ai. For account or billing questions,
      contact <a href="https://kie.ai">KIE</a>.
    </p>
  </div>

  <section class="setup" aria-labelledby="setup">
    <h2 id="setup">Set it up</h2>
    <ol class="steps">
      <li>
        <h3><span class="n">1</span>Get a KIE API key</h3>
        <p>
          Create or copy one at <a href="https://kie.ai/api-key">kie.ai/api-key</a>.
          <span class="muted">The hosted server receives it with each request and forwards it to KIE,
          so keep it in your app's private settings, out of chats and Git.</span>
        </p>
      </li>
      <li>
        <h3><span class="n">2</span>Give your agent this prompt</h3>
        <p>Paste it into Claude Code, Codex, Cursor or VS Code. The agent adds the server and tells you where your key goes.</p>
        <div class="block prompt">
          <div class="bar">Setup prompt<button class="copy primary" type="button" data-copy="prompt" aria-label="Copy setup prompt" hidden>Copy</button></div>
          <pre id="prompt">Add the KIE.AI MCP server to the app you are running in.

Name: kie-ai
Transport: Streamable HTTP
URL: ${endpoint}
Header: Authorization: Bearer YOUR_KIE_API_KEY

Add it for my user, not only this project, and keep any servers already configured.
Do not ask me to paste my key here. Use the app's secret input or an environment variable if it has one; otherwise leave YOUR_KIE_API_KEY as a placeholder and tell me exactly where to replace it.
App-specific steps: ${setupGuide}#remote-setup
Then tell me whether to restart the app.</pre>
        </div>

        <fieldset class="apps">
          <legend>Or set it up yourself</legend>
          <label><input type="radio" name="app" value="claude" checked>Claude Code</label>
          <label><input type="radio" name="app" value="codex">Codex</label>
          <label><input type="radio" name="app" value="cursor">Cursor</label>
          <label><input type="radio" name="app" value="vscode">VS Code</label>
          <label><input type="radio" name="app" value="other">Other apps</label>
        </fieldset>

        <div class="panel" data-app="claude">
          <p>Load your key without saving it in shell history. Paste the key when the terminal waits; it will not show.</p>
          <div class="block">
            <div class="bar">Terminal<button class="copy" type="button" data-copy="claude-key" aria-label="Copy key command for Claude Code" hidden>Copy</button></div>
            <pre id="claude-key">${loadKey}</pre>
          </div>
          <p>Then add the server for all your projects:</p>
          <div class="block">
            <div class="bar">Terminal<button class="copy" type="button" data-copy="claude-add" aria-label="Copy Claude Code command" hidden>Copy</button></div>
            <pre id="claude-add">claude mcp add --scope user --transport http kie-ai \\
  ${endpoint} \\
  --header "Authorization: Bearer $KIE_API_KEY"</pre>
          </div>
          <p class="note">Check it with <code>/mcp</code> inside Claude Code.</p>
        </div>

        <div class="panel" data-app="codex">
          <p>Load your key without saving it in shell history. Paste the key when the terminal waits; it will not show.</p>
          <div class="block">
            <div class="bar">Terminal<button class="copy" type="button" data-copy="codex-key" aria-label="Copy key command for Codex" hidden>Copy</button></div>
            <pre id="codex-key">${loadKey}</pre>
          </div>
          <p>Then add the server:</p>
          <div class="block">
            <div class="bar">Terminal<button class="copy" type="button" data-copy="codex-add" aria-label="Copy Codex command" hidden>Copy</button></div>
            <pre id="codex-add">codex mcp add kie-ai \\
  --url ${endpoint} \\
  --bearer-token-env-var KIE_API_KEY</pre>
          </div>
          <p class="note">
            Codex saves the variable name, not the key, so <code>KIE_API_KEY</code> must be set
            wherever Codex runs. An app opened from the Dock may not see your terminal's variables.
            Check it with <code>codex mcp get kie-ai</code>.
          </p>
        </div>

        <div class="panel" data-app="cursor">
          <p>Add this to <code>~/.cursor/mcp.json</code>, keeping any servers already there, and replace <code>YOUR_KIE_API_KEY</code> with your key.</p>
          <div class="block">
            <div class="bar">~/.cursor/mcp.json<button class="copy" type="button" data-copy="cursor-json" aria-label="Copy Cursor configuration" hidden>Copy</button></div>
            <pre id="cursor-json">{
  "mcpServers": {
    "kie-ai": {
      "url": "${endpoint}",
      "headers": { "Authorization": "Bearer YOUR_KIE_API_KEY" }
    }
  }
}</pre>
          </div>
          <p class="note">Restart Cursor and enable <code>kie-ai</code> in its MCP settings. Cursor Agent uses the same file.</p>
        </div>

        <div class="panel" data-app="vscode">
          <p>Run <b>MCP: Open User Configuration</b> from the Command Palette and add this, keeping existing servers and inputs.</p>
          <div class="block">
            <div class="bar">mcp.json<button class="copy" type="button" data-copy="vscode-json" aria-label="Copy VS Code configuration" hidden>Copy</button></div>
            <pre id="vscode-json">{
  "inputs": [
    { "type": "promptString", "id": "kie-api-key", "description": "KIE API key", "password": true }
  ],
  "servers": {
    "kie-ai": {
      "type": "http",
      "url": "${endpoint}",
      "headers": { "Authorization": "Bearer \${input:kie-api-key}" }
    }
  }
}</pre>
          </div>
          <p class="note">Start the server, enter your key when VS Code asks, then enable its tools in Copilot Chat.</p>
        </div>

        <div class="panel" data-app="other">
          <p>Any app that supports remote MCP servers with a custom header:</p>
          <dl class="rows">
            <div><dt>Name</dt><dd><code>kie-ai</code></dd></div>
            <div><dt>Transport</dt><dd><code>Streamable HTTP</code></dd></div>
            <div><dt>URL</dt><dd><code id="other-url">${endpoint}</code><button class="copy" type="button" data-copy="other-url" aria-label="Copy server URL" hidden>Copy</button></dd></div>
            <div><dt>Header</dt><dd><code id="other-header">Authorization: Bearer YOUR_KIE_API_KEY</code><button class="copy" type="button" data-copy="other-header" aria-label="Copy header" hidden>Copy</button></dd></div>
          </dl>
          <p>For apps that read an <code>mcpServers</code> JSON file:</p>
          <div class="block">
            <div class="bar">JSON<button class="copy" type="button" data-copy="other-json" aria-label="Copy JSON configuration" hidden>Copy</button></div>
            <pre id="other-json">{
  "mcpServers": {
    "kie-ai": {
      "type": "http",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_KIE_API_KEY"
      }
    }
  }
}</pre>
          </div>
          <p class="note">
            ChatGPT's website cannot send a custom header, so it cannot connect. See
            <a href="${REPOSITORY_URL}/blob/main/docs/CLIENT_COMPATIBILITY.md">client compatibility</a>.
          </p>
        </div>

        <p class="note">Step-by-step setup for each app, including Windows: <a href="${setupGuide}#remote-setup">setup guide</a>.</p>
      </li>
      <li>
        <h3><span class="n">3</span>Check the connection</h3>
        <p>Start a new chat and ask for your KIE credit balance. If a number comes back, the server and your key both work.</p>
      </li>
    </ol>
  </section>

  <section aria-labelledby="use">
    <h2 id="use">Ask for what you want</h2>
    <p>Describe the result in plain words. Each generation uses your KIE credits.</p>
    <ul class="examples">
      <li>&ldquo;Use Seedream 5.0 Pro to create a square photo of a red ceramic mug on a wooden table in morning light.&rdquo;</li>
      <li>&ldquo;Use Seedance 2.5 to make a five-second video of waves reaching a sandy beach, at 720p in 16:9.&rdquo;</li>
      <li>&ldquo;Read this in a calm voice: Your order is ready for collection.&rdquo;</li>
    </ul>
    <dl class="rows tools">
      <div><dt>kie_create_image</dt><dd>Create or edit images</dd></div>
      <div><dt>kie_create_video</dt><dd>Create video clips</dd></div>
      <div><dt>kie_create_speech</dt><dd>Create voiceover and narration</dd></div>
      <div><dt>kie_get_creation</dt><dd>Collect finished media</dd></div>
      <div><dt>kie_upload_media</dt><dd>Upload reference media</dd></div>
      <div><dt>kie_get_credits</dt><dd>Check your KIE balance</dd></div>
    </dl>
    <p class="note">
      Videos take minutes, so they return a task ID right away; ask for the result and the agent
      collects it. Images and speech usually come back in the same call.
    </p>
  </section>

  <section aria-labelledby="files">
    <h2 id="files">Using your own files</h2>
    <p>
      A hosted server cannot reach your disk, so a reference image or audio clip has to be sent to
      KIE first. Your API key already works with KIE's own upload API, so one request does it:
    </p>
    <div class="block">
      <div class="bar">Terminal<button class="copy" type="button" data-copy="upload" aria-label="Copy upload command" hidden>Copy</button></div>
      <pre id="upload">curl -X POST "https://kieai.redpandaai.co/api/file-stream-upload" \\
  -H "Authorization: Bearer YOUR_KIE_API_KEY" \\
  -F file=@/path/to/reference.png \\
  -F uploadPath=agent-uploads</pre>
    </div>
    <p class="note">
      Pass <code>downloadUrl</code> from the response to any create tool. Your agent gets this
      command when it connects. The upload goes directly to KIE under your own account. KIE upload
      URLs are temporary; download files you want to keep.
    </p>
  </section>

  <section aria-labelledby="local">
    <h2 id="local">Run it yourself</h2>
    <p>
      The server also runs locally over stdio, and the whole thing is open source. Setup for every
      supported app, the environment variables and the full tool reference are in the repository.
    </p>
    <p>
      <a href="${setupGuide}#claude">Install the Claude Desktop extension</a>
      or <a href="${setupGuide}#one-time-source-setup">build the local server from source</a>.
    </p>
  </section>
</main>

<footer>
  <a href="${REPOSITORY_URL}">Source on GitHub</a>
  <a href="${REPOSITORY_URL}/blob/main/docs/README.md">Documentation</a>
  <a href="/healthz">Health</a>
  <span>MIT licensed</span>
</footer>
</div>
<p class="sr-only" aria-live="polite" id="copy-status"></p>
<script>
  // Progressive enhancement: every block is plain selectable text, so the buttons only appear with JS.
  const status = document.getElementById("copy-status");
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.copy);
      try {
        await navigator.clipboard.writeText(source.textContent);
      } catch {
        getSelection().selectAllChildren(source);
        document.execCommand("copy");
      }
      button.textContent = "Copied";
      status.textContent = "Copied to clipboard";
      setTimeout(() => { button.textContent = "Copy"; status.textContent = ""; }, 1600);
    });
  });
</script>
</body>
</html>`;
}
