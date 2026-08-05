import { describe, expect, it } from "vitest";
import { stripThinkingContent } from "./souqly-assistant.functions";

describe("stripThinkingContent", () => {
  it("removes internal thinking and keeps the final Arabic answer", () => {
    expect(stripThinkingContent("<think>تحليل داخلي</think>الإجابة النهائية")).toBe(
      "الإجابة النهائية",
    );
  });

  it("removes multiline and unfinished thinking blocks", () => {
    expect(stripThinkingContent("قبل<think>سطر أول\nسطر ثان</think>بعد")).toBe("قبلبعد");
    expect(stripThinkingContent("<think>تحليل لم يغلق")).toBe("");
  });
});
