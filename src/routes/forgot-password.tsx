import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Souqly" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success(t("forgot_sent"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface-2 p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-primary mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          {t("brand")}
        </Link>
        <h1 className="text-2xl font-bold mb-1">{t("forgot_title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("forgot_subtitle")}</p>
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-md bg-success/10 text-success p-4 text-sm">
              {t("forgot_sent")}
            </div>
            <Button
              onClick={() => navigate({ to: "/auth" })}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              {t("back_to_signin")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("auth_email")}</Label>
              <Input
                id="email"
                type="email"
                required
                className="mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              {t("forgot_send")}
            </Button>
            <Link
              to="/auth"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("back_to_signin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
