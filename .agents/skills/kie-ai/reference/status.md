# Status

1. Call `kie_check_configuration`.
2. Call `kie_get_local_catalogs` with `includeFullCatalogs: false`.
3. Confirm:
   - an API key is present for live tools;
   - API base URL is `https://api.kie.ai`;
   - native upload base URL is `https://kieai.redpandaai.co`;
   - the catalog source is bundled or an explicitly configured external snapshot;
   - manifest failures equal zero;
   - page, operation, and model counts are nonzero.
4. Report readiness without revealing secret values.

Use `doctor` when initialization or shutdown must also be exercised.
