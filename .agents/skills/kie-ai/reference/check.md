# Check Official Docs

1. Run `git status --short` and preserve unrelated changes.
2. Run `npm run docs:check`.
3. Inspect `src/data/docs_manifest.json`.
4. Confirm the source index is `https://docs.kie.ai/llms.txt`, failures equal zero, all source pages use `docs.kie.ai`, and all artifact hashes validate.
5. Report snapshot time, pages, operations, model count, model schema corrections, and endpoint corrections.

Do not rewrite files during a check.
