import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rankListings, rankCompanies, rankAgents } from "@/lib/ranking";

function sanitize(q: string) {
  // Strip characters that break PostgREST `or=` filters: commas, parens, percent.
  return q.replace(/[,()%*]/g, " ").trim();
}

const Input = z
  .object({
    q: z.string().min(1).max(120),
    limit: z.number().int().min(1).max(20).default(8),
  })
  .transform((d) => ({ ...d, q: sanitize(d.q) }));

export const globalSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.q;
    if (!q) return empty();
    const like = `%${q}%`;
    const lim = data.limit;

    const [companiesR, listingsR, factoriesR, wholesaleR, rfqsR, tendersR, agentsR] = await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("id, name_ar, name_en, industry, city, governorate, is_verified, is_premium, subscription_plan, subscription_expires_at, created_at, logo_url")
        .or(`name_ar.ilike.${like},name_en.ilike.${like},industry.ilike.${like}`)
        .limit(lim * 2),
      supabaseAdmin
        .from("listings")
        .select("id, type, title_ar, title_en, price, currency, city, governorate, images, featured, featured_until, marketer_promotion_enabled, promotion_status, leads_count, created_at, status, companies(is_premium, is_verified)")
        .eq("status", "approved")
        .or(`title_ar.ilike.${like},title_en.ilike.${like},description_ar.ilike.${like},description_en.ilike.${like}`)
        .limit(lim * 4),
      supabaseAdmin
        .from("factories")
        .select("company_id, production_capacity, export_available, verified, companies(name_ar, name_en, governorate, city, industry)")
        .or(`production_capacity.ilike.${like}`)
        .limit(lim),
      supabaseAdmin
        .from("wholesale_listings")
        .select("id, title, description, governorate, price_per_unit, currency, moq, images, active")
        .eq("active", true)
        .or(`title.ilike.${like},description.ilike.${like}`)
        .limit(lim),
      supabaseAdmin
        .from("rfqs")
        .select("id, title, description, governorate, quantity, unit, budget_min, budget_max, currency, status")
        .or(`title.ilike.${like},description.ilike.${like}`)
        .limit(lim),
      supabaseAdmin
        .from("tenders")
        .select("id, title, description, governorate, budget, currency, deadline, status")
        .or(`title.ilike.${like},description.ilike.${like}`)
        .limit(lim),
      supabaseAdmin
        .from("agents")
        .select("id, user_id, headline_ar, headline_en, city, country, is_verified, is_premium, is_trusted, created_at")
        .or(`headline_ar.ilike.${like},headline_en.ilike.${like},bio_ar.ilike.${like},bio_en.ilike.${like}`)
        .limit(lim * 2),
    ]);

    // Resolve factories from company match too (industry/name)
    const factoryByCompanyR = await supabaseAdmin
      .from("factories")
      .select("company_id, production_capacity, export_available, verified, companies!inner(name_ar, name_en, governorate, city, industry)")
      .or(`name_ar.ilike.${like},name_en.ilike.${like},industry.ilike.${like}`, { foreignTable: "companies" })
      .limit(lim);

    const allFactories = [...(factoriesR.data ?? []), ...(factoryByCompanyR.data ?? [])];
    const seenFactory = new Set<string>();
    const factories = allFactories.filter((f: any) => {
      if (seenFactory.has(f.company_id)) return false;
      seenFactory.add(f.company_id);
      return true;
    }).slice(0, lim);

    const all = rankListings((listingsR.data ?? []) as any[]);
    const byType = (t: string) => all.filter((l) => l.type === t).slice(0, lim);

    // Agent display names from profiles
    const userIds = (agentsR.data ?? []).map((a: any) => a.user_id).filter(Boolean);
    const profilesR = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, display_name, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const pMap = new Map((profilesR.data ?? []).map((p: any) => [p.id, p]));
    const agents = rankAgents((agentsR.data ?? []) as any[]).map((a: any) => ({ ...a, profile: pMap.get(a.user_id) ?? null })).slice(0, lim);

    const companies = rankCompanies((companiesR.data ?? []) as any[]).slice(0, lim);

    return {
      query: q,
      companies,
      products: byType("product"),
      services: byType("service"),
      real_estate: byType("real_estate"),
      lands: byType("land"),
      factories,
      wholesale: (wholesaleR.data ?? []) as any[],
      rfqs: (rfqsR.data ?? []) as any[],
      tenders: (tendersR.data ?? []) as any[],
      agents,
    };
  });

function empty() {
  return {
    query: "",
    companies: [], products: [], services: [], real_estate: [], lands: [],
    factories: [], wholesale: [], rfqs: [], tenders: [], agents: [],
  };
}
