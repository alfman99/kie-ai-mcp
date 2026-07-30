import { spawnSync } from "node:child_process";
import { cp, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(repositoryRoot, "mcpb", "manifest.json"), "utf8"));

if (packageJson.version !== manifest.version) {
  throw new Error(
    `Version mismatch: package.json is ${packageJson.version}, but mcpb/manifest.json is ${manifest.version}.`
  );
}

const builtEntryPoint = path.join(repositoryRoot, "dist", "src", "index.js");
await readFile(builtEntryPoint);

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "kie-creator-mcpb-"));
const bundleRoot = path.join(temporaryRoot, "bundle");
const unpackedRoot = path.join(temporaryRoot, "unpacked");
const serverRoot = path.join(bundleRoot, "server");
const releaseRoot = path.join(repositoryRoot, "release");
const outputPath = path.join(releaseRoot, "kie-creator-for-claude.mcpb");

function pngCrc(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(pngCrc(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createIconPng() {
  const size = 512;
  const stride = 1 + size * 4;
  const pixels = Buffer.alloc(stride * size);

  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    pixels[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4;
      const sourceX = x / 2;
      const sourceY = y / 2;
      const upperStroke =
        sourceX >= 92 &&
        sourceX <= 164 &&
        Math.abs(sourceY - (132 - (sourceX - 92))) <= 11;
      const lowerStroke =
        sourceX >= 92 &&
        sourceX <= 168 &&
        Math.abs(sourceY - (126 + (sourceX - 92))) <= 11;
      const letter =
        (sourceX >= 68 && sourceX <= 98 && sourceY >= 52 && sourceY <= 204) ||
        upperStroke ||
        lowerStroke;
      const accent = (sourceX - 184) ** 2 + (sourceY - 71) ** 2 <= 15 ** 2;
      const color = accent
        ? [184, 255, 92, 255]
        : letter
          ? [245, 241, 232, 255]
          : [23, 23, 20, 255];
      pixels.set(color, offset);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function run(command, args, cwd, extraEnvironment = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnvironment
    },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

function runMcpb(args) {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  run(
    npxCommand,
    ["--yes", "--package", "@anthropic-ai/mcpb@2.1.2", "mcpb", ...args],
    repositoryRoot
  );
}

try {
  await mkdir(serverRoot, { recursive: true });
  await mkdir(releaseRoot, { recursive: true });

  await cp(path.join(repositoryRoot, "dist", "src"), serverRoot, { recursive: true });
  await copyFile(path.join(repositoryRoot, "mcpb", "manifest.json"), path.join(bundleRoot, "manifest.json"));
  await writeFile(path.join(bundleRoot, "icon.png"), createIconPng());
  await copyFile(path.join(repositoryRoot, "package.json"), path.join(bundleRoot, "package.json"));
  await copyFile(path.join(repositoryRoot, "package-lock.json"), path.join(bundleRoot, "package-lock.json"));
  await copyFile(path.join(repositoryRoot, "LICENSE"), path.join(bundleRoot, "LICENSE"));

  run(
    "npm",
    ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    bundleRoot
  );
  await rename(path.join(bundleRoot, "node_modules"), path.join(serverRoot, "node_modules"));

  const bundledPackage = {
    name: manifest.name,
    version: manifest.version,
    private: true,
    type: "module"
  };
  await writeFile(
    path.join(bundleRoot, "package.json"),
    `${JSON.stringify(bundledPackage, null, 2)}\n`,
    "utf8"
  );
  await rm(path.join(bundleRoot, "package-lock.json"));
  await rm(outputPath, { force: true });

  runMcpb(["validate", path.join(bundleRoot, "manifest.json")]);
  runMcpb(["pack", bundleRoot, outputPath]);
  runMcpb(["info", outputPath]);
  runMcpb(["unpack", outputPath, unpackedRoot]);
  run(
    process.execPath,
    [
      path.join(repositoryRoot, "dist", "scripts", "mcp-doctor.js"),
      "--entry",
      path.join(unpackedRoot, "server", "index.js")
    ],
    repositoryRoot,
    {
      KIE_API_KEY: "bundle-validation-placeholder",
      KIE_API_BASE_URL: "https://api.kie.ai",
      KIE_UPLOAD_BASE_URL: "https://kieai.redpandaai.co",
      KIE_ALLOW_LOCAL_FILE_UPLOADS: "true"
    }
  );

  process.stdout.write(`Claude Desktop extension created: ${outputPath}\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
