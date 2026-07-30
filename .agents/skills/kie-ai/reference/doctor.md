# Doctor

From a source checkout:

```bash
npm run build
npm run mcp:doctor
```

Use `npm run mcp:doctor:live` only when `KIE_API_KEY` is already available in the process environment. The live doctor calls only the credit-balance endpoint to validate authentication. It does not create media or consume credits.

The doctor must:

1. Spawn the built MCP over stdio.
2. Complete MCP initialization.
3. List tools and resources.
4. Call configuration and local-catalog tools.
5. Optionally verify live authentication.
6. Close the client and transport.
7. Confirm the child process exited.

Treat a timeout, missing tool/resource, catalog failure, leaked stderr, or surviving child process as a failed diagnosis.
