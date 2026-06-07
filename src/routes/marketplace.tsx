import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { useI18n } from "@/i18n/I18nProvider";
import { LISTING_TYPES, type ListingType } from "@/lib/marketplace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — Souqly" }, { name: "description", content: "Browse B2B products, services, real estate, factories and opportunities." }] }),
  component: Marketplace,
});

const TYPES: { value: ListingType | "all"; key: string }[] = [
  { value: "all", key: "filter_all" },
  ...LISTING_TYPES.map((t) => ({ value: t, key: `cat_${t}` })),
];

function Marketplace() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ListingType | "all">("all");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    let query = supabase
      .from("listings")
      .select("id, type, title_ar, title_en, images, price, currency, country, commission_percentage, featured, featured_until, company_id, companies(name_ar, name_en, phone, is_verified)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(120);
    if (type !== "all") query = query.eq("type", type);
    query.then(({ data }) => {
      const rows = (data ?? []) as unknown as (ListingCardData & { featured_until?: string | null; companies?: { is_verified?: boolean } | null })[];
      // Sort: active-featured first, then verified-company listings, then newest
      const sorted = [...rows].sort((a, b) => {
        const af = a.featured && (!a.featured_until || a.featured_until > nowIso) ? 1 : 0;
        const bf = b.featured && (!b.featured_until || b.featured_until > nowIso) ? 1 : 0;
        if (af !== bf) return bf - af;
        const av = a.companies?.is_verified ? 1 : 0;
        const bv = b.companies?.is_verified ? 1 : 0;
        if (av !== bv) return bv - av;
        return 0;
      });
      setItems(sorted);
      setLoading(false);
    });
  }, [type]);

  const filtered = q
    ? items.filter((l) => {
        const hay = `${l.title_ar ?? ""} ${l.title_en ?? ""} ${l.companies?.name_ar ?? ""} ${l.companies?.name_en ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : items;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-10">
          <h1 className="text-3xl font-bold mb-4">{t("nav_marketplace")}</h1>
          <div className="relative max-w-2xl">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="ps-10 h-12 bg-card" />
          </div>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        <div className="flex flex-wrap gap-2 mb-6">
          {TYPES.map((tp) => (
            <Button key={tp.value} size="sm" variant={type === tp.value ? "default" : "outline"}
              onClick={() => setType(tp.value)}
              className={type === tp.value ? "bg-primary hover:bg-primary-hover" : ""}>
              {t(tp.key as never)}
            </Button>
          ))}
        </div>
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? t("no_listings_yet") : t("no_results")}
            cta={items.length === 0 ? { label: t("be_the_first"), to: "/listings/new" } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">{filtered.length} {t("listings_count")} • {locale.toUpperCase()}</p>
      </section>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ title, cta }: { title: string; cta?: { label: string; to: string } }) {
  return (
    <div className="py-24 text-center">
      <div className="text-lg font-semibold mb-2">{title}</div>
      {cta && (
        <Button asChild className="mt-4 bg-primary hover:bg-primary-hover">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
