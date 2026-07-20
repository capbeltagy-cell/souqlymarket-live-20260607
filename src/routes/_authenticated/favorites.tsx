import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "المفضلة — سوقلي" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("favorites")
        .select(
          "listing_id, listings(id, type, title_ar, title_en, images, price, currency, country, commission_percentage, featured, company_id, companies(name_ar, name_en))",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const rows = (data ?? []).map((r: any) => r.listings).filter(Boolean) as ListingCardData[];
      setItems(rows);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Heart className="h-6 w-6 text-primary" />
          {t("favorites_title")}
        </h1>
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold mb-2">{t("no_favorites_yet")}</p>
            <Button asChild className="mt-4 bg-primary hover:bg-primary-hover">
              <Link to="/marketplace">{t("nav_marketplace")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
