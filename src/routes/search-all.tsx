import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/I18nProvider";
import { globalSearch } from "@/lib/global-search.functions";
import { highlight } from "@/components/GlobalSearch";

const schema = z.object({ q: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/search-all")({
  validateSearch: zodValidator(schema),
  head: () => ({ meta: [{ title: "بحث شامل — Souqly" }, { name: "description", content: "ابحث عبر الشركات والمنتجات والمصانع والعقارات والأراضي والمسوقين." }] }),
  component: SearchAllPage,
});

function SearchAllPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { q: initialQ } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(initialQ);
  const [res, setRes] = useState<Awaited<ReturnType<typeof globalSearch>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setQ(initialQ); }, [initialQ]);

  useEffect(() => {
    const term = initialQ.trim();
    if (!term) { setRes(null); return; }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      globalSearch({ data: { q: term, limit: 12 } })
        .then((r) => { if (!cancelled) setRes(r); })
        .catch(() => { if (!cancelled) setRes(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 150);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [initialQ]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { q: q.trim() } });
  }

  const total = res ? (
    res.companies.length + res.products.length + res.services.length + res.real_estate.length +
    res.lands.length + res.factories.length + res.wholesale.length + res.rfqs.length +
    res.tenders.length + res.agents.length
  ) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-3xl font-bold mb-4">{ar ? "بحث شامل" : "Global Search"}</h1>
        <form onSubmit={submit} className="flex gap-2 mb-6">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث…" : "Search anything…"} />
          <Button type="submit" className="bg-primary hover:bg-primary-hover">
            <Search className="h-4 w-4 me-2" /> {ar ? "بحث" : "Search"}
          </Button>
        </form>

        {!initialQ && <div className="text-center text-muted-foreground py-10">{ar ? "اكتب كلمة للبحث" : "Type to search"}</div>}
        {loading && (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, s) => (
              <section key={s}>
                <Skeleton className="h-5 w-40 mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {res && total === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <div className="text-lg font-semibold">{ar ? "لا توجد نتائج" : "No results"}</div>
            <div className="text-sm text-muted-foreground mt-1">{ar ? `لم نجد نتائج لـ "${initialQ}"` : `Nothing matched "${initialQ}"`}</div>
          </div>
        )}

        {res && total > 0 && (
          <div className="space-y-8">
            <Section title={ar ? "الشركات" : "Companies"} count={res.companies.length} items={res.companies.map((c: any) => ({
              key: c.id, to: "/companies/$id", params: { id: c.id },
              title: ar ? c.name_ar : c.name_en, sub: [c.industry, c.governorate, c.city].filter(Boolean).join(" · "),
              tags: [c.is_verified && (ar ? "موثقة" : "Verified"), c.is_premium && (ar ? "بريميوم" : "Premium")].filter(Boolean) as string[],
            }))} q={initialQ} />
            <Section title={ar ? "المنتجات" : "Products"} count={res.products.length} items={res.products.map((l: any) => ({
              key: l.id, to: "/listings/$id", params: { id: l.id },
              title: ar ? l.title_ar : l.title_en, sub: [l.price && `${l.price} ${l.currency || "EGP"}`, l.governorate].filter(Boolean).join(" · "),
              tags: l.featured ? [ar ? "مميز" : "Featured"] : [],
            }))} q={initialQ} />
            <Section title={ar ? "العقارات" : "Real Estate"} count={res.real_estate.length} items={res.real_estate.map((l: any) => ({
              key: l.id, to: "/listings/$id", params: { id: l.id },
              title: ar ? l.title_ar : l.title_en, sub: [l.price && `${l.price} ${l.currency || "EGP"}`, l.governorate, l.city].filter(Boolean).join(" · "),
            }))} q={initialQ} />
            <Section title={ar ? "الأراضي" : "Lands"} count={res.lands.length} items={res.lands.map((l: any) => ({
              key: l.id, to: "/listings/$id", params: { id: l.id },
              title: ar ? l.title_ar : l.title_en, sub: [l.price && `${l.price} ${l.currency || "EGP"}`, l.governorate].filter(Boolean).join(" · "),
            }))} q={initialQ} />
            <Section title={ar ? "المصانع" : "Factories"} count={res.factories.length} items={res.factories.map((f: any) => ({
              key: f.company_id, to: "/factories/$id", params: { id: f.company_id },
              title: ar ? f.companies?.name_ar : f.companies?.name_en, sub: [f.production_capacity, f.companies?.governorate].filter(Boolean).join(" · "),
              tags: [f.verified && (ar ? "موثق" : "Verified"), f.export_available && (ar ? "تصدير" : "Export")].filter(Boolean) as string[],
            }))} q={initialQ} />
            <Section title={ar ? "سوق الجملة" : "Wholesale"} count={res.wholesale.length} items={res.wholesale.map((w: any) => ({
              key: w.id, to: "/wholesale/$id", params: { id: w.id },
              title: w.title, sub: [w.price_per_unit && `${w.price_per_unit} ${w.currency || "EGP"}`, w.moq && `MOQ ${w.moq}`, w.governorate].filter(Boolean).join(" · "),
            }))} q={initialQ} />
            <Section title={ar ? "طلبات الأسعار" : "RFQs"} count={res.rfqs.length} items={res.rfqs.map((r: any) => ({
              key: r.id, to: "/rfq/$id", params: { id: r.id },
              title: r.title, sub: [r.quantity && `${r.quantity} ${r.unit || ""}`, r.governorate, r.status].filter(Boolean).join(" · "),
            }))} q={initialQ} />
            <Section title={ar ? "المناقصات" : "Tenders"} count={res.tenders.length} items={res.tenders.map((t: any) => ({
              key: t.id, to: "/tenders/$id", params: { id: t.id },
              title: t.title, sub: [t.budget && `${t.budget} ${t.currency || "EGP"}`, t.governorate, t.deadline && new Date(t.deadline).toLocaleDateString()].filter(Boolean).join(" · "),
            }))} q={initialQ} />
            <Section title={ar ? "المسوقون" : "Agents"} count={res.agents.length} items={res.agents.map((a: any) => ({
              key: a.id, to: "/agents/$id", params: { id: a.id },
              title: a.profile?.display_name || a.profile?.full_name || (ar ? a.headline_ar : a.headline_en) || "Agent",
              sub: [(ar ? a.headline_ar : a.headline_en), a.city, a.country].filter(Boolean).join(" · "),
              tags: [a.is_verified && (ar ? "موثق" : "Verified"), a.is_trusted && (ar ? "موثوق" : "Trusted"), a.is_premium && (ar ? "بريميوم" : "Premium")].filter(Boolean) as string[],
            }))} q={initialQ} />
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Section({ title, count, items, q }: { title: string; count: number; items: { key: string; to: string; params: any; title: string; sub: string; tags?: string[] }[]; q: string }) {
  if (count === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        {title}
        <span className="text-xs font-normal rounded-full bg-muted px-2 py-0.5">{count}</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <Link key={it.key} to={it.to as any} params={it.params} className="rounded-xl border border-border bg-card p-4 hover:bg-muted transition shadow-sm">
            <div className="font-medium">{highlight(it.title || "—", q)}</div>
            {it.sub && <div className="text-sm text-muted-foreground mt-1">{it.sub}</div>}
            {it.tags && it.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {it.tags.map((t) => <span key={t} className="text-xs rounded px-2 py-0.5 bg-primary/10 text-primary">{t}</span>)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
