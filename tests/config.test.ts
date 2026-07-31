import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config.js";

describe("configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads and trims the optional local upload root", () => {
    vi.stubEnv("KIE_LOCAL_UPLOAD_ROOT", "  /safe/media  ");

    expect(loadConfig().localUploadRoot).toBe("/safe/media");
  });

  it("does not expose an empty local upload root", () => {
    vi.stubEnv("KIE_LOCAL_UPLOAD_ROOT", "   ");

    expect(loadConfig().localUploadRoot).toBeUndefined();
  });
});
