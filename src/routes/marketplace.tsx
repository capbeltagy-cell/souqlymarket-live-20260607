import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleListings, type ListingType } from "@/lib/sampleData";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — Souqly" }, { name: "description", content: "Browse B2B products, services, real estate, factories and opportunities." }] }),
  component: Marketplace,
});

const TYPES: { value: ListingType | "all"; key: string }[] = [
  { value: "all", key: "filter_all" },
  { value: "product", key: "cat_product" },
  { value: "service", key: "cat_service" },
  { value: "real_estate", key: "cat_real_estate" },
  { value: "land", key: "cat_land" },
  { value: "factory", key: "cat_factory" },
  { value: "opportunity", key: "cat_opportunity" },
];

function Marketplace() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ListingType | "all">("all");

  const filtered = sampleListings.filter((l) => {
    if (type !== "all" && l.type !== type) return false;
    if (!q) return true;
    const hay = `${l.title_ar} ${l.title_en} ${l.company_ar} ${l.company_en}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

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
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">{t("no_results")}</div>
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
