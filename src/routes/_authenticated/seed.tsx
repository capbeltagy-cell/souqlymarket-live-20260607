import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sprout } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { seedEgyptDemo } from "@/lib/seed.functions";

export const Route = createFileRoute("/_authenticated/seed")({
  head: () => ({ meta: [{ title: "Seed demo data — Souqly" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: SeedPage,
});

function SeedPage() {
  const { t } = useI18n();
  const { roles, loading } = useAuth();
  const run = useServerFn(seedEgyptDemo);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const isAdmin = roles.includes("admin");

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;



  async function onRun() {
    setBusy(true);
    try {
      const r = await run();
      setResult(`${r.companies} companies · ${r.agents} agents · ${r.listings} listings`);
      toast.success(t("seed_done"));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="max-w-xl mx-auto rounded-xl border border-border bg-card p-8 shadow-card">
          <Sprout className="h-10 w-10 text-success mb-3" />
          <h1 className="text-2xl font-bold mb-2">{t("seed_title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("seed_desc")}</p>
          {!isAdmin ? (
            <p className="text-sm text-destructive">Admin only</p>
          ) : (
            <>
              <Button disabled={busy} onClick={onRun} className="bg-primary hover:bg-primary-hover">
                {busy ? t("loading") : t("seed_run")}
              </Button>
              {result && <p className="mt-4 text-sm text-success font-medium">✓ {result}</p>}
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
