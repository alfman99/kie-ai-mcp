---
name: kie-ai
description: Operate, install, diagnose, update, or use the local KIE.AI MCP server from an agent. Use when asked to create KIE media, upload local or remote media through KIE, inspect KIE models or endpoints, verify the MCP connection, refresh catalogs from official KIE documentation, or cleanly initialize and shut down a KIE MCP session.
---

Use KIE.AI from an agent through a local stdio MCP server. Keep the connection deterministic, use KIE-native APIs, and derive API behavior only from official KIE documentation.

## Setup

Before using a KIE tool or editing the server:

1. Run `kie_check_configuration`.
2. Run `kie_get_local_catalogs` and confirm the snapshot has zero failures.
3. If the user invoked a command below, load its reference file before acting.
4. Prefer friendly tools for normal media work. Use lower-level Market or product tools only when exact control is required.

If MCP tools are unavailable, load [reference/install.md](reference/install.md) and repair the connection before continuing.

## Invariants

- Use [https://docs.kie.ai/](https://docs.kie.ai/) as the sole API documentation authority.
- Discover documentation pages only through `https://docs.kie.ai/llms.txt`.
- Use KIE's native upload endpoints at `https://kieai.redpandaai.co/api/file-{url,base64,stream}-upload`.
- Do not add Cloudinary, S3, ImgBB, Supabase, Firebase, or another media intermediary.
- Never reveal API keys, webhook secrets, private media URLs, or full base64 payloads.
- Do not spend credits during installation, documentation checks, or connection diagnostics.
- Close the MCP client after diagnostics. Stdio shutdown must terminate the child process and leave no server or container running.
- Do not hand-edit generated files under `src/data`.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `use [request]` | Create | Choose the simplest KIE tools for a media request | [reference/use.md](reference/use.md) |
| `upload [media]` | Create | Upload media through KIE's native upload API | [reference/upload.md](reference/upload.md) |
| `status` | Inspect | Inspect configuration, catalogs, and readiness | [reference/status.md](reference/status.md) |
| `doctor` | Diagnose | Exercise initialize, tools, resources, and shutdown | [reference/doctor.md](reference/doctor.md) |
| `install` | Manage | Build and connect this MCP to the current agent | [reference/install.md](reference/install.md) |
| `check` | Docs | Check official KIE documentation for drift | [reference/check.md](reference/check.md) |
| `update` | Docs | Refresh reviewed catalogs from official KIE docs | [reference/update.md](reference/update.md) |
| `cleanup` | Manage | Remove temporary diagnostics and stop orphan runtimes | [reference/cleanup.md](reference/cleanup.md) |

### Routing Rules

1. With no argument, show the command table grouped by category and ask what the user wants.
2. When the first word matches a command, load that command's reference and follow it.
3. Otherwise, treat the full request as `use [request]` and load [reference/use.md](reference/use.md).
4. Load only the selected reference unless another reference is explicitly required by it.

## Failure Rules

- Preserve the last-known-good catalog when any official page fails.
- Return MCP tool errors as errors. Do not hide KIE response codes.
- Do not claim an upload, generation, or connection succeeded without the corresponding KIE or MCP response.
- If a running agent cannot hot-load a new MCP registration, finish local validation and tell the user to start a fresh task or reload Codex.
