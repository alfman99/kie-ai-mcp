import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("Claude Desktop extension manifest", () => {
  it("matches the package version and securely requests the KIE key", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(repositoryRoot, "package.json"), "utf8")
    );
    const manifest = JSON.parse(
      await readFile(path.join(repositoryRoot, "mcpb", "manifest.json"), "utf8")
    );

    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.server.entry_point).toBe("server/index.js");
    expect(manifest.server.mcp_config.env).toMatchObject({
      KIE_API_KEY: "${user_config.kie_api_key}",
      KIE_API_BASE_URL: "https://api.kie.ai",
      KIE_UPLOAD_BASE_URL: "https://kieai.redpandaai.co",
      KIE_ALLOW_LOCAL_FILE_UPLOADS: "true",
      KIE_LOCAL_UPLOAD_ROOT: "${user_config.media_directory}"
    });
    expect(manifest.user_config.kie_api_key).toMatchObject({
      required: true,
      sensitive: true
    });
    expect(manifest.user_config.media_directory).toMatchObject({
      type: "directory",
      required: true
    });
    expect(manifest.privacy_policies).toContain("https://kie.ai/privacy-policy");
  });

  it("ships a secret-free Cursor stdio configuration for this checkout", async () => {
    const cursorConfig = JSON.parse(
      await readFile(path.join(repositoryRoot, ".cursor", "mcp.json"), "utf8")
    );
    const server = cursorConfig.mcpServers["kie-ai"];

    expect(server).toMatchObject({
      command: "node",
      args: ["${workspaceFolder}/dist/src/index.js"],
      env: {
        KIE_API_KEY: "${env:KIE_API_KEY}",
        KIE_API_BASE_URL: "https://api.kie.ai",
        KIE_UPLOAD_BASE_URL: "https://kieai.redpandaai.co",
        KIE_ALLOW_LOCAL_FILE_UPLOADS: "true",
        KIE_LOCAL_UPLOAD_ROOT: "${userHome}/KIE Media"
      }
    });
    expect(JSON.stringify(server)).not.toContain("sk-");
  });
});
