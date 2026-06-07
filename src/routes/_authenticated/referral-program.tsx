import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyReferral } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/referral-program")({ component: ReferralProgram });

function ReferralProgram() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [r, setR] = useState<any>(null);
  useEffect(() => { getMyReferral().then((x) => setR(x.referral)); }, []);

  const url = r ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${r.code}` : "";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{ar ? "برنامج الإحالات" : "Referral Program"}</h1>
        <p className="text-muted-foreground mb-6">{ar ? "ادعُ شركات جديدة إلى سوقلي عبر رابطك الخاص واكسب مكافآت" : "Invite companies to Souqly with your link and earn rewards"}</p>
        {r && (
          <>
            <div className="rounded-lg border border-border bg-card p-6 shadow-card mb-6">
              <div className="text-xs text-muted-foreground">{ar ? "كودك" : "Your code"}</div>
              <div className="text-3xl font-bold text-primary mt-1">{r.code}</div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" readOnly value={url} />
                <Button onClick={() => { navigator.clipboard.writeText(url); toast.success(ar ? "تم النسخ" : "Copied"); }}>{ar ? "نسخ" : "Copy"}</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label={ar ? "النقرات" : "Clicks"} value={r.clicks} />
              <Stat label={ar ? "التسجيلات" : "Signups"} value={r.signups} />
              <Stat label={ar ? "التحويلات" : "Conversions"} value={r.conversions} />
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-card p-4 text-center shadow-card"><div className="text-2xl font-bold text-primary">{value ?? 0}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
