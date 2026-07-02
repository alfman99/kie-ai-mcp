<goal>
Build a local TypeScript MCP server for KIE.AI that exposes documented KIE common utilities, file uploads, async media/task APIs, market model schema discovery, webhook verification, and product-specific media helpers through stdio transport.
</goal>

<context>
Read these files first:
- `SPEC.md`
- `research/kie-docs/ANALYSIS.md`
- `research/kie-docs/openapi_endpoint_catalog.json`
- `research/kie-docs/market_model_registry.json`
- `research/kie-docs/OPENAPI_CATALOG.md`
- `research/kie-docs/MARKET_MODEL_REGISTRY.md`

Useful discovery commands:
- `git status --short`
- `rg --files`
- `rg "KIE_|kie_" .`
</context>

<constraints>
Use TypeScript on Node.js 20+ with `@modelcontextprotocol/sdk` and stdio transport.

V1 scope includes common utilities, uploads, webhook verification, unified Market task tools, docs resources, and product-specific helpers for 4o Image, Flux Kontext, Runway/Aleph, Suno, and Veo3.1.

V1 explicitly excludes KIE chat/LLM proxy endpoints except as documented research notes.

Do not commit secrets, do not require `.env`, and do not make live KIE calls during normal tests.

Use local docs-derived JSON artifacts for offline model/schema discovery. Preserve raw KIE response details in tool outputs and errors.

Treat non-2xx HTTP statuses and JSON `code != 200` as failures unless a specific endpoint documents otherwise.

Wait/poll tools must use bounded polling and must not loop forever.
</constraints>

<scorecard>
Primary checklist score: 12 required checks, passing threshold 12/12.

1. `npm test` passes with mocked HTTP tests.
2. `npm run build` passes.
3. `npm run typecheck` passes.
4. Server starts under stdio without requiring `KIE_API_KEY`.
5. Docs resources return local research artifacts.
6. Common tools are implemented: credits and download URL.
7. Upload tools are implemented: URL, base64, local stream.
8. Market tools are implemented: list models, get schema, create task, get task, wait for task.
9. Webhook verification supports `taskId` and `task_id`.
10. Product API helper covers 4o Image, Flux Kontext, Runway/Aleph, Suno, and Veo3.1 endpoint families.
11. Known KIE error shapes produce structured MCP errors.
12. README documents install, configuration, tools, resources, and live smoke testing.

Regression checks: no live KIE calls in unit tests, no API keys in tracked files/logs, and existing research artifacts remain intact.

Scoring method: inspect `SPEC.md`, source files, README, and test output from `npm test`, `npm run typecheck`, and `npm run build`.

Stop condition: all 12 checklist items pass and final verification commands succeed.
</scorecard>

<done_when>
- `package.json`, TypeScript source, tests, and README exist for a local KIE MCP server.
- `npm install` has succeeded and lockfile is present.
- `npm run typecheck`, `npm run build`, and `npm test` pass.
- The server can start with `npm start` without `KIE_API_KEY` and expose non-live docs/model tools.
- Live API tools read `KIE_API_KEY` from the environment and fail clearly when it is missing.
- The local docs-derived OpenAPI catalog and Market model registry are bundled into the server package.
- README includes MCP client configuration examples and documents the v1 non-goal of chat/LLM proxy endpoints.
</done_when>

<feedback_loop>
Fast check: run `npm test`.

Expected runtime: under 10 seconds after dependency installation.

Cadence: run after each meaningful implementation slice.

Proxy validity: mocked HTTP tests cover request construction, auth headers, error handling, polling, schema lookup, and webhook signature logic without consuming credits.

Slower final checks: run `npm run typecheck`, `npm run build`, and `npm test`.

Optional live smoke check only when `KIE_API_KEY` is present: run `npm run smoke`.
</feedback_loop>

<workflow>
1. Inspect `SPEC.md` and research artifacts.
2. Scaffold the TypeScript MCP package.
3. Copy docs-derived JSON registries into package data.
4. Implement configuration, HTTP client, KIE error normalization, task polling, upload handling, and webhook signature verification.
5. Implement MCP tools and resources.
6. Add mocked unit tests for core behavior.
7. Write README usage and MCP client configuration.
8. Run fast feedback checks and refine.
9. Run final verification commands.
</workflow>

<working_memory>
Maintain:
- `PLAN.md` for current strategy and phase status.
- `ATTEMPTS.md` for meaningful implementation/test attempts and evidence.
- `NOTES.md` for durable discoveries and blockers.

Update `PLAN.md` at phase changes, `ATTEMPTS.md` after each meaningful check, and `NOTES.md` when discovering durable implementation context.
</working_memory>

<human_control_surface>
Create and maintain `CONTROL.md` as the compact human operator panel for this goal.

Before each phase change, strategic pivot, expensive step, or sidecar ingestion, reread `CONTROL.md`. If it changed, summarize the relevant change in `PLAN.md` and adapt before proceeding.

Initial knobs: status files, human priorities, allowed/protected files, external API policy, and decision gates for scope expansion, dependency changes after initial setup, destructive changes, or live API calls.
</human_control_surface>

<verification_loop>
Run focused checks first:
- `npm test`
- `npm run typecheck`

Run broad final checks:
- `npm run build`
- `npm test`

Manual check:
- Review README for setup clarity.
- Confirm `npm start` can initialize without `KIE_API_KEY`.
- Confirm no secrets are present with `rg "Bearer|KIE_API_KEY|sk-" .`.
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use the runtime's patch/edit tool for manual edits when available.
- Read context files before implementation.
- Batch independent file reads in parallel when the runtime supports it.
- Keep the goal scorecard current: know the primary metric, passing threshold, regression checks, scoring method, and stop condition.
- Use the fastest representative feedback check while iterating; reserve slower checks for escalation points and final verification.
- For long-running or exploratory goals, maintain `PLAN.md`, `ATTEMPTS.md`, and `NOTES.md`, or the repo's named equivalents.
- Update `ATTEMPTS.md` after each meaningful approach so future iterations do not repeat work without new evidence.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep the final answer concise.
</execution_rules>

<output_contract>
Final artifacts must include working TypeScript MCP server source, bundled docs registry data, tests, README, `SPEC.md`, `GOAL.md`, and working-memory files.

Final response should summarize implemented tools, verification results, and any optional live smoke test that was skipped because no `KIE_API_KEY` was present.
</output_contract>

