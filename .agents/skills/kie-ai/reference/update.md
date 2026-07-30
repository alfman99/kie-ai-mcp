# Update Official Docs

1. Complete [check.md](check.md).
2. If drift exists and an update is authorized, run `npm run docs:update`.
3. Inspect the manifest and generated-data diff.
4. Compare changed models and endpoints with curated tools in `src/server.ts` and `src/products.ts`.
5. Run:

```bash
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

6. Restart the MCP process. Call `kie_get_local_catalogs` and verify its manifest matches the refreshed files.

Abort without replacing the last-known-good snapshot on any fetch, redirect, parse, provenance, duplicate, or schema validation failure.
