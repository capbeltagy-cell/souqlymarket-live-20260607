import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Loader2, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nProvider";
import { listMyLeads, updateLeadStatus } from "@/lib/phase2.functions";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — Souqly" }] }),
  component: LeadsPage,
});

type Lead = Awaited<ReturnType<typeof listMyLeads>>["leads"][number];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary text-primary-foreground",
  contacted: "bg-warning text-warning-foreground",
  negotiating: "bg-accent text-accent-foreground",
  won: "bg-success text-success-foreground",
  lost: "bg-muted text-muted-foreground",
};

function LeadsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchLeads = useServerFn(listMyLeads);
  const setStatus = useServerFn(updateLeadStatus);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetchLeads().then((r) => setLeads(r.leads)).catch((e: Error) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const onChange = async (lead: Lead, status: string) => {
    setBusy(lead.id);
    try {
      await setStatus({ data: { leadId: lead.id, status: status as "new" | "contacted" | "negotiating" | "won" | "lost" } });
      toast.success(ar ? "تم تحديث الحالة" : "Status updated");
      setLeads((prev) => prev?.map((l) => (l.id === lead.id ? { ...l, status } : l)) ?? null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const STATUS_LABEL: Record<string, string> = ar
    ? { new: "جديد", contacted: "تم التواصل", negotiating: "قيد التفاوض", won: "نجح", lost: "فُقد" }
    : { new: "New", contacted: "Contacted", negotiating: "Negotiating", won: "Closed Won", lost: "Closed Lost" };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{ar ? "طلبات العملاء" : "Leads"}</h1>
            {leads && <Badge variant="outline">{leads.length}</Badge>}
          </div>
          <Button asChild variant="outline"><Link to="/dashboard">{ar ? "لوحة التحكم" : "Dashboard"}</Link></Button>
        </div>

        {!leads ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            {ar ? "لا توجد طلبات بعد. شارك إعلاناتك لتصل لعملاء أكثر." : "No leads yet. Share your listings to reach more buyers."}
          </div>
        ) : (
          <div className="grid gap-3">
            {leads.map((l) => {
              const li = (l as { listings?: { title_ar?: string; title_en?: string } }).listings;
              const title = (ar ? li?.title_ar : li?.title_en) ?? li?.title_en ?? li?.title_ar ?? "—";
              return (
                <div key={l.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{l.buyer_name}</span>
                        <Badge className={STATUS_COLORS[l.status] ?? ""}>{STATUS_LABEL[l.status] ?? l.status}</Badge>
                      </div>
                      <Link to="/listings/$id" params={{ id: l.listing_id }} className="text-sm text-primary hover:underline">
                        {title}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {l.buyer_email && (
                          <a href={`mailto:${l.buyer_email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" />{l.buyer_email}</a>
                        )}
                        {l.buyer_phone && (
                          <a href={`tel:${l.buyer_phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{l.buyer_phone}</a>
                        )}
                        <span>{new Date(l.created_at).toLocaleString()}</span>
                      </div>
                      {l.message && (
                        <div className="mt-2 text-sm text-foreground flex gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" /><p className="whitespace-pre-wrap">{l.message}</p></div>
                      )}
                    </div>
                    <Select value={l.status} onValueChange={(v) => onChange(l, v)} disabled={busy === l.id}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(STATUS_LABEL).map((k) => (
                          <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
