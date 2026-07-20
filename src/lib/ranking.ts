// Unified marketplace ranking. Higher score = higher priority.
// Priority (desc): premium company → featured (active) → sponsored/promoted (active)
// → verified company → quality (leads_count) → newest.
export type RankableListing = {
  featured?: boolean | null;
  featured_until?: string | null;
  marketer_promotion_enabled?: boolean | null;
  promotion_status?: string | null;
  leads_count?: number | null;
  created_at?: string | null;
  companies?: { is_premium?: boolean | null; is_verified?: boolean | null } | null;
};

export function rankListings<T extends RankableListing>(
  rows: T[],
  nowIso = new Date().toISOString(),
): T[] {
  const score = (l: T) => {
    const premium = l.companies?.is_premium ? 1 : 0;
    const featured = l.featured && (!l.featured_until || l.featured_until > nowIso) ? 1 : 0;
    const promoted =
      l.marketer_promotion_enabled && (l.promotion_status ?? "active") === "active" ? 1 : 0;
    const verified = l.companies?.is_verified ? 1 : 0;
    return premium * 10000 + featured * 1000 + promoted * 100 + verified * 10;
  };
  return [...rows].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    const q = (b.leads_count ?? 0) - (a.leads_count ?? 0);
    if (q !== 0) return q;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}

// Companies ranking: premium → verified → paid subscription → newest.
export type RankableCompany = {
  is_premium?: boolean | null;
  is_verified?: boolean | null;
  subscription_plan?: string | null;
  subscription_expires_at?: string | null;
  created_at?: string | null;
};

export function rankCompanies<T extends RankableCompany>(
  rows: T[],
  nowIso = new Date().toISOString(),
): T[] {
  const score = (c: T) => {
    const premium = c.is_premium ? 1 : 0;
    const verified = c.is_verified ? 1 : 0;
    const paid =
      c.subscription_plan === "paid" &&
      (!c.subscription_expires_at || c.subscription_expires_at > nowIso)
        ? 1
        : 0;
    return premium * 1000 + verified * 100 + paid * 10;
  };
  return [...rows].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}

// Agents ranking: premium → verified → trusted → newest.
export type RankableAgent = {
  is_premium?: boolean | null;
  is_verified?: boolean | null;
  is_trusted?: boolean | null;
  created_at?: string | null;
};

export function rankAgents<T extends RankableAgent>(
  rows: T[],
  nowIso = new Date().toISOString(),
): T[] {
  void nowIso;
  const score = (a: T) => {
    const premium = a.is_premium ? 1 : 0;
    const verified = a.is_verified ? 1 : 0;
    const trusted = a.is_trusted ? 1 : 0;
    return premium * 1000 + verified * 100 + trusted * 10;
  };
  return [...rows].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}
