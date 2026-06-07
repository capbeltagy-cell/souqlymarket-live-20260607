import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentCard, type AgentCardData } from "@/components/AgentCard";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "Agents — Souqly" }, { name: "description", content: "Top-performing B2B sales agents on Souqly." }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<AgentCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: agents } = await supabase.from("agents")
        .select("id, user_id, headline_ar, headline_en, country, is_verified")
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      const list = agents ?? [];
      const userIds = list.map((a) => a.user_id).filter(Boolean) as string[];
      const profiles = userIds.length
        ? (await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)).data ?? []
        : [];
      const byId = new Map(profiles.map((p) => [p.id, p]));
      setItems(list.map((a) => ({ ...a, profile: byId.get(a.user_id) ?? null })) as AgentCardData[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-10">
          <h1 className="text-3xl font-bold">{t("nav_agents")}</h1>
          <p className="text-muted-foreground mt-2">{items.length} {t("agents_count")}</p>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-lg font-semibold mb-2">{t("no_agents_yet")}</div>
            <Button asChild className="mt-4 bg-primary hover:bg-primary-hover">
              <Link to="/agent">{t("create_agent")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((a) => <AgentCard key={a.id} a={a} />)}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
