import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Copy, Megaphone, Share2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { generateAdCopy, generateSocialPost, generateProductPromotion } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/ai-tools")({
  head: () => ({ meta: [{ title: "AI Marketing Tools — Souqly" }] }),
  component: AIToolsPage,
});

function AIToolsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [tab, setTab] = useState<"ad" | "social" | "promo">("ad");

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 max-w-4xl">
        <div className="flex items-center gap-2 mb-6"><Sparkles className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">{ar ? "أدوات التسويق بالذكاء الاصطناعي" : "AI Marketing Tools"}</h1></div>

        <div className="flex gap-2 mb-6 border-b border-border">
          <TabBtn active={tab==="ad"} onClick={() => setTab("ad")} icon={Megaphone}>{ar ? "مولد الإعلانات" : "Ad Generator"}</TabBtn>
          <TabBtn active={tab==="social"} onClick={() => setTab("social")} icon={Share2}>{ar ? "منشورات التواصل" : "Social Posts"}</TabBtn>
          <TabBtn active={tab==="promo"} onClick={() => setTab("promo")} icon={ShoppingBag}>{ar ? "ترويج المنتجات" : "Product Promo"}</TabBtn>
        </div>

        {tab === "ad" && <AdGen ar={ar} />}
        {tab === "social" && <SocialGen ar={ar} />}
        {tab === "promo" && <PromoGen ar={ar} />}
      </div>
      <SiteFooter />
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 flex items-center gap-1.5 text-sm border-b-2 -mb-px ${active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      <Icon className="h-4 w-4" />{children}
    </button>
  );
}

function OutputBox({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 relative">
      <Button size="sm" variant="ghost" className="absolute top-2 end-2" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
      <pre className="whitespace-pre-wrap text-sm font-sans pr-10">{text}</pre>
    </div>
  );
}

function AdGen({ ar }: { ar: boolean }) {
  const fn = useServerFn(generateAdCopy);
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("friendly");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await fn({ data: { product, audience: audience || null, tone: tone as any, locale: ar ? "ar" : "en", variants: 3 } }); setOut(r.text); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={go} className="space-y-3">
      <div><Label>{ar ? "المنتج أو العرض" : "Product / Offer"}</Label><Textarea value={product} onChange={(e) => setProduct(e.target.value)} required rows={3} /></div>
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>{ar ? "الجمهور المستهدف" : "Target audience"}</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} /></div>
        <div><Label>{ar ? "الأسلوب" : "Tone"}</Label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="friendly">{ar ? "ودود" : "Friendly"}</option>
            <option value="professional">{ar ? "احترافي" : "Professional"}</option>
            <option value="urgent">{ar ? "عاجل" : "Urgent"}</option>
            <option value="luxury">{ar ? "فاخر" : "Luxury"}</option>
            <option value="playful">{ar ? "مرح" : "Playful"}</option>
          </select>
        </div>
      </div>
      <Button type="submit" disabled={busy || !product} className="bg-primary hover:bg-primary-hover"><Sparkles className="h-4 w-4 mr-1" />{busy ? "…" : (ar ? "توليد" : "Generate")}</Button>
      <OutputBox text={out} />
    </form>
  );
}

function SocialGen({ ar }: { ar: boolean }) {
  const fn = useServerFn(generateSocialPost);
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [tags, setTags] = useState(true);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await fn({ data: { topic, platform: platform as any, locale: ar ? "ar" : "en", includeHashtags: tags } }); setOut(r.text); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={go} className="space-y-3">
      <div><Label>{ar ? "الموضوع" : "Topic"}</Label><Textarea value={topic} onChange={(e) => setTopic(e.target.value)} required rows={3} /></div>
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>{ar ? "المنصة" : "Platform"}</Label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            {["facebook","instagram","tiktok","whatsapp","x","linkedin"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={tags} onChange={(e) => setTags(e.target.checked)} />{ar ? "أضف هاشتاجات" : "Include hashtags"}</label>
      </div>
      <Button type="submit" disabled={busy || !topic} className="bg-primary hover:bg-primary-hover"><Sparkles className="h-4 w-4 mr-1" />{busy ? "…" : (ar ? "توليد" : "Generate")}</Button>
      <OutputBox text={out} />
    </form>
  );
}

function PromoGen({ ar }: { ar: boolean }) {
  const fn = useServerFn(generateProductPromotion);
  const [product, setProduct] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await fn({ data: { product, channel: channel as any, locale: ar ? "ar" : "en" } }); setOut(r.text); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={go} className="space-y-3">
      <div><Label>{ar ? "المنتج (اسم + وصف + سعر)" : "Product (name + description + price)"}</Label><Textarea value={product} onChange={(e) => setProduct(e.target.value)} required rows={4} /></div>
      <div><Label>{ar ? "القناة" : "Channel"}</Label>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
          {["whatsapp","email","sms","social"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={busy || !product} className="bg-primary hover:bg-primary-hover"><Sparkles className="h-4 w-4 mr-1" />{busy ? "…" : (ar ? "توليد" : "Generate")}</Button>
      <OutputBox text={out} />
    </form>
  );
}
