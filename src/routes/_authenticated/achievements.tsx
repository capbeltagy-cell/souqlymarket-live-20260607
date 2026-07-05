import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Award } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyAchievements } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [{ title: "Achievements — Marketing Center" }] }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchIt = useServerFn(getMyAchievements);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetchIt().then((r) => setRows(r.achievements)); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="flex items-center gap-2 mb-6"><Award className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">{ar ? "الإنجازات والشارات" : "Achievements & badges"}</h1></div>
        {rows.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">{ar ? "لا توجد شارات بعد. أكمل صفقاتك لكسبها!" : "No badges yet. Close deals to unlock them!"}</div> :
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
           {rows.map((a) => (
             <div key={a.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
               <div className="text-4xl mb-2">{a.icon ?? "🏅"}</div>
               <div className="font-semibold">{ar ? a.title_ar : a.title_en}</div>
               <div className="text-xs text-muted-foreground mt-1">{ar ? a.description_ar : a.description_en}</div>
               <div className="text-[10px] text-muted-foreground mt-2">{new Date(a.earned_at).toLocaleDateString()}</div>
             </div>
           ))}
         </div>
        }
      </div>
      <SiteFooter />
    </div>
  );
}
