#!/usr/bin/env node
import { createServer } from "node:http";
import { createRemoteHandler, HEALTH_PATH, MCP_PATH } from "./remote.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

const handler = createRemoteHandler();
const server = createServer((req, res) => {
  void handler(req, res);
});

// Long-running generations stream over one response; keep the socket alive past Node's default.
server.requestTimeout = 0;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 61_000;

server.listen(port, host, () => {
  console.log(`kie-ai-mcp listening on http://${host}:${port}${MCP_PATH} (health: ${HEALTH_PATH})`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
