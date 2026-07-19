import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Search, ShieldCheck, Sparkles, Store } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublishedStores } from "@/lib/stores.functions";

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: "المتاجر — سوقلي" },
      { name: "description", content: "اكتشف متاجر الشركات والبائعين الموثوقين على سوقلي" },
    ],
  }),
  component: StoresPage,
});

type StoreCardData = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  accent_color: string;
  city: string | null;
  governorate: string | null;
  verified: boolean;
  featured: boolean;
};

function StoresPage() {
  const loadStores = useServerFn(listPublishedStores);
  const [stores, setStores] = useState<StoreCardData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = (await loadStores({ data: { search, limit: 36 } })) as StoreCardData[];
        if (active) setStores(rows);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadStores, search]);

  const featured = useMemo(() => stores.filter((store) => store.featured), [stores]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="container-souqly py-12 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr,360px] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" /> متاجر جاهزة للشراء من داخل سوقلي
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">اكتشف متاجر سوقلي</h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  تصفح متاجر الشركات والبائعين، شاهد منتجاتهم، وأكمل طلبك وشحنك بأمان من خلال منصة سوقلي.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link to="/store"><Store className="me-2 h-5 w-5" /> افتح متجرك</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/marketplace">تصفح كل المنتجات</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 className="h-6 w-6" /></div>
                  <div>
                    <div className="font-bold">عندك منتجات؟</div>
                    <div className="text-sm text-muted-foreground">متجرك يتجهز في دقائق ويرتبط بمنتجاتك الحالية.</div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-muted p-3"><div className="font-bold text-foreground">رابط خاص</div><div className="mt-1 text-muted-foreground">لكل متجر</div></div>
                  <div className="rounded-xl bg-muted p-3"><div className="font-bold text-foreground">طلبات</div><div className="mt-1 text-muted-foreground">داخل سوقلي</div></div>
                  <div className="rounded-xl bg-muted p-3"><div className="font-bold text-foreground">آمن</div><div className="mt-1 text-muted-foreground">بصلاحيات محمية</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-souqly py-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">كل المتاجر</h2>
              <p className="mt-1 text-sm text-muted-foreground">المتاجر المنشورة والمعتمدة للظهور أمام العملاء.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المتجر أو المدينة" className="pe-10" />
            </div>
          </div>

          {featured.length > 0 && !search && (
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-accent" /> متاجر مميزة</div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {featured.map((store) => <StoreCard key={store.id} store={store} />)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl border border-border bg-muted" />)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">تعذر تحميل المتاجر: {error}</div>
          ) : stores.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <Store className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-bold">لا توجد متاجر مطابقة حاليًا</h3>
              <p className="mt-2 text-sm text-muted-foreground">جرّب كلمة بحث مختلفة أو كن أول من يفتح متجره.</p>
              <Button asChild className="mt-5"><Link to="/store">افتح متجرك</Link></Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => <StoreCard key={store.id} store={store} />)}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function StoreCard({ store }: { store: StoreCardData }) {
  const location = [store.city, store.governorate].filter(Boolean).join("، ");
  return (
    <Link
      to="/stores/$slug"
      params={{ slug: store.slug }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-32 bg-muted" style={{ background: store.banner_url ? undefined : `linear-gradient(135deg, ${store.primary_color}, ${store.accent_color})` }}>
        {store.banner_url && <img src={store.banner_url} alt="" className="h-full w-full object-cover" />}
        {store.featured && <span className="absolute start-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold">مميز</span>}
      </div>
      <div className="relative p-5 pt-10">
        <div className="absolute -top-8 start-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-background shadow-sm">
          {store.logo_url ? <img src={store.logo_url} alt={store.name_ar} className="h-full w-full object-cover" /> : <Store className="h-7 w-7 text-muted-foreground" />}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-lg font-bold">
              {store.name_ar}
              {store.verified && <ShieldCheck className="h-4 w-4 text-primary" aria-label="متجر موثق" />}
            </div>
            {location && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {location}</div>}
          </div>
        </div>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-6 text-muted-foreground">{store.description_ar || "متجر على سوقلي يعرض منتجات وخدمات للبيع والطلب المباشر."}</p>
        <div className="mt-5 font-semibold text-primary transition group-hover:translate-x-[-3px]">زيارة المتجر ←</div>
      </div>
    </Link>
  );
}