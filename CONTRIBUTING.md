# Contributing

Thanks for improving this KIE.AI MCP server.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run mcp:doctor
```

Docker checks:

```bash
npm run docker:build
KIE_API_KEY="your-kie-api-key" npm run docker:mcp:test
```

## Pull Requests

- Keep API keys, `.env`, generated media, and local task outputs out of commits.
- Add or update tests for behavior changes.
- Update `README.md` or `docs/` when changing user-facing setup or tool behavior.
- Prefer friendly creative tools for user-facing workflows and keep raw API tools available for advanced control.

## Documentation Sources

The bundled catalogs are generated only from `https://docs.kie.ai/llms.txt` and the official `docs.kie.ai` Markdown pages it lists.

```bash
npm run docs:check
npm run docs:update
```

Review `src/data/docs_manifest.json` and the generated diff before changing code assumptions. Never hand-edit `src/data`, accept a partial crawl, or use third-party documentation as an API source. After a refresh, audit curated defaults in `src/server.ts` and product operations in `src/products.ts`, then run the normal test, typecheck, build, and package checks.
