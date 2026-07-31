import { spawnSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repositoryRoot, "dist");
const tscCommand = process.platform === "win32" ? "tsc.cmd" : "tsc";
const tscPath = path.join(repositoryRoot, "node_modules", ".bin", tscCommand);

await rm(distRoot, { recursive: true, force: true });

const result = spawnSync(tscPath, ["-p", "tsconfig.build.json"], {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`TypeScript build exited with status ${result.status ?? "unknown"}.`);
}

const dataOutput = path.join(distRoot, "src", "data");
await mkdir(dataOutput, { recursive: true });
await cp(path.join(repositoryRoot, "src", "data"), dataOutput, { recursive: true });
