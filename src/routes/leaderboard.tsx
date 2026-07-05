import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, Medal } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { getLeaderboard } from "@/lib/marketing.functions";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Marketer Leaderboard — Souqly" },
      { name: "description", content: "Top marketers on Souqly by earnings and deals closed." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchIt = useServerFn(getLeaderboard);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetchIt().then((r) => setRows(r.leaders)); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 max-w-4xl">
        <div className="flex items-center gap-2 mb-6"><Trophy className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">{ar ? "لوحة المتصدرين" : "Leaderboard"}</h1></div>
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">…</div> :
           <div className="divide-y divide-border">
             {rows.map((r, i) => (
               <div key={r.agent_id} className="p-4 flex items-center gap-4">
                 <div className="w-10 text-center">
                   {i === 0 ? <Medal className="h-6 w-6 text-yellow-500 mx-auto" /> :
                    i === 1 ? <Medal className="h-6 w-6 text-slate-400 mx-auto" /> :
                    i === 2 ? <Medal className="h-6 w-6 text-orange-600 mx-auto" /> :
                    <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>}
                 </div>
                 {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-primary/10" />}
                 <div className="flex-1 min-w-0">
                   <div className="font-medium truncate">{r.name}</div>
                   <div className="text-xs text-muted-foreground">{r.deals_closed} {ar ? "صفقة" : "deals"} · {r.achievements_count} {ar ? "إنجازات" : "badges"}</div>
                 </div>
                 <div className="text-primary font-bold">{formatPrice(Number(r.total_earned), locale, { showZero: true })}</div>
               </div>
             ))}
           </div>
          }
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
