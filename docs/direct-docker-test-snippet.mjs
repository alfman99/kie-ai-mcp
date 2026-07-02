import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function readText(result) {
  const first = Array.isArray(result?.content) ? result.content[0] : undefined;
  return first?.type === 'text' ? first.text : '';
}

function parseToolJson(result) {
  const text = readText(result);
  return text ? JSON.parse(text) : {};
}

if (!process.env.KIE_API_KEY) {
  console.error('Missing KIE_API_KEY. Run: KIE_API_KEY="your-kie-api-key" npm run docker:mcp:test');
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    '-e',
    'KIE_API_KEY',
    '-e',
    'KIE_API_BASE_URL',
    '-e',
    'KIE_UPLOAD_BASE_URL',
    '-e',
    'KIE_WEBHOOK_HMAC_KEY',
    '-e',
    'KIE_POLL_INTERVAL_MS',
    '-e',
    'KIE_POLL_TIMEOUT_MS',
    '-e',
    'KIE_ALLOW_LOCAL_FILE_UPLOADS',
    'kie-ai-mcp-server:latest'
  ],
  env: {
    KIE_API_KEY: process.env.KIE_API_KEY,
    KIE_API_BASE_URL: process.env.KIE_API_BASE_URL ?? 'https://api.kie.ai',
    KIE_UPLOAD_BASE_URL: process.env.KIE_UPLOAD_BASE_URL ?? 'https://kieai.redpandaai.co',
    KIE_WEBHOOK_HMAC_KEY: process.env.KIE_WEBHOOK_HMAC_KEY ?? '',
    KIE_POLL_INTERVAL_MS: process.env.KIE_POLL_INTERVAL_MS ?? '',
    KIE_POLL_TIMEOUT_MS: process.env.KIE_POLL_TIMEOUT_MS ?? '',
    KIE_ALLOW_LOCAL_FILE_UPLOADS: process.env.KIE_ALLOW_LOCAL_FILE_UPLOADS ?? 'false'
  }
});

const client = new Client({ name: 'kie-docker-direct-test', version: '1.0.0' });

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const resources = await client.listResources();
  const docs = await client.readResource({ uri: 'kie://docs/analysis' });
  const config = parseToolJson(await client.callTool({ name: 'kie_check_configuration', arguments: {} }));
  const credits = parseToolJson(await client.callTool({ name: 'kie_get_credits', arguments: {} }));
  const requiredFriendlyTools = ['kie_create_image', 'kie_create_video', 'kie_create_speech', 'kie_get_creation'];
  const toolNames = new Set(tools.tools.map((tool) => tool.name));
  const missingFriendlyTools = requiredFriendlyTools.filter((tool) => !toolNames.has(tool));

  console.log(JSON.stringify({
    ok: credits?.code === 200 && missingFriendlyTools.length === 0,
    server: 'kie-ai-mcp-server:latest',
    transport: 'docker stdio',
    toolCount: tools.tools.length,
    resourceCount: resources.resources.length,
    hasDocs: Array.isArray(docs.contents) && docs.contents.length > 0,
    requiredFriendlyTools,
    missingFriendlyTools,
    hasApiKey: config.hasApiKey,
    creditsCode: credits.code,
    credits: credits.data
  }, null, 2));
} finally {
  await client.close();
}
