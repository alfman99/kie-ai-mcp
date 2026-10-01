/**
 * The page served at `/` on the hosted relay.
 *
 * Someone who lands here typed the bare hostname: they want to know what this is and how to
 * connect to it, in that order, without scrolling. Everything else belongs in the README.
 */

export const REPOSITORY_URL = "https://github.com/alfman99/kie-ai-mcp";
export const HOSTED_URL = "https://kie-mcp.alfredomanresa.com";

export function landingPage(mcpPath: string): string {
  const endpoint = `${HOSTED_URL}${mcpPath}`;
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
    --bg: #fbfbfa; --fg: #16150f; --muted: #6b6a63; --line: #e4e2dc;
    --card: #ffffff; --accent: #b4501f; --code-bg: #f4f2ee;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14130f; --fg: #eeece5; --muted: #9a978d; --line: #2c2a24;
      --card: #1b1a15; --accent: #e08b5a; --code-bg: #211f1a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 3.5rem 1.25rem 5rem; background: var(--bg); color: var(--fg);
    font: 16px/1.65 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  main { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 2rem; letter-spacing: -0.02em; margin: 0 0 .4rem; }
  h2 { font-size: 1.05rem; letter-spacing: -0.01em; margin: 2.5rem 0 .75rem; }
  .lede { color: var(--muted); font-size: 1.08rem; margin: 0 0 2rem; }
  p { margin: 0 0 1rem; }
  a { color: var(--accent); }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .875em;
         background: var(--code-bg); padding: .15em .4em; border-radius: 4px; }
  pre {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 1rem 1.1rem; overflow-x: auto; margin: 0 0 1rem;
  }
  pre code { background: none; padding: 0; font-size: .84rem; line-height: 1.6; }
  ol, ul { margin: 0 0 1rem; padding-left: 1.3rem; }
  li { margin-bottom: .45rem; }
  .tools { list-style: none; padding: 0; display: grid; gap: .5rem;
           grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
  .tools li { border: 1px solid var(--line); border-radius: 8px; padding: .6rem .8rem;
              background: var(--card); margin: 0; font-size: .9rem; }
  .tools b { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
             font-weight: 600; font-size: .85rem; display: block; }
  .tools span { color: var(--muted); font-size: .85rem; }
  footer { margin-top: 3.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line);
           color: var(--muted); font-size: .875rem; }
  .note { color: var(--muted); font-size: .9rem; }
  .disclaimer {
    border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 8px;
    background: var(--card); padding: .8rem 1rem; margin: 0 0 2rem; font-size: .9rem; color: var(--muted);
  }
  .disclaimer b { color: var(--fg); font-weight: 600; }
  .paste { position: relative; }
  .paste textarea {
    width: 100%; min-height: 9.5rem; resize: vertical; background: var(--card); color: var(--fg);
    border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.1rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .84rem; line-height: 1.6;
  }
  .copy {
    position: absolute; top: .55rem; right: .55rem; border: 1px solid var(--line);
    background: var(--bg); color: var(--fg); border-radius: 6px; padding: .3rem .65rem;
    font: inherit; font-size: .78rem; cursor: pointer;
  }
  .copy:hover { border-color: var(--accent); color: var(--accent); }
</style>
</head>
<body>
<main>
  <h1>KIE.AI MCP</h1>
  <p class="lede">
    Create AI images, videos, and voiceovers with <a href="https://kie.ai">KIE.ai</a> from
    Claude Code, Codex, Cursor, or VS Code. This open-source
    <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server uses your own KIE credits.
  </p>

  <p class="disclaimer">
    <b>Unofficial project.</b> This server is maintained independently of KIE.ai.
    For account or billing questions, contact <a href="https://kie.ai">KIE</a>.
  </p>

  <h2>Connect your AI app</h2>
  <p>Get a key at <a href="https://kie.ai/api-key">kie.ai/api-key</a>.
    For Cursor or a client with the same configuration format, add:</p>
  <pre><code>{
  "mcpServers": {
    "kie-ai": {
      "type": "http",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_KIE_API_KEY"
      }
    }
  }
}</code></pre>
  <p>Or, with the Claude Code CLI:</p>
  <pre><code>claude mcp add --transport http kie-ai ${endpoint} \\
  --header "Authorization: Bearer YOUR_KIE_API_KEY"</code></pre>
  <p>Or just paste this to the coding agent in your IDE and let it do the setup:</p>
  <div class="paste">
    <button class="copy" type="button" data-copy>Copy</button>
    <textarea id="agent-prompt" aria-label="MCP setup instructions" readonly onclick="this.select()">Add a remote MCP server named kie-ai to this app.
