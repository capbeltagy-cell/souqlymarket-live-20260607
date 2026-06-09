import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link2, Copy, TrendingUp, MousePointerClick, PlusCircle, UserPlus, DollarSign } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { listMyReferrals, createReferral } from "@/lib/referrals.functions";
import { getMyReferralAnalytics } from "@/lib/crm-analytics.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Souqly" }] }),
  component: ReferralsPage,
});

type Row = {
  id: string; code: string; clicks: number; conversions: number; created_at: string;
  listing_id: string;
  listings: {
    title_en: string | null; title_ar: string | null; commission_percentage: number | null;
    companies: { name_en: string | null; name_ar: string | null } | null;
  } | null;
};

function ReferralsPage() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const fetchList = useServerFn(listMyReferrals);
  const fetchAnalytics = useServerFn(getMyReferralAnalytics);
  const create = useServerFn(createReferral);
  const [rows, setRows] = useState<Row[]>([]);
  const [analytics, setAnalytics] = useState<{ clicks: number; registrations: number; conversions: number; revenue: number } | null>(null);
  const [listings, setListings] = useState<{ id: string; title_en: string; title_ar: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await fetchList(); setRows(res.referrals as unknown as Row[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    fetchAnalytics().then((a) => setAnalytics(a)).catch(() => undefined);
    supabase.from("listings").select("id, title_en, title_ar").eq("status", "approved").limit(50)
      .then(({ data }) => setListings(data ?? []));
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try { await create({ data: { listingId: selected } }); toast.success(t("status_updated")); setSelected(""); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  const copy = (code: string) => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    toast.success(t("link_copied"));
  };

  const totals = rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, conv: a.conv + r.conversions }), { clicks: 0, conv: 0 });

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Link2 className="h-6 w-6 text-primary" /> {t("referrals_title")}
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <KPI icon={Link2} label={t("active_referrals")} value={String(rows.length)} />
          <KPI icon={MousePointerClick} label={t("clicks")} value={String(totals.clicks)} />
          <KPI icon={TrendingUp} label={t("conversions")} value={String(totals.conv)} />
        </div>

        <form onSubmit={onCreate} className="rounded-lg border border-border bg-card p-5 shadow-card mb-6 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <Label>{t("select_listing")}</Label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} required
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{locale === "ar" ? l.title_ar : l.title_en}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={submitting || !selected} className="bg-primary hover:bg-primary-hover gap-2">
            <PlusCircle className="h-4 w-4" />{t("create_referral")}
          </Button>
        </form>

        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold">{t("referrals_title")}</div>
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">{t("loading")}</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">{t("empty_referrals")}</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => {
                const title = (locale === "ar" ? r.listings?.title_ar : r.listings?.title_en) ?? "—";
                const company = (locale === "ar" ? r.listings?.companies?.name_ar : r.listings?.companies?.name_en) ?? "—";
                const url = typeof window !== "undefined" ? `${window.location.origin}/r/${r.code}` : `/r/${r.code}`;
                return (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{title}</div>
                        <div className="text-xs text-muted-foreground">{company} · {r.listings?.commission_percentage ?? 0}% {t("commission")}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div><span className="font-semibold">{r.clicks}</span> {t("clicks")}</div>
                        <div><span className="font-semibold">{r.conversions}</span> {t("conversions")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-xs truncate flex-1">{url}</code>
                      <Button size="sm" variant="ghost" onClick={() => copy(r.code)} className="gap-1">
                        <Copy className="h-3.5 w-3.5" />{t("copy_link")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Link2 }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
