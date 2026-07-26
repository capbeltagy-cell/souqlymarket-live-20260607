import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/marketing.functions";
import { requireAdminRoute } from "@/lib/route-guards";
import { adminSettingsHistory } from "@/lib/admin-phase2-ui.functions";

export const Route = createFileRoute("/_authenticated/admin-platform-settings")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "Platform Settings — Admin" }] }),
  component: SettingsPage,
});

type Settings = Awaited<ReturnType<typeof getPlatformSettings>>["settings"];

function SettingsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchSettings = useServerFn(getPlatformSettings);
  const saveSettings = useServerFn(updatePlatformSettings);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<unknown[]>([]);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingError(null);

    fetchSettings()
      .then((result) => {
        if (active) setSettings(result.settings);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : ar
              ? "تعذر تحميل الإعدادات"
              : "Unable to load settings";
        setLoadingError(message);
        toast.error(message);
      });
    adminSettingsHistory()
      .then((result) => {
        setHistory(result.rows);
        setHistoryMessage(result.available ? null : result.message);
      })
      .catch(() => setHistoryMessage("تعذر تحميل سجل تغييرات الإعدادات"));

    return () => {
      active = false;
    };
  }, [ar, fetchSettings]);

  const updateField = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current: Settings | null) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings || busy) return;

    setBusy(true);
    try {
      const platform = Number(settings.platform_commission_pct);
      const marketer = Number(settings.marketer_commission_pct);
      const minimumWithdrawal = Number(settings.min_withdrawal_amount);
      const subscriptionCommission = Number(settings.subscription_marketer_commission_pct ?? 15);
      const subscriptionPrice = Number(settings.subscription_plan_price_egp ?? 499);

      const numericValues = [
        platform,
        marketer,
        minimumWithdrawal,
        subscriptionCommission,
        subscriptionPrice,
      ];
      if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error(ar ? "أدخل أرقامًا صحيحة غير سالبة" : "Enter valid non-negative numbers");
      }
      if (platform > 100 || marketer > 100 || subscriptionCommission > 100) {
        throw new Error(
          ar ? "نسب العمولة لا يمكن أن تتجاوز 100%" : "Commission percentages cannot exceed 100%",
        );
      }
      if (Math.abs(platform + marketer - 100) > 0.01) {
        throw new Error(
          ar
            ? "مجموع نسبة المنصة والمسوق يجب أن يساوي 100%"
            : "Platform and marketer percentages must total 100%",
        );
      }

      await saveSettings({
        data: {
          platform_commission_pct: platform,
          marketer_commission_pct: marketer,
          min_withdrawal_amount: minimumWithdrawal,
          withdrawal_review_mode: settings.withdrawal_review_mode,
          subscription_marketer_commission_pct: subscriptionCommission,
          subscription_plan_price_egp: subscriptionPrice,
        },
      });

      setSettings((current: Settings | null) =>
        current
          ? {
              ...current,
              platform_commission_pct: platform,
              marketer_commission_pct: marketer,
              min_withdrawal_amount: minimumWithdrawal,
              subscription_marketer_commission_pct: subscriptionCommission,
              subscription_plan_price_egp: subscriptionPrice,
            }
          : current,
      );
      toast.success(ar ? "تم حفظ الإعدادات" : "Settings saved");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : ar ? "تعذر الحفظ" : "Unable to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{ar ? "إعدادات المنصة" : "Platform settings"}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ar
              ? "تحكم في العمولات والسحب وأسعار الاشتراكات."
              : "Manage commissions, withdrawals, and subscription pricing."}
          </p>
        </div>

        {loadingError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {loadingError}
          </div>
        )}

        {!settings ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
            <Loader2 className="me-2 h-5 w-5 animate-spin" />
            {ar ? "جاري تحميل الإعدادات..." : "Loading settings..."}
          </div>
        ) : (
          <form
            onSubmit={save}
            className="max-w-3xl space-y-6 rounded-xl border border-border bg-card p-5 shadow-card md:p-6"
          >
            <section>
              <h2 className="mb-4 font-semibold">
                {ar ? "العمولات الأساسية" : "Core commissions"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={ar ? "نسبة المسوق %" : "Marketer commission %"}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={settings.marketer_commission_pct}
                    onChange={(event) =>
                      updateField(
                        "marketer_commission_pct",
                        event.target.value as Settings["marketer_commission_pct"],
                      )
                    }
                  />
                </Field>
                <Field label={ar ? "نسبة المنصة %" : "Platform commission %"}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={settings.platform_commission_pct}
                    onChange={(event) =>
                      updateField(
                        "platform_commission_pct",
                        event.target.value as Settings["platform_commission_pct"],
                      )
                    }
                  />
                </Field>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {ar ? "يجب أن يكون مجموع النسبتين 100%." : "The two percentages must total 100%."}
              </p>
            </section>

            <section className="border-t border-border pt-6">
              <h2 className="mb-4 font-semibold">{ar ? "إعدادات السحب" : "Withdrawal settings"}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={ar ? "الحد الأدنى للسحب" : "Minimum withdrawal amount"}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={settings.min_withdrawal_amount}
                    onChange={(event) =>
                      updateField(
                        "min_withdrawal_amount",
                        event.target.value as Settings["min_withdrawal_amount"],
                      )
                    }
                  />
                </Field>
                <Field label={ar ? "وضع مراجعة السحب" : "Withdrawal review mode"}>
                  <select
                    value={settings.withdrawal_review_mode}
                    onChange={(event) =>
                      updateField(
                        "withdrawal_review_mode",
                        event.target.value as Settings["withdrawal_review_mode"],
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="manual">
                      {ar ? "يدوي — موافقة الأدمن" : "Manual — admin approval"}
                    </option>
                    <option value="auto">{ar ? "تلقائي" : "Automatic"}</option>
                  </select>
                </Field>
              </div>
            </section>

            <section className="border-t border-border pt-6">
              <h2 className="mb-4 font-semibold">
                {ar ? "اشتراكات الشركات" : "Company subscriptions"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={ar ? "عمولة المسوق على الاشتراك %" : "Subscription referral commission %"}
                  hint={
                    ar
                      ? "تُحسب عند تفعيل الاشتراك المدفوع."
                      : "Applied when the paid subscription is activated."
                  }
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={settings.subscription_marketer_commission_pct ?? 15}
                    onChange={(event) =>
                      updateField(
                        "subscription_marketer_commission_pct",
                        event.target.value as Settings["subscription_marketer_commission_pct"],
                      )
                    }
                  />
                </Field>
                <Field label={ar ? "سعر اشتراك الشركة (جنيه)" : "Company subscription price (EGP)"}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={settings.subscription_plan_price_egp ?? 499}
                    onChange={(event) =>
                      updateField(
                        "subscription_plan_price_egp",
                        event.target.value as Settings["subscription_plan_price_egp"],
                      )
                    }
                  />
                </Field>
              </div>
            </section>

            <div className="flex justify-end border-t border-border pt-5">
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="me-2 h-4 w-4" />
                )}
                {busy
                  ? ar
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : ar
                    ? "حفظ الإعدادات"
                    : "Save settings"}
              </Button>
            </div>
          </form>
        )}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">سجل تغييرات الإعدادات</h2>
          {historyMessage ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {historyMessage}
            </p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تغييرات مسجلة.</p>
          ) : (
            <div className="space-y-2">
              {history.map((row, index) => (
                <pre key={index} className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(row, null, 2)}
                </pre>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
