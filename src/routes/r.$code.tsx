import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/r/$code")({
  head: () => ({ meta: [{ title: "Redirecting — Souqly" }, { name: "robots", content: "noindex" }] }),
  component: ReferralRedirect,
});

function ReferralRedirect() {
  const { code } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // store attribution for later conversion crediting
        if (typeof window !== "undefined") {
          try { localStorage.setItem("souqly.ref", code); } catch { /* noop */ }
        }
        const { data, error } = await supabase.rpc("increment_referral_click", { _code: code });
        if (cancelled) return;
        const listingId = data?.[0]?.listing_id;
        if (!error && listingId) {
          navigate({ to: "/listings/$id", params: { id: listingId }, replace: true });
          return;
        }
        navigate({ to: "/marketplace", replace: true });
      } catch {
        navigate({ to: "/marketplace", replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center text-center p-10">
        <div>
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">{t("redirecting")}</p>
          <p className="mt-3 text-xs">
            <Link to="/marketplace" className="text-primary hover:underline">{t("nav_marketplace")}</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
