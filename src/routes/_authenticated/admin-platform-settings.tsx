import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/admin-platform-settings")({
  head: () => ({ meta: [{ title: "Platform Settings — Admin" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fGet = useServerFn(getPlatformSettings);
  const fSave = useServerFn(updatePlatformSettings);
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fGet()
      .then((r) => setS(r.settings))
      .catch((e) => toast.error(e.message));
  }, []);

  if (!s)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {ar ? "جاري التحميل..." : "Loading..."}
      </div>
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const platform = Number(s.platform_commission_pct);
      const marketer = Number(s.marketer_commission_pct);
      if (Math.abs(platform + marketer - 100) > 0.01)
        throw new Error(ar ? "مجموع النسبتين يجب أن يساوي 100%" : "Percentages must sum to 100%");
      await fSave({
        data: {
          platform_commission_pct: platform,
          marketer_commission_pct: marketer,
          min_withdrawal_amount: Number(s.min_withdrawal_amount),
          withdrawal_review_mode: s.withdrawal_review_mode,
          subscription_marketer_commission_pct: Number(
            s.subscription_marketer_commission_pct ?? 15,
          ),
          subscription_plan_price_egp: Number(s.subscription_plan_price_egp ?? 499),
        },
      });
      toast.success(ar ? "تم الحفظ" : "Saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Settings2 className="h-6 w-6 text-primary" />
          {ar ? "إعدادات المنصة" : "Platform settings"}
        </h1>
        <form
          onSubmit={save}
          className="max-w-2xl space-y-4 rounded-lg border border-border bg-card p-6 shadow-card"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{ar ? "نسبة المسوق %" : "Marketer commission %"}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={s.marketer_commission_pct}
                onChange={(e) => setS({ ...s, marketer_commission_pct: e.target.value })}
              />
            </div>
            <div>
              <Label>{ar ? "نسبة المنصة %" : "Platform commission %"}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={s.platform_commission_pct}
                onChange={(e) => setS({ ...s, platform_commission_pct: e.target.value })}
              />
            </div>
            <div>
              <Label>{ar ? "الحد الأدنى للسحب" : "Minimum withdrawal amount"}</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={s.min_withdrawal_amount}
                onChange={(e) => setS({ ...s, min_withdrawal_amount: e.target.value })}
              />
            </div>
            <div>
              <Label>{ar ? "وضع مراجعة السحب" : "Withdrawal review mode"}</Label>
              <select
                value={s.withdrawal_review_mode}
                onChange={(e) => setS({ ...s, withdrawal_review_mode: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="manual">
                  {ar ? "يدوي (موافقة الأدمن)" : "Manual (admin approval)"}
                </option>
                <option value="auto">{ar ? "تلقائي" : "Auto"}</option>
              </select>
            </div>
            <div>
              <Label>
                {ar
                  ? "نسبة عمولة المسوق على اشتراك الشركة %"
                  : "Subscription referral commission %"}
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={s.subscription_marketer_commission_pct ?? 15}
                onChange={(e) =>
                  setS({ ...s, subscription_marketer_commission_pct: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {ar
                  ? "تُحسب على سعر الاشتراك عند التفعيل."
                  : "Applied to the subscription price when a company activates the paid plan."}
              </p>
            </div>
            <div>
              <Label>{ar ? "سعر اشتراك الشركة (جنيه)" : "Company subscription price (EGP)"}</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={s.subscription_plan_price_egp ?? 499}
                onChange={(e) => setS({ ...s, subscription_plan_price_egp: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" disabled={busy}>
            {ar ? "حفظ" : "Save"}
          </Button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}
