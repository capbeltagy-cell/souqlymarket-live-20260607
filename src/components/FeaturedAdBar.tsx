import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Building2, Package, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";

type AdItem =
  | { kind: "listing"; id: string; title: string; image: string | null; badge: string; to: any; params: any }
  | { kind: "company"; id: string; title: string; image: string | null; badge: string; to: any; params: any };

/**
 * Premium auto-scrolling featured advertisement bar.
 * Pulls live featured listings + verified companies. Pauses on hover.
 * Gracefully hides if there is nothing to show — no fake/demo data.
 */
export function FeaturedAdBar() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [items, setItems] = useState<AdItem[] | null>(null);

  useEffect(() => {
    (async () => {
      const [lRes, cRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title_ar, title_en, images, type")
          .eq("status", "approved")
          .eq("featured", true)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("companies")
          .select("id, name_ar, name_en, logo_url, is_verified")
          .eq("is_verified", true)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const list: AdItem[] = [];

      (lRes.data ?? []).forEach((l: any) => {
        const title = (ar ? l.title_ar : l.title_en) ?? l.title_en ?? l.title_ar ?? "—";
        list.push({
          kind: "listing",
          id: l.id,
          title,
          image: l.images?.[0] ?? null,
          badge: ar ? "مميز" : "Featured",
          to: "/listings/$id",
          params: { id: l.id },
        });
      });

      (cRes.data ?? []).forEach((c: any) => {
        const title = (ar ? c.name_ar : c.name_en) ?? c.name_en ?? c.name_ar ?? "—";
        list.push({
          kind: "company",
          id: c.id,
          title,
          image: c.logo_url ?? null,
          badge: ar ? "موثق" : "Verified",
          to: "/companies/$id",
          params: { id: c.id },
        });
      });

      setItems(list);
    })();
  }, [ar]);

  if (!items || items.length === 0) return null;

  // Duplicate for seamless loop
  const loop = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden border-y border-white/10 bg-gradient-to-r from-black via-[#0f0f0f] to-black">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-black to-transparent" />

      <div className="group flex items-center gap-3 py-2.5">
        <span className="shrink-0 hidden sm:inline-flex items-center gap-1.5 pl-4 text-[10px] uppercase tracking-[0.2em] text-gold">
          <Sparkles className="h-3 w-3" />
          {ar ? "مميزة" : "Featured"}
        </span>

        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex gap-3 animate-[adbar-scroll_45s_linear_infinite] group-hover:[animation-play-state:paused] will-change-transform"
            style={{ width: "max-content" }}
          >
            {loop.map((item, i) => (
              <Link
                key={`${item.kind}-${item.id}-${i}`}
                to={item.to}
                params={item.params}
                className="group/card inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] hover:border-gold/40 hover:bg-white/[0.06] pl-1.5 pr-3 py-1.5 transition-all shrink-0 max-w-[280px]"
              >
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/[0.05] grid place-items-center">
                  {item.image ? (
                    <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : item.kind === "company" ? (
                    <Building2 className="h-3.5 w-3.5 text-gold" />
                  ) : (
                    <Package className="h-3.5 w-3.5 text-gold" />
                  )}
                </span>
                <span className="text-xs font-medium text-foreground truncate min-w-0">{item.title}</span>
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold">
                  <BadgeCheck className="h-3 w-3" />
                  {item.badge}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes adbar-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        [dir="rtl"] .animate-\\[adbar-scroll_45s_linear_infinite\\] {
          animation-direction: reverse;
        }
      `}</style>
    </div>
  );
}
