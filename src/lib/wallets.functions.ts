import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { wallets: data ?? [] };
  });

export const listMyWalletTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ walletId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", data.walletId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { transactions: rows ?? [] };
  });

export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { invoices: data ?? [] };
  });

export const getAdminRevenueSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admins only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [payments, commissions, platformWallet, activeSubs] = await Promise.all([
      supabaseAdmin.from("payments").select("amount, purpose, status, created_at").eq("status", "paid"),
      supabaseAdmin.from("commissions").select("amount, status, created_at"),
      supabaseAdmin.from("wallets").select("balance, total_earned").eq("kind", "platform").maybeSingle(),
      supabaseAdmin.from("subscriptions").select("plan, user_id, is_active").eq("is_active", true),
    ]);

    const paid = payments.data ?? [];
    const sumBy = (purpose: string) =>
      paid.filter((p) => p.purpose === purpose).reduce((a, b) => a + Number(b.amount), 0);

    const totalCommissions = (commissions.data ?? []).reduce((a, b) => a + Number(b.amount), 0);
    const paidCommissions = (commissions.data ?? []).filter((c) => c.status === "paid").reduce((a, b) => a + Number(b.amount), 0);

    return {
      subscriptionRevenue: sumBy("subscription"),
      featuredRevenue: sumBy("featured_listing"),
      otherRevenue: sumBy("other"),
      totalPaymentsRevenue: paid.reduce((a, b) => a + Number(b.amount), 0),
      commissionRevenue: Number(platformWallet.data?.total_earned ?? 0),
      platformBalance: Number(platformWallet.data?.balance ?? 0),
      totalCommissionsBooked: totalCommissions,
      paidCommissions,
      activeSubscriptions: activeSubs.data?.length ?? 0,
      subsByPlan: (activeSubs.data ?? []).reduce<Record<string, number>>((acc, s) => {
        acc[s.plan] = (acc[s.plan] ?? 0) + 1; return acc;
      }, {}),
    };
  });
