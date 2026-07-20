import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { advancedSearchCompanies, listCategories } from "@/lib/phase3.functions";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from "@/lib/egypt.locations";
const TYPES = [
  { v: "factory", ar: "مصنع" },
  { v: "supplier", ar: "مورد" },
  { v: "service", ar: "خدمات" },
  { v: "real_estate", ar: "عقارات" },
];

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "بحث متقدم — Souqly" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [gov, setGov] = useState("all");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const [verified, setVerified] = useState<"" | "yes" | "no">("");
  const [plan, setPlan] = useState<"" | "free" | "paid">("");
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listCategories().then((r) => setCats(r.categories));
  }, []);

  const cities = gov !== "all" ? getCitiesForGovernorate(gov) : [];

  async function run() {
    setLoading(true);
    const r = await advancedSearchCompanies({
      data: {
        q: q || undefined,
        city: city !== "all" ? city : undefined,
        governorate: gov !== "all" ? gov : undefined,
        category_slug: cat || undefined,
        company_type: type || undefined,
        verified: verified === "" ? undefined : verified === "yes",
        plan: plan || undefined,
      },
    });
    setResults(r.companies);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <h1 className="text-3xl font-bold mb-6">{ar ? "بحث متقدم" : "Advanced Search"}</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Input
            placeholder={ar ? "اسم الشركة" : "Company name"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={gov}
            onChange={(e) => {
              setGov(e.target.value);
              setCity("all");
            }}
          >
            <option value="all">{ar ? "كل المحافظات" : "All governorates"}</option>
            {EGYPT_GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {ar ? g.label_ar : g.label_en}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={gov === "all"}
          >
            <option value="all">{ar ? "كل المدن" : "All cities"}</option>
            {cities.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ar ? ct.label_ar : ct.label_en}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">{ar ? "كل الأقسام" : "All categories"}</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {ar ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">{ar ? "نوع الشركة" : "Company type"}</option>
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.ar}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={verified}
            onChange={(e) => setVerified(e.target.value as any)}
          >
            <option value="">{ar ? "موثقة؟" : "Verified?"}</option>
            <option value="yes">{ar ? "موثقة فقط" : "Verified only"}</option>
            <option value="no">{ar ? "غير موثقة" : "Unverified"}</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={plan}
            onChange={(e) => setPlan(e.target.value as any)}
          >
            <option value="">{ar ? "كل الاشتراكات" : "All plans"}</option>
            <option value="paid">{ar ? "مدفوع" : "Paid"}</option>
            <option value="free">{ar ? "مجاني" : "Free"}</option>
          </select>
          <Button onClick={run} className="bg-primary hover:bg-primary-hover">
            {ar ? "بحث" : "Search"}
          </Button>
        </div>
        {loading ? (
          <div className="text-center py-10">…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((c) => (
              <Link
                key={c.id}
                to="/companies/$id"
                params={{ id: c.id }}
                className="rounded-lg border border-border bg-card p-5 hover:bg-muted shadow-card"
              >
                <div className="font-semibold">{ar ? c.name_ar : c.name_en}</div>
                <div className="text-sm text-muted-foreground">
                  {[c.city, c.governorate, c.country].filter(Boolean).join(" · ")}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {c.is_verified && (
                    <span className="text-xs rounded px-2 py-0.5 bg-primary/10 text-primary">
                      {ar ? "موثقة" : "Verified"}
                    </span>
                  )}
                  {c.subscription_plan === "paid" && (
                    <span className="text-xs rounded px-2 py-0.5 bg-success/10 text-success">
                      {ar ? "مدفوع" : "Paid"}
                    </span>
                  )}
                  {c.company_type && (
                    <span className="text-xs rounded px-2 py-0.5 bg-muted">{c.company_type}</span>
                  )}
                </div>
              </Link>
            ))}
            {!loading && results.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-10">
                {ar ? "لا نتائج" : "No results"}
              </div>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
