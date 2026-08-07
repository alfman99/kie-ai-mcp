#!/usr/bin/env node

import { cp, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PACKAGE_NAME = "kie-ai-mcp";
const GENERATED_FILES = [
  "docs_manifest.json",
  "openapi_endpoint_catalog.json",
  "market_model_registry.json",
  "endpoint_index.json",
  "ANALYSIS.md",
  "OPENAPI_CATALOG.md",
  "MARKET_MODEL_REGISTRY.md",
  "ENDPOINT_INDEX.md"
];
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function usage() {
  process.stdout.write(`Usage:
  node update-kie-mcp.mjs [--repo /absolute/path] [--check-only]

Resolution order:
  1. --repo
  2. KIE_MCP_REPO
  3. current directory or a parent
  4. the Codex kie-ai MCP registration
`);
}

function parseArguments(argv) {
  const parsed = { repo: undefined, checkOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check-only") {
      parsed.checkOnly = true;
    } else if (argument === "--repo") {
      parsed.repo = argv[index + 1];
      index += 1;
      if (!parsed.repo) {
        throw new Error("--repo requires an absolute or relative path.");
      }
    } else if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return parsed;
}

async function isKieRepository(directory) {
  try {
    const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    return packageJson.name === PACKAGE_NAME && existsSync(join(directory, "scripts", "kie-docs.ts"));
  } catch {
    return false;
  }
}

async function findUpward(startDirectory) {
  let current = resolve(startDirectory);
  while (true) {
    if (await isKieRepository(current)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function repoFromCodexRegistration() {
  const result = spawnSync("codex", ["mcp", "get", "kie-ai", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  if (result.status !== 0 || !result.stdout) {
    return undefined;
  }
  try {
    const config = JSON.parse(result.stdout);
    const transport = config.transport ?? config;
    const entryPoint = Array.isArray(transport.args)
      ? transport.args.find(
          (argument) =>
            typeof argument === "string" &&
            argument.replaceAll("\\", "/").endsWith("/dist/src/index.js")
        )
      : undefined;
    return entryPoint ? resolve(dirname(entryPoint), "../..") : undefined;
  } catch {
    return undefined;
  }
}

async function resolveRepository(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.KIE_MCP_REPO,
    await findUpward(process.cwd()),
    await findUpward(resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."))
  ].filter(Boolean);

  for (const candidate of candidates) {
    const directory = resolve(candidate);
    if (await isKieRepository(directory)) {
      return directory;
    }
  }
  const registeredRepository = repoFromCodexRegistration();
  if (registeredRepository && (await isKieRepository(registeredRepository))) {
    return registeredRepository;
  }
  throw new Error(
    "Could not locate the kie-ai-mcp source checkout. Pass --repo or set KIE_MCP_REPO."
  );
}

function run(command, args, cwd, options = {}) {
  process.stdout.write(`\n$ ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: options.capture ? "utf8" : undefined,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
  if (options.capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }
  if (result.error) {
    throw result.error;
  }
  const allowedStatuses = options.allowedStatuses ?? [0];
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status}.`);
  }
  return result.stdout ?? "";
}

function runDocsCommand(scriptName, cwd) {
  const output = run(npmCommand, ["run", "--silent", scriptName], cwd, {
    capture: true,
    allowedStatuses: scriptName === "docs:check" ? [0, 1] : [0]
  }).trim();
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${scriptName} did not return its expected JSON summary.`);
  }
}

function assertGeneratedSnapshotClean(repo) {
  const paths = GENERATED_FILES.map((fileName) => join("src", "data", fileName));
  const output = run("git", ["status", "--porcelain=v1", "--", ...paths], repo, {
    capture: true
  }).trim();
  if (output) {
    throw new Error(
      "Generated KIE catalog files already have local changes. Review or commit them before running an update."
    );
  }
}

async function backupGeneratedSnapshot(repo) {
  const backupDirectory = await mkdtemp(join(tmpdir(), "kie-mcp-docs-backup-"));
  await mkdir(backupDirectory, { recursive: true });
  for (const fileName of GENERATED_FILES) {
    await cp(join(repo, "src", "data", fileName), join(backupDirectory, fileName));
  }
  return backupDirectory;
}

async function restoreGeneratedSnapshot(repo, backupDirectory) {
  for (const fileName of GENERATED_FILES) {
    await cp(join(backupDirectory, fileName), join(repo, "src", "data", fileName));
  }
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const repo = await resolveRepository(args.repo);
  if (!existsSync(join(repo, "node_modules"))) {
    throw new Error(`Dependencies are missing in ${repo}. Run npm ci there first.`);
  }

  process.stdout.write(`KIE MCP repository: ${repo}\n`);
  const check = runDocsCommand("docs:check", repo);
  const changedFiles = Array.isArray(check.changedFiles) ? check.changedFiles : [];
  if (changedFiles.length === 0) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          action: "none",
          reason: "Official KIE documentation snapshot is current.",
          officialSource: check.officialSource,
          pages: check.pages,
          openapiOperations: check.openapiOperations,
          marketModels: check.marketModels
        },
        null,
        2
      )}\n`
    );
    return;
  }

  if (args.checkOnly) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          action: "update-available",
          officialSource: check.officialSource,
          changedFiles
        },
        null,
        2
      )}\n`
    );
    return;
  }

  assertGeneratedSnapshotClean(repo);
  const backupDirectory = await backupGeneratedSnapshot(repo);
  try {
    const update = runDocsCommand("docs:update", repo);
    run(npmCommand, ["run", "typecheck"], repo);
    run(npmCommand, ["test"], repo);
    run(npmCommand, ["run", "build"], repo);
    run(npmCommand, ["run", "mcp:doctor"], repo);
    run(npmCommand, ["pack", "--dry-run", "--json"], repo);
    const finalCheck = runDocsCommand("docs:check", repo);
    if (Array.isArray(finalCheck.changedFiles) && finalCheck.changedFiles.length > 0) {
      throw new Error(
        `Official docs changed again during validation: ${finalCheck.changedFiles.join(", ")}`
      );
    }
    run("git", ["diff", "--stat", "--", "src/data"], repo);
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          action: "updated-and-validated",
          officialSource: update.officialSource,
          pages: update.pages,
          openapiOperations: update.openapiOperations,
          marketModels: update.marketModels,
          changedFiles: update.changedFiles,
          next: "Review the generated diff, restart the MCP process, and commit only when authorized."
        },
        null,
        2
      )}\n`
    );
  } catch (error) {
    await restoreGeneratedSnapshot(repo, backupDirectory);
    throw new Error(
      `KIE docs maintenance failed; restored the previous generated snapshot. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    await rm(backupDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
