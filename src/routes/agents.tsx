import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentCard } from "@/components/AgentCard";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleAgents } from "@/lib/sampleData";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "Agents — Souqly" }, { name: "description", content: "Top-performing B2B sales agents on Souqly." }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-10">
          <h1 className="text-3xl font-bold">{t("nav_agents")}</h1>
          <p className="text-muted-foreground mt-2">{sampleAgents.length}+ {t("agents_count")}</p>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleAgents.map((a) => <AgentCard key={a.id} a={a} />)}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
