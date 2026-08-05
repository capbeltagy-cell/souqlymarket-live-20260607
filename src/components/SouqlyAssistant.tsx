import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Loader2, MessageCircle, RefreshCw, Send, Trash2, X } from "lucide-react";
import { askSouqlyAssistant } from "@/lib/souqly-assistant.functions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "souqly-assistant-history-v1";
const MAX_HISTORY = 20;
const GENERIC_ERROR = "تعذّر الحصول على الرد الآن. حاول مرة أخرى بعد قليل.";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is ChatMessage =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string",
      )
      .slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

export function SouqlyAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const viewportEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    if (!historyLoaded || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [historyLoaded, messages]);

  useEffect(() => {
    if (open) viewportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const requestMessages = useMemo(
    () => messages.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content })),
    [messages],
  );

  async function sendMessage(rawMessage: string, retry = false) {
    const content = rawMessage.trim();
    if (!content || loading) return;
    const lastMessage = messages.at(-1);
    if (!retry && lastMessage?.role === "user" && lastMessage.content === content) return;

    const userMessage: ChatMessage = { id: createId(), role: "user", content };
    const nextMessages = retry
      ? requestMessages
      : [...requestMessages, { role: "user" as const, content }];

    if (!retry) {
      setMessages((current) => [...current, userMessage].slice(-MAX_HISTORY));
      setInput("");
    }
    setFailedMessage(null);
    setLoading(true);

    try {
      const result = await askSouqlyAssistant({ data: { messages: nextMessages } });
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: result.content,
      };
      setMessages((current) => [...current, assistantMessage].slice(-MAX_HISTORY));
    } catch {
      setFailedMessage(content);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function clearHistory() {
    setMessages([]);
    setFailedMessage(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div dir="rtl" className="fixed bottom-20 end-4 z-50 lg:bottom-6 lg:end-6">
      {open && (
        <section
          aria-label="مساعد سوقلي"
          className="mb-3 flex h-[min(34rem,calc(100vh-8rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-foreground/15">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">مساعد سوقلي</h2>
              <p className="text-xs text-primary-foreground/75">كيف أقدر أساعدك؟</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                aria-label="حذف المحادثة"
                className="rounded-full p-2 transition hover:bg-primary-foreground/15"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق المحادثة"
              className="rounded-full p-2 transition hover:bg-primary-foreground/15"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <ScrollArea className="min-h-0 flex-1 bg-surface-2/70">
            <div className="space-y-3 p-4" aria-live="polite">
              {messages.length === 0 && (
                <div className="rounded-2xl border bg-card p-4 text-sm leading-7 text-muted-foreground">
                  أهلًا بك! اسألني عن استخدام سوقلي، إدارة شركتك، المنتجات، المتجر أو طلبات الأسعار.
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ms-auto rounded-es-md bg-primary text-primary-foreground"
                      : "me-auto rounded-ee-md border bg-card text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {loading && (
                <div className="me-auto flex items-center gap-2 rounded-2xl rounded-ee-md border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري إعداد الرد…
                </div>
              )}
              {failedMessage && !loading && (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3 text-sm">
                  <p className="text-muted-foreground">{GENERIC_ERROR}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => void sendMessage(failedMessage, true)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    إعادة المحاولة
                  </Button>
                </div>
              )}
              <div ref={viewportEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t bg-background p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 2_000))}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={2}
                placeholder="اكتب رسالتك…"
                aria-label="رسالتك إلى مساعد سوقلي"
                className="max-h-28 min-h-12 resize-none"
              />
              <Button
                type="button"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-2xl"
                disabled={loading || !input.trim()}
                onClick={() => void sendMessage(input)}
                aria-label="إرسال الرسالة"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              Enter للإرسال · Shift + Enter لسطر جديد
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "إغلاق مساعد سوقلي" : "فتح مساعد سوقلي"}
        aria-expanded={open}
        className="ms-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xl transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