Use Streamable HTTP at ${endpoint}.
Send Authorization: Bearer YOUR_KIE_API_KEY.
Leave the key as a placeholder and tell me where to enter it privately.
Tell me whether I need to restart the app.</textarea>
  </div>

  <p class="note">
    The hosted server receives your key on each request and forwards it to KIE.
    Keep the key in private client configuration. Use the
    <a href="${REPOSITORY_URL}/blob/main/docs/INSTALL_OTHER_APPS.md#choose-your-app">app-by-app setup guide</a>
    for Codex and VS Code. See <a href="${REPOSITORY_URL}/blob/main/docs/CLIENT_COMPATIBILITY.md">client compatibility</a>
    for web chat limitations.
  </p>

  <h2>Create an image, video, or voiceover</h2>
  <p>Start a new chat after connecting, then describe the result you want:</p>
  <ul>
    <li>&ldquo;Use Seedream 5.0 Pro to create a square photo of a red ceramic mug on a wooden table in morning light.&rdquo;</li>
    <li>&ldquo;Use Seedance 2.5 to make a five-second video of waves reaching a sandy beach, at 720p in 16:9.&rdquo;</li>
    <li>&ldquo;Read this in a calm voice: Your order is ready for collection.&rdquo;</li>
  </ul>
  <ul class="tools">
    <li><b>kie_create_image</b><span>Create or edit images</span></li>
    <li><b>kie_create_video</b><span>Create video clips</span></li>
    <li><b>kie_create_speech</b><span>Create voiceover and narration</span></li>
    <li><b>kie_get_creation</b><span>Collect finished media</span></li>
    <li><b>kie_upload_media</b><span>Upload reference media</span></li>
    <li><b>kie_get_credits</b><span>Check your KIE balance</span></li>
  </ul>
  <p class="note">
    Videos take minutes, so they return a task ID immediately; ask for the result and the client
    collects it. Images and speech usually come back in the same call.
  </p>

  <h2>Using your own files</h2>
  <p>
    A hosted server cannot reach your disk, so a reference image or audio clip has to be sent to
    KIE first. Your API key already works against KIE's own upload API, so one request does it:
  </p>
  <pre><code>curl -X POST "https://kieai.redpandaai.co/api/file-stream-upload" \\
  -H "Authorization: Bearer YOUR_KIE_API_KEY" \\
  -F file=@/path/to/reference.png \\
  -F uploadPath=agent-uploads</code></pre>
  <p class="note">
    Take <code>downloadUrl</code> from the response and pass it to any create tool. Your agent is
    given the upload instructions when it connects. The upload goes directly to KIE under your own
    account. KIE upload URLs are temporary; download files you want to keep.
  </p>

  <h2>Run it yourself</h2>
  <p>
    The server also runs locally over stdio, and the whole thing is open source. Setup for every
    supported client, the environment variables, and the full tool reference are in the repository.
  </p>
  <p>
    <a href="${REPOSITORY_URL}/blob/main/docs/INSTALL_OTHER_APPS.md#claude">Install the Claude Desktop extension</a>
    or <a href="${REPOSITORY_URL}/blob/main/docs/INSTALL_OTHER_APPS.md#one-time-source-setup">build the local server from source</a>.
  </p>

  <footer>
    <a href="${REPOSITORY_URL}">Source on GitHub</a> &middot;
    <a href="${REPOSITORY_URL}/blob/main/docs/README.md">Documentation</a> &middot;
    <a href="/healthz">Health</a> &middot;
    MIT licensed
  </footer>
</main>
<script>
  // Progressive enhancement: the textarea is already selectable and copyable without this.
  document.querySelector("[data-copy]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const field = document.getElementById("agent-prompt");
    try {
      await navigator.clipboard.writeText(field.value);
    } catch {
      field.select();
      document.execCommand("copy");
    }
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = "Copy"; }, 1600);
  });
</script>
</body>
</html>`;
}
