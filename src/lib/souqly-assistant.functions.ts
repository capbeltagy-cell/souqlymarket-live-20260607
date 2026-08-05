import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

const SYSTEM_PROMPT =
  "أنت مساعد سوقلي. أجب بالعربية فقط. لا تعرض التفكير الداخلي. أعد الإجابة النهائية فقط.";

export function stripThinkingContent(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();
}

export const askSouqlyAssistant = createServerFn({ method: "POST" })
  .validator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    const response = await fetch("https://ai.souqlymarket.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
        stream: false,
        options: {
          temperature: 0.2,
          num_ctx: 2048,
          num_predict: 120,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error("ASSISTANT_UNAVAILABLE");

    const payload: unknown = await response.json();
    const parsed = z.object({ message: z.object({ content: z.string() }) }).safeParse(payload);
    if (!parsed.success) throw new Error("ASSISTANT_INVALID_RESPONSE");

    const content = stripThinkingContent(parsed.data.message.content);
    if (!content) throw new Error("ASSISTANT_EMPTY_RESPONSE");
    return { content };
  });
