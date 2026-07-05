import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileSignature } from "lucide-react";
import { Send, Paperclip, Mic, Square, Image as ImageIcon, FileText, Play, Pause, X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import type { RealtimeChannel } from "@supabase/supabase-js";

const searchSchema = z.object({ c: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "الرسائل — Souqly" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: MessagesPage,
});

type Conv = { id: string; listing_id: string | null; buyer_id: string; seller_id: string; last_message_at: string };
type Msg = {
  id: string; conversation_id: string; sender_id: string; body: string; created_at: string;
  read_at: string | null;
  attachment_url: string | null; attachment_type: string | null; attachment_name: string | null; duration_ms: number | null;
};

function MessagesPage() {
  const { user } = useAuth();
  const { c: initialC } = Route.useSearch();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialC ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  const typingChanRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConvs = async () => {
    if (!user) return;
    const { data } = await (supabase.from("conversations" as never) as any)
      .select("*").order("last_message_at", { ascending: false });
    const arr = (data ?? []) as Conv[];
    setConvs(arr);
    if (!activeId && arr.length) setActiveId(arr[0].id);
  };

  const scrollBottom = () => setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);

  const loadMsgs = async (convId: string) => {
    const { data } = await (supabase.from("messages" as never) as any)
      .select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    scrollBottom();
    // Mark unread as read
    if (user) {
      await (supabase.from("messages" as never) as any)
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", convId).is("read_at", null).neq("sender_id", user.id);
    }
  };

  useEffect(() => { loadConvs(); /* eslint-disable-next-line */ }, [user?.id]);
  useEffect(() => { if (activeId) loadMsgs(activeId); /* eslint-disable-next-line */ }, [activeId]);

  // Realtime new messages
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`msgs-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        scrollBottom();
        if (user && m.sender_id !== user.id) {
          (supabase.from("messages" as never) as any)
            .update({ read_at: new Date().toISOString() }).eq("id", m.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((prev) => prev.map((x) => x.id === m.id ? m : x));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, user?.id]);

  // Typing broadcast
  useEffect(() => {
    if (!activeId || !user) return;
    const ch = supabase.channel(`typing-${activeId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        if ((payload.payload as any)?.user !== user.id) {
          setOtherTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();
    typingChanRef.current = ch;
    return () => { supabase.removeChannel(ch); typingChanRef.current = null; };
  }, [activeId, user?.id]);

  const emitTyping = () => {
    if (!typingChanRef.current || !user) return;
    typingChanRef.current.send({ type: "broadcast", event: "typing", payload: { user: user.id } });
  };

  const uploadFile = async (file: Blob, ext: string, folder: string): Promise<string | null> => {
    if (!user) return null;
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("listing-media").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); return null; }
    const { data, error: sErr } = await supabase.storage.from("listing-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr || !data?.signedUrl) { toast.error(sErr?.message ?? "Sign URL failed"); return null; }
    return data.signedUrl;
  };

  const sendMessage = async (payload: Partial<Msg>) => {
    if (!activeId || !user) return;
    const { error } = await (supabase.from("messages" as never) as any).insert({
      conversation_id: activeId, sender_id: user.id, body: payload.body ?? "",
      attachment_url: payload.attachment_url ?? null,
      attachment_type: payload.attachment_type ?? null,
      attachment_name: payload.attachment_name ?? null,
      duration_ms: payload.duration_ms ?? null,
    });
    if (error) toast.error(error.message);
  };

  const send = async () => {
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    await sendMessage({ body });
  };

  const onAttach = async (file: File) => {
    setUploading(true);
    try {
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const ext = file.name.split(".").pop() ?? "bin";
      const url = await uploadFile(file, ext, "chat");
      if (!url) return;
      await sendMessage({
        body: "", attachment_url: url,
        attachment_type: isImg ? "image" : isPdf ? "pdf" : "file",
        attachment_name: file.name,
      });
    } finally { setUploading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const dur = Date.now() - recStartRef.current;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setUploading(true);
        const url = await uploadFile(blob, "webm", "voice");
        setUploading(false);
        if (url) await sendMessage({ body: "", attachment_url: url, attachment_type: "voice", duration_ms: dur });
      };
      recorderRef.current = rec;
      recStartRef.current = Date.now();
      rec.start();
      setRecording(true);
    } catch { toast.error("تعذّر الوصول للميكروفون"); }
  };
  const stopRecording = () => { recorderRef.current?.stop(); setRecording(false); };

  const active = useMemo(() => convs.find((c) => c.id === activeId), [convs, activeId]);
  const otherId = active && user ? (active.buyer_id === user.id ? active.seller_id : active.buyer_id) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">الرسائل</h1>
        <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[75vh]">
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
                <div className="border-b border-border p-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">المستخدم #{otherId?.slice(0, 8) ?? "—"}</div>
                  {otherTyping && <div className="text-xs text-primary animate-pulse">يكتب…</div>}
                </div>
                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                  {msgs.map((m) => <MessageBubble key={m.id} m={m} mine={m.sender_id === user?.id} />)}
                  {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ابدأ المحادثة الآن</p>}
                </div>
                {active && user && active.seller_id === user.id && (
                  <div className="px-3 pt-2">
                    <Link to="/quotations/new" search={{ c: active.id }}
                      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary">
                      <FileSignature className="h-3.5 w-3.5" /> إرسال عرض سعر
                    </Link>
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2 items-center">
                  <label className="cursor-pointer p-2 rounded-md hover:bg-muted" title="مرفق">
                    <Paperclip className="h-4 w-4" />
                    <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onAttach(e.target.files[0])} />
                  </label>
                  <label className="cursor-pointer p-2 rounded-md hover:bg-muted" title="صورة">
                    <ImageIcon className="h-4 w-4" />
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onAttach(e.target.files[0])} />
                  </label>
                  {!recording ? (
                    <button type="button" onClick={startRecording} className="p-2 rounded-md hover:bg-muted" title="رسالة صوتية"><Mic className="h-4 w-4" /></button>
                  ) : (
                    <button type="button" onClick={stopRecording} className="p-2 rounded-md bg-destructive text-destructive-foreground animate-pulse" title="إيقاف التسجيل"><Square className="h-4 w-4" /></button>
                  )}
                  <Input
                    value={text}
                    onChange={(e) => { setText(e.target.value); emitTyping(); }}
                    placeholder={uploading ? "جارٍ الرفع…" : "اكتب رسالتك…"}
                    disabled={uploading || recording}
                  />
                  <Button type="submit" size="icon" disabled={!text.trim() || uploading}><Send className="h-4 w-4" /></Button>
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

