import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — Souqly" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-exchanges recovery token from URL hash and emits PASSWORD_RECOVERY.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) {
      toast.error(t("reset_mismatch"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success(t("reset_success"));
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface-2 p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <div className="inline-flex items-center gap-2 font-bold text-primary mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          {t("brand")}
        </div>
        <h1 className="text-2xl font-bold mb-1">{t("reset_title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("auth_welcome")}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pw">{t("reset_new_password")}</Label>
            <Input
              id="pw"
              type="password"
              minLength={6}
              required
              className="mt-1.5"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pw2">{t("reset_confirm_password")}</Label>
            <Input
              id="pw2"
              type="password"
              minLength={6}
              required
              className="mt-1.5"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !ready}
            className="w-full bg-primary hover:bg-primary-hover"
          >
            {t("reset_submit")}
          </Button>
          {!ready && <p className="text-xs text-muted-foreground text-center">{t("loading")}</p>}
        </form>
      </div>
    </div>
  );
}
