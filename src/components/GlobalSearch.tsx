import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2, Building2, Package, Factory, Home, MapPin, FileText, ClipboardList, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { globalSearch } from "@/lib/global-search.functions";

type Results = Awaited<ReturnType<typeof globalSearch>>;

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Results | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRes(null); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await globalSearch({ data: { q: term, limit: 4 } });
        setRes(r);
      } catch { setRes(null); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate({ to: "/search-all", search: { q: term } });
  }

  const total = res ? (
    res.companies.length + res.products.length + res.services.length + res.real_estate.length +
    res.lands.length + res.factories.length + res.wholesale.length + res.rfqs.length +
    res.tenders.length + res.agents.length
  ) : 0;

  return (
    <div ref={wrapRef} className={`relative ${compact ? "w-full" : "w-full max-w-md"}`}>
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={ar ? "ابحث في كل سوقلي…" : "Search Souqly…"}
            className="ps-9 h-10 rounded-full bg-surface-2"
            aria-label={ar ? "بحث" : "Search"}
          />
          {loading && <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
        </div>
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-[min(560px,calc(100vw-2rem))] start-0 rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {!res && loading && <div className="p-6 text-center text-sm text-muted-foreground">{ar ? "جاري البحث…" : "Searching…"}</div>}
          {res && total === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">{ar ? "لا توجد نتائج" : "No results found"}</div>
          )}
          {res && total > 0 && (
            <div className="p-2 text-sm">
              <Group icon={Building2} title={ar ? "الشركات" : "Companies"} items={res.companies.map((c: any) => ({
                key: c.id, to: "/companies/$id", params: { id: c.id },
                title: ar ? c.name_ar : c.name_en, sub: [c.industry, c.governorate].filter(Boolean).join(" · "),
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={Package} title={ar ? "المنتجات" : "Products"} items={res.products.map((l: any) => ({
                key: l.id, to: "/listings/$id", params: { id: l.id },
                title: ar ? l.title_ar : l.title_en, sub: l.price ? `${l.price} ${l.currency || "EGP"}` : (l.governorate ?? ""),
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={Home} title={ar ? "العقارات" : "Real Estate"} items={res.real_estate.map((l: any) => ({
                key: l.id, to: "/listings/$id", params: { id: l.id },
                title: ar ? l.title_ar : l.title_en, sub: [l.governorate, l.city].filter(Boolean).join(" · "),
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={MapPin} title={ar ? "الأراضي" : "Lands"} items={res.lands.map((l: any) => ({
                key: l.id, to: "/listings/$id", params: { id: l.id },
                title: ar ? l.title_ar : l.title_en, sub: [l.governorate, l.city].filter(Boolean).join(" · "),
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={Factory} title={ar ? "المصانع" : "Factories"} items={res.factories.map((f: any) => ({
                key: f.company_id, to: "/factories/$id", params: { id: f.company_id },
                title: ar ? f.companies?.name_ar : f.companies?.name_en, sub: f.production_capacity ?? f.companies?.governorate ?? "",
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={Package} title={ar ? "سوق الجملة" : "Wholesale"} items={res.wholesale.map((w: any) => ({
                key: w.id, to: "/wholesale/$id", params: { id: w.id },
                title: w.title, sub: w.price_per_unit ? `${w.price_per_unit} ${w.currency || "EGP"}` : w.governorate,
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={FileText} title={ar ? "طلبات الأسعار" : "RFQs"} items={res.rfqs.map((r: any) => ({
                key: r.id, to: "/rfq/$id", params: { id: r.id },
                title: r.title, sub: r.governorate ?? "",
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={ClipboardList} title={ar ? "المناقصات" : "Tenders"} items={res.tenders.map((t: any) => ({
                key: t.id, to: "/tenders/$id", params: { id: t.id },
                title: t.title, sub: t.governorate ?? "",
              }))} q={q} onPick={() => setOpen(false)} />
              <Group icon={UserCircle2} title={ar ? "المسوقون" : "Agents"} items={res.agents.map((a: any) => ({
                key: a.id, to: "/agents/$id", params: { id: a.id },
                title: a.profile?.display_name || a.profile?.full_name || (ar ? a.headline_ar : a.headline_en) || "Agent",
                sub: [a.city, a.country].filter(Boolean).join(" · "),
              }))} q={q} onPick={() => setOpen(false)} />
              <Link
                to="/search-all"
                search={{ q: q.trim() }}
                onClick={() => setOpen(false)}
                className="block text-center mt-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium"
              >
                {ar ? `عرض كل النتائج (${total}+)` : `See all results (${total}+)`}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ icon: Icon, title, items, q, onPick }: { icon: any; title: string; items: { key: string; to: string; params: any; title: string; sub: string }[]; q: string; onPick: () => void }) {
  if (!items.length) return null;
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.key}>
            <Link to={it.to as any} params={it.params} onClick={onPick} className="flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-muted">
              <span className="text-foreground">{highlight(it.title || "—", q)}</span>
              {it.sub && <span className="text-xs text-muted-foreground">{it.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function highlight(text: string, q: string) {
  const term = q.trim();
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}
