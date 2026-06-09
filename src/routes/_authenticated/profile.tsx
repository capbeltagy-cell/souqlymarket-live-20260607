import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Souqly" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  const { user, roles } = useAuth();
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, display_name, phone, bio").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setDisplayName(data.display_name ?? "");
          setPhone(data.phone ?? "");
          setBio(data.bio ?? "");
        }
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, full_name: fullName, display_name: displayName, phone, bio,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(t("profile_updated"));
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <UserIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("profile_title")}</h1>
          </div>
          <form onSubmit={save} className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center text-xl font-bold">
                {(user?.email ?? "?")[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{user?.email}</div>
                <div className="mt-1 flex gap-1.5">
                  {roles.map((r) => <Badge key={r} variant="outline" className="capitalize">{r}</Badge>)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("profile_full_name")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile_phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile_bio")}</Label>
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary-hover">
              {t("profile_save")}
            </Button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
