import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Megaphone,
  Wallet,
  Link2,
  Trophy,
  Award,
  Sparkles,
  BarChart3,
  Banknote,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { getMyWallets } from "@/lib/wallets.functions";
import { getMyReferralAnalytics } from "@/lib/crm-analytics.functions";
import { getMyAchievements } from "@/lib/marketing.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/marketing-center")({
  head: () => ({
    meta: [
      { title: "Marketing Center — مركز التسويق" },
      {
        name: "description",
        content: "Manage campaigns, referrals, earnings, payouts, and AI tools.",
      },
    ],
  }),
  component: MarketingCenter,
});

function MarketingCenter() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fWallets = useServerFn(getMyWallets);
  const fAnalytics = useServerFn(getMyReferralAnalytics);
  const fAch = useServerFn(getMyAchievements);
  const [wallet, setWallet] = useState<any>(null);
  const [an, setAn] = useState<any>(null);
  const [ach, setAch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    Promise.all([fWallets(), fAnalytics(), fAch()])
      .then(([walletsResult, analyticsResult, achievementsResult]) => {
        if (!active) return;
        setWallet(
          walletsResult.wallets.find((item: any) => item.kind === "agent") ??
            walletsResult.wallets[0] ??
            null,
        );
        setAn(analyticsResult);
        setAch(achievementsResult.achievements);
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-2">
        <SiteHeader />
        <div className="container-souqly py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          <p className="mt-3">جارٍ تحميل بيانات التسويق…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface-2">
        <SiteHeader />
        <div className="container-souqly py-16 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
          <p className="mt-3 text-muted-foreground">تعذر تحميل بيانات مركز التسويق.</p>
          <Button className="mt-4" variant="outline" onClick={() => setRetryKey((key) => key + 1)}>
            <RefreshCw className="me-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">{ar ? "مركز التسويق" : "Marketing Center"}</h1>
          </div>
          <p className="text-muted-foreground">
            {ar
              ? "أدر حملاتك، روابط الإحالة، أرباحك، وأدوات الذكاء الاصطناعي في مكان واحد."
              : "Manage your campaigns, referral links, earnings, and AI tools in one place."}
          </p>
        </div>

        {/* Wallet summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            icon={Wallet}
            label={ar ? "الرصيد المتاح" : "Available"}
            value={formatPrice(Number(wallet?.balance ?? 0), locale, { showZero: true })}
          />
          <Stat
            icon={Clock}
            label={ar ? "رصيد معلق" : "Pending"}
            value={formatPrice(Number(wallet?.pending_balance ?? 0), locale, { showZero: true })}
          />
          <Stat
            icon={TrendingUp}
            label={ar ? "إجمالي الأرباح" : "Total earned"}
            value={formatPrice(Number(wallet?.total_earned ?? 0), locale, { showZero: true })}
          />
          <Stat
            icon={Target}
            label={ar ? "التحويلات" : "Conversions"}
            value={String(an?.conversions ?? 0)}
          />
        </div>

        {/* Modules grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModuleCard
            to="/campaigns"
            icon={Megaphone}
            title={ar ? "الحملات" : "Campaigns"}
            desc={ar ? "أنشئ وأدر حملاتك التسويقية" : "Create and manage marketing campaigns"}
          />
          <ModuleCard
            to="/referrals"
            icon={Link2}
            title={ar ? "روابط الإحالة و QR" : "Referral links & QR"}
            desc={ar ? "شارك روابط وأكواد QR واكسب" : "Share links, QR codes and earn"}
          />
          <ModuleCard
            to="/agent-performance"
            icon={BarChart3}
            title={ar ? "التحليلات" : "Analytics"}
            desc={ar ? "أداء الحملات والنقرات والتحويلات" : "Campaigns, clicks, conversions"}
          />
          <ModuleCard
            to="/wallet"
            icon={Wallet}
            title={ar ? "المحفظة" : "Wallet"}
            desc={ar ? "الرصيد والمعاملات" : "Balance and transactions"}
          />
          <ModuleCard
            to="/payouts"
            icon={Banknote}
            title={ar ? "السحوبات" : "Withdrawals"}
            desc={ar ? "طلبات السحب وطرق الدفع" : "Withdrawal requests & payout methods"}
          />
          <ModuleCard
            to="/commissions"
            icon={DollarSign}
            title={ar ? "العمولات" : "Commissions"}
            desc={ar ? "عمولاتك من كل الحملات" : "All your commissions"}
          />
          <ModuleCard
            to="/leaderboard"
            icon={Trophy}
            title={ar ? "المتصدرون" : "Leaderboard"}
            desc={ar ? "أفضل المسوقين" : "Top marketers"}
          />
          <ModuleCard
            to="/achievements"
            icon={Award}
            title={ar ? "الإنجازات" : `Achievements (${ach.length})`}
            desc={ar ? "شاراتك ومكافآتك" : "Your badges and rewards"}
          />
          <ModuleCard
            to="/ai-tools"
            icon={Sparkles}
            title={ar ? "أدوات الذكاء الاصطناعي" : "AI Tools"}
            desc={ar ? "مولد إعلانات ومنشورات وترويج" : "Ad, social, promo generators"}
          />
        </div>

        {ach.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{ar ? "أحدث الإنجازات" : "Latest achievements"}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {ach.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-xl">{a.icon ?? "🏅"}</span>
                  <div className="text-sm">
                    <div className="font-medium">{ar ? a.title_ar : a.title_en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function ModuleCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-card p-5 shadow-card hover:shadow-md hover:border-primary/40 transition group"
    >
      <Icon className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition" />
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </Link>
  );
}
