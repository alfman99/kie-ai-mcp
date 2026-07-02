#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKieMcpServer } from "./server.js";

const server = createKieMcpServer();
const transport = new StdioServerTransport();

await server.connect(transport);

