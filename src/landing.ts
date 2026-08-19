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
<title>KIE MCP</title>
<meta name="description" content="Hosted MCP server for image, video, and speech generation through KIE.ai. Connect any MCP client with your own KIE API key.">
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
    width: 100%; min-height: 8.5rem; resize: vertical; background: var(--card); color: var(--fg);
    border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.1rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .84rem; line-height: 1.6;
  }
</style>
</head>
<body>
<main>
  <h1>KIE MCP</h1>
  <p class="lede">
    A hosted <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server that lets any
    MCP client generate images, video, and speech through <a href="https://kie.ai">KIE.ai</a>.
    Nothing to install &mdash; point your client at the URL below and bring your own KIE API key.
  </p>

  <p class="disclaimer">
    <b>Unofficial project.</b> This is an independent, community-built MCP server that talks to KIE.ai's
    public API. It is not affiliated with, endorsed by, or operated by the KIE.ai team, and this site is
    not run by them. For anything about your KIE account, billing, or the models themselves, go to
    <a href="https://kie.ai">kie.ai</a>.
  </p>

  <h2>Connect</h2>
  <p>Add this to your client's MCP configuration:</p>
  <pre><code>{
  "mcpServers": {
    "kie": {
      "type": "http",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_KIE_API_KEY"
      }
    }
  }
}</code></pre>
  <p>Or, with the Claude Code CLI:</p>
  <pre><code>claude mcp add --transport http kie ${endpoint} \\
  --header "Authorization: Bearer YOUR_KIE_API_KEY"</code></pre>
  <p>Or just paste this to the coding agent in your IDE and let it do the setup:</p>
  <div class="paste">
    <textarea readonly onclick="this.select()">Add a remote MCP server to my editor's MCP configuration.

Name: kie
Transport: streamable HTTP (not stdio, not SSE)
URL: ${endpoint}
Auth: send the header  Authorization: Bearer YOUR_KIE_API_KEY

Write it in whatever config file and JSON shape this editor expects (Cursor, VS Code,
Windsurf, Claude Code and Codex each use a slightly different one). Leave a clear
YOUR_KIE_API_KEY placeholder for me to fill in rather than inventing a key, and do
not commit the key to git. When you are done, tell me which file you changed and
whether I need to restart the editor.</textarea>
  </div>

  <p class="note">
    Get a key at <a href="https://kie.ai/api-key">kie.ai/api-key</a>. Your key is used only to serve
    your own requests and is never stored &mdash; this relay keeps no key of its own, so every
    generation is billed to your account, not someone else's.
  </p>

  <h2>Use</h2>
  <p>Once connected, just ask. The tools are designed so a single call does a whole batch in parallel:</p>
  <ul>
    <li>&ldquo;Generate four product shots of a ceramic mug on a linen background.&rdquo;</li>
    <li>&ldquo;Make a 5 second clip of rain on a window, then narrate this line over it.&rdquo;</li>
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

  <h2>Run it yourself</h2>
  <p>
    The server also runs locally over stdio, and the whole thing is open source. Setup for every
    supported client, the environment variables, and the full tool reference are in the repository.
  </p>
  <pre><code>npx kie-ai-mcp</code></pre>

  <footer>
    <a href="${REPOSITORY_URL}">Source on GitHub</a> &middot;
    <a href="${REPOSITORY_URL}#readme">Documentation</a> &middot;
    <a href="/healthz">Health</a> &middot;
    MIT licensed
  </footer>
</main>
</body>
</html>`;
}
