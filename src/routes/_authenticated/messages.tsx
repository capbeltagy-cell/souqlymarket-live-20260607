import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const searchSchema = z.object({ c: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "الرسائل — Souqly" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: MessagesPage,
});

type Conv = { id: string; listing_id: string | null; buyer_id: string; seller_id: string; last_message_at: string };
type Msg = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

function MessagesPage() {
  const { user } = useAuth();
  const { c: initialC } = Route.useSearch();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialC ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    if (!user) return;
    const { data } = await (supabase.from("conversations" as never) as any)
      .select("*").order("last_message_at", { ascending: false });
    const arr = (data ?? []) as Conv[];
    setConvs(arr);
    if (!activeId && arr.length) setActiveId(arr[0].id);
  };

  const loadMsgs = async (convId: string) => {
    const { data } = await (supabase.from("messages" as never) as any)
      .select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  useEffect(() => { loadConvs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);
  useEffect(() => { if (activeId) loadMsgs(activeId); }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const iv = setInterval(() => loadMsgs(activeId), 5000);
    return () => clearInterval(iv);
  }, [activeId]);

  const send = async () => {
    if (!activeId || !user || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { error } = await (supabase.from("messages" as never) as any)
      .insert({ conversation_id: activeId, sender_id: user.id, body });
    if (!error) loadMsgs(activeId);
  };

  const active = useMemo(() => convs.find((c) => c.id === activeId), [convs, activeId]);
  const otherId = active && user ? (active.buyer_id === user.id ? active.seller_id : active.buyer_id) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">الرسائل</h1>
        <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
          <aside className="border border-border rounded-lg bg-card overflow-y-auto">
            {convs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">لا توجد محادثات بعد</p>
            ) : convs.map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={`w-full text-start p-3 border-b border-border hover:bg-muted transition ${activeId === c.id ? "bg-muted" : ""}`}>
                <div className="text-sm font-medium">محادثة #{c.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleString("ar-EG")}</div>
              </button>
            ))}
          </aside>
          <div className="border border-border rounded-lg bg-card flex flex-col">
            {active ? (
              <>
                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgs.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <div className={`text-[10px] mt-1 ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ابدأ المحادثة الآن</p>}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك…" />
                  <Button type="submit" size="icon" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-muted-foreground text-sm">اختر محادثة للبدء</div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