function MessageBubble({ m, mine }: { m: Msg; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {m.attachment_type === "image" && m.attachment_url && (
          <a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} alt="" className="rounded-lg max-h-64 mb-1" /></a>
        )}
        {m.attachment_type === "pdf" && m.attachment_url && (
          <a href={m.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-md p-2 mb-1 ${mine ? "bg-primary-foreground/20" : "bg-background"}`}>
            <FileText className="h-4 w-4" /><span className="truncate max-w-40">{m.attachment_name ?? "PDF"}</span>
          </a>
        )}
        {m.attachment_type === "file" && m.attachment_url && (
          <a href={m.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-md p-2 mb-1 ${mine ? "bg-primary-foreground/20" : "bg-background"}`}>
            <Paperclip className="h-4 w-4" /><span className="truncate max-w-40">{m.attachment_name ?? "file"}</span>
          </a>
        )}
        {m.attachment_type === "voice" && m.attachment_url && (
          <div className="flex items-center gap-2 mb-1">
            <button onClick={togglePlay} type="button" className={`h-8 w-8 rounded-full grid place-items-center ${mine ? "bg-primary-foreground/20" : "bg-background"}`}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <span className="text-xs">🎤 {m.duration_ms ? `${Math.round(m.duration_ms / 1000)}s` : ""}</span>
            <audio ref={audioRef} src={m.attachment_url} onEnded={() => setPlaying(false)} className="hidden" />
          </div>
        )}
        {(() => {
          const qm = m.body?.match(/^\[\[quotation:([0-9a-f-]{36})\]\]\s*(.*)/i);
          const om = m.body?.match(/^\[\[order:([0-9a-f-]{36})\]\]\s*(.*)/i);
          if (qm) return (
            <Link to="/quotations/$id" params={{ id: qm[1] }} className={`block rounded-md p-3 mb-1 border ${mine ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-background border-border"}`}>
              <div className="flex items-center gap-2 font-semibold mb-1"><FileSignature className="h-4 w-4" /> عرض سعر</div>
              <div className="text-xs opacity-80">{qm[2] || "افتح للعرض والتفاصيل"}</div>
              <div className={`text-[10px] mt-1 ${mine ? "opacity-80" : "text-primary"}`}>افتح العرض ←</div>
            </Link>
          );
          if (om) return (
            <Link to="/orders/$id" params={{ id: om[1] }} className={`block rounded-md p-3 mb-1 border ${mine ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-background border-border"}`}>
              <div className="font-semibold mb-1">📦 طلب جديد</div>
              <div className="text-xs opacity-80">{om[2] || "افتح لمتابعة الطلب"}</div>
            </Link>
          );
          return m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null;
        })()}
        <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "opacity-80" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
          {mine && (m.read_at ? <span title="مقروء">✓✓</span> : <span title="مُرسل">✓</span>)}
        </div>
      </div>
    </div>
  );
}

