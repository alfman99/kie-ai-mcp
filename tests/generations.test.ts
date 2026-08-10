import { describe, expect, it } from "vitest";
import { generationFromTask, generationToolResult } from "../src/generations.js";

describe("generation results", () => {
  it("does not convert null progress or credit usage to zero", () => {
    const generation = generationFromTask({
      taskId: "task_nulls",
      payload: { data: { status: "generating", progress: null, creditsConsumed: null } }
    });

    expect(generation).not.toHaveProperty("progress");
    expect(generation).not.toHaveProperty("creditsConsumed");
  });

  it("uses a URL-derived MIME type and exposes taskIds", () => {
    const result = generationToolResult([{
      taskId: "task_mov",
      kind: "video",
      status: "success",
      outputUrls: ["https://example.com/result.mov"]
    }]);

    expect(result.structuredContent).toMatchObject({ taskIds: ["task_mov"] });
    expect(result.content).toContainEqual(expect.objectContaining({
      type: "resource_link",
      uri: "https://example.com/result.mov",
      mimeType: "video/quicktime"
    }));
  });
});
