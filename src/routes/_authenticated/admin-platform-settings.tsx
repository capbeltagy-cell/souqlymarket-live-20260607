import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/marketing.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-platform-settings")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "إعدادات المنصة — لوحة الإدارة — سوقلي" }] }),
  component: SettingsPage,
});

type PlatformSettings = {
  platform_commission_pct: number | string;
  marketer_commission_pct: number | string;
  min_withdrawal_amount: number | string;
  withdrawal_review_mode: "manual" | "auto";
  subscription_marketer_commission_pct?: number | string;
  subscription_plan_price_egp?: number | string;
};

function SettingsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fGet = useServerFn(getPlatformSettings);
  const fSave = useServerFn(updatePlatformSettings);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fGet()
      .then((result) => setSettings(result.settings as PlatformSettings))
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : ar ? "تعذر تحميل الإعدادات" : "Unable to load settings";
        setError(message);
        toast.error(message);
      });
  }, [ar, fGet]);

  const patch = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    try {
      const platform = Number(settings.platform_commission_pct);
      const marketer = Number(settings.marketer_commission_pct);
      if (Math.abs(platform + marketer - 100) > 0.01) {
        throw new Error(ar ? "مجموع نسبتي المنصة والمسوّق يجب أن يساوي 100%" : "Platform and marketer percentages must sum to 100%");
      }
      await fSave({
        data: {
          platform_commission_pct: platform,
          marketer_commission_pct: marketer,
          min_withdrawal_amount: Number(settings.min_withdrawal_amount),
          withdrawal_review_mode: settings.withdrawal_review_mode,
          subscription_marketer_commission_pct: Number(settings.subscription_marketer_commission_pct ?? 15),
          subscription_plan_price_egp: Number(settings.subscription_plan_price_egp ?? 499),
        },
      });
      toast.success(ar ? "تم حفظ إعدادات المنصة" : "Platform settings saved");
    } catch (reason: unknown) {
      toast.error(reason instanceof Error ? reason.message : ar ? "تعذر حفظ الإعدادات" : "Unable to save settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title={ar ? "إعدادات المنصة" : "Platform settings"}
      breadcrumbs={[{ label: ar ? "الإعدادات" : "Settings" }]}
      loading={!settings && !error}
      error={error}
    >
      {settings && (
        <form onSubmit={save} className="max-w-3xl space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={ar ? "نسبة المسوّق %" : "Marketer commission %"}>
              <Input type="number" min={0} max={100} step="0.01" value={settings.marketer_commission_pct} onChange={(event) => patch("marketer_commission_pct", event.target.value)} />
            </Field>
            <Field label={ar ? "نسبة المنصة %" : "Platform commission %"}>
              <Input type="number" min={0} max={100} step="0.01" value={settings.platform_commission_pct} onChange={(event) => patch("platform_commission_pct", event.target.value)} />
            </Field>
            <Field label={ar ? "الحد الأدنى للسحب" : "Minimum withdrawal amount"}>
              <Input type="number" min={0} step="1" value={settings.min_withdrawal_amount} onChange={(event) => patch("min_withdrawal_amount", event.target.value)} />
            </Field>
            <Field label={ar ? "وضع مراجعة السحب" : "Withdrawal review mode"}>
              <select value={settings.withdrawal_review_mode} onChange={(event) => patch("withdrawal_review_mode", event.target.value as "manual" | "auto")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="manual">{ar ? "يدوي بموافقة الإدارة" : "Manual admin approval"}</option>
                <option value="auto">{ar ? "تلقائي" : "Automatic"}</option>
              </select>
            </Field>
            <Field label={ar ? "عمولة المسوّق على اشتراك الشركة %" : "Subscription referral commission %"}>
              <Input type="number" min={0} max={100} step="0.01" value={settings.subscription_marketer_commission_pct ?? 15} onChange={(event) => patch("subscription_marketer_commission_pct", event.target.value)} />
            </Field>
            <Field label={ar ? "سعر اشتراك الشركة بالجنيه" : "Company subscription price (EGP)"}>
              <Input type="number" min={0} step="1" value={settings.subscription_plan_price_egp ?? 499} onChange={(event) => patch("subscription_plan_price_egp", event.target.value)} />
            </Field>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {ar ? "أي تعديل هنا يؤثر على العمليات المالية الجديدة فقط. راجع النسب قبل الحفظ." : "Changes here affect new financial operations. Review percentages before saving."}
          </div>
          <Button type="submit" disabled={busy}>{busy ? (ar ? "جاري الحفظ..." : "Saving...") : ar ? "حفظ الإعدادات" : "Save settings"}</Button>
        </form>
      )}
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
