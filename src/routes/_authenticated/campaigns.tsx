import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, PlusCircle, Trash2, Play, Pause, Edit3, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { listMyCampaigns, createCampaign, updateCampaign, deleteCampaign } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Marketing Center" }] }),
  component: CampaignsPage,
});

const CATEGORIES = ["real_estate","products","services","wholesale","factories","land","tenders","other"];
const STATUSES = ["draft","active","paused","ended"] as const;

function CampaignsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(listMyCampaigns);
  const fCreate = useServerFn(createCampaign);
  const fUpdate = useServerFn(updateCampaign);
  const fDelete = useServerFn(deleteCampaign);

  const [rows, setRows] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [listingId, setListingId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => { setLoading(true); fList().then((r) => setRows(r.campaigns)).finally(() => setLoading(false)); };
  useEffect(() => {
    load();
    // Only listings whose owners opted-in to marketer promotion appear as earning opportunities.
    supabase.from("listings")
      .select("id,title_ar,title_en")
      .eq("status","approved")
      .eq("marketer_promotion_enabled", true)
      .eq("promotion_status", "active")
      .limit(100)
      .then(({ data }) => setListings(data ?? []));
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fCreate({ data: { name, description: desc || null, category: cat, status: "active", listingId: listingId || null } });
      toast.success(ar ? "تم إنشاء الحملة" : "Campaign created");
      setName(""); setDesc(""); setListingId("");
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  const toggle = async (id: string, status: string) => {
    const next = status === "active" ? "paused" : "active";
    try { await fUpdate({ data: { id, status: next as any } }); load(); } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (id: string) => {
    if (!confirm(ar ? "حذف الحملة؟" : "Delete campaign?")) return;
    try { await fDelete({ data: { id } }); load(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{ar ? "الحملات التسويقية" : "Campaigns"}</h1>
        </div>

        <form onSubmit={onCreate} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-3">
          <div className="font-semibold flex items-center gap-2"><PlusCircle className="h-4 w-4" />{ar ? "حملة جديدة" : "New campaign"}</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>{ar ? "الاسم" : "Name"}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
            <div><Label>{ar ? "الفئة" : "Category"}</Label>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>{ar ? "الإعلان (اختياري)" : "Listing (optional)"}</Label>
              <select value={listingId} onChange={(e) => setListingId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {listings.map((l) => <option key={l.id} value={l.id}>{ar ? l.title_ar : l.title_en}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>{ar ? "الوصف" : "Description"}</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
          </div>
          <Button type="submit" disabled={submitting || !name} className="bg-primary hover:bg-primary-hover">{submitting ? "…" : (ar ? "إنشاء" : "Create")}</Button>
        </form>

        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold">{ar ? "حملاتي" : "My campaigns"}</div>
          {loading ? <div className="p-8 text-center text-muted-foreground text-sm">…</div> :
           rows.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">{ar ? "لا توجد حملات" : "No campaigns yet"}</div> :
           <div className="divide-y divide-border">
             {rows.map((c) => {
               const refs = c.referrals ?? [];
               const clicks = refs.reduce((s: number, r: any) => s + (r.clicks ?? 0), 0);
               const conv = refs.reduce((s: number, r: any) => s + (r.conversions ?? 0), 0);
               return (
                 <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                       <span className="font-medium truncate">{c.name}</span>
                       <StatusBadge status={c.status} />
                       {c.category && <span className="text-xs text-muted-foreground">· {c.category}</span>}
                     </div>
                     {c.description && <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>}
                     <div className="text-xs text-muted-foreground mt-1">{ar ? "نقرات" : "Clicks"} {clicks} · {ar ? "تحويلات" : "Conv"} {conv} · {refs.length} {ar ? "روابط" : "links"}</div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Button size="sm" variant="ghost" onClick={() => toggle(c.id, c.status)}>{c.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                     <Link to="/campaigns/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><BarChart3 className="h-3.5 w-3.5" />{ar ? "التحليلات" : "Analytics"}</Link>
                     <Link to="/referrals" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Edit3 className="h-3.5 w-3.5" />{ar ? "روابط" : "Links"}</Link>
                     <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                   </div>
                 </div>
               );
             })}
           </div>
          }
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "active" ? "bg-success/15 text-success" : status === "paused" ? "bg-warning/15 text-warning" : status === "ended" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>;
}
