# Contributing

Thanks for improving this KIE.AI MCP server.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
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

The bundled local catalogs are derived from the official KIE documentation. If KIE adds or changes models/endpoints, refresh the research bundle and regenerate `src/data/` before changing code assumptions.
