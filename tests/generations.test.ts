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
      outcome: "success",
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

describe("reading the finished asset out of a task record", () => {
  it("returns the documented result fields in order and ignores echoed input URLs", () => {
    const generation = generationFromTask({
      taskId: "task_urls",
      payload: {
        code: 200,
        data: {
          state: "success",
          param: JSON.stringify({
            model: "bytedance/seedance-2",
            input: { prompt: "a kite", first_frame_url: "https://cdn.test/INPUT-not-an-output.png" }
          }),
          resultJson: JSON.stringify({
            resultUrls: ["https://cdn.test/clip.mp4"],
            lastFrameUrl: ["https://cdn.test/last.png"]
          })
        }
      }
    });

    expect(generation.outcome).toBe("success");
    expect(generation.outputUrls).toEqual(["https://cdn.test/clip.mp4", "https://cdn.test/last.png"]);
  });

  it("keeps a non-URL resultObject instead of reporting an empty success", () => {
    const generation = generationFromTask({
      taskId: "task_object",
      payload: {
        data: { state: "success", resultJson: JSON.stringify({ resultObject: { subject_status: 1 } }) }
      }
    });

    expect(generation.resultObject).toEqual({ subject_status: 1 });
    expect(generation).not.toHaveProperty("warning");
  });

  it("flags a success that carried no result at all", () => {
    const generation = generationFromTask({
      taskId: "task_empty",
      payload: { data: { state: "success", resultJson: "{}" } }
    });

    expect(generation.outcome).toBe("success");
    expect(generation.warning).toMatch(/no result URLs/);
  });

  it("carries failCode and failMsg off a failed task", () => {
    const generation = generationFromTask({
      taskId: "task_fail",
      payload: { data: { state: "fail", failCode: "501", failMsg: "content policy" } }
    });

    expect(generation).toMatchObject({ outcome: "failed", error: "content policy", errorCode: "501" });
  });

  it("prefers the documented state field over a stale status field", () => {
    const generation = generationFromTask({
      taskId: "task_both",
      payload: { data: { state: "generating", status: "success" } }
    });

    expect(generation).toMatchObject({ status: "generating", outcome: "pending" });
  });
});
