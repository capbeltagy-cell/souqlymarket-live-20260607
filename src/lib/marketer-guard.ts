// Server-side guard: pure marketers (role=agent, not company/admin) MUST NOT
// create or publish business content. Called at the top of every write
// serverFn that produces companies, factories, listings, RFQs, tenders,
// wholesale, or quotations. Complements the RLS restrictive policies.

export async function assertNotPureMarketer(
  supabase: {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => Promise<{ data: Array<{ role: string }> | null; error: unknown }>;
      };
    };
  },
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Role lookup failed");
  const roles = (data ?? []).map((r) => r.role);
  const isPureAgent =
    roles.includes("agent") && !roles.includes("company") && !roles.includes("admin");
  if (isPureAgent) {
    throw new Error("MARKETER_FORBIDDEN: Marketers cannot publish or create business content.");
  }
}
