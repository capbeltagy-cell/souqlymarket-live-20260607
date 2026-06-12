GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_landing_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_profiles_extra TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tender_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_orders TO authenticated;

GRANT ALL ON public.agent_applications, public.agent_landing_pages, public.agents,
  public.business_categories, public.commissions, public.companies, public.company_profiles_extra,
  public.company_referrals, public.factories, public.favorites, public.invoices, public.leads,
  public.listings, public.payments, public.profiles, public.referrals, public.rfq_offers,
  public.rfqs, public.subscriptions, public.tender_proposals, public.tenders, public.user_roles,
  public.wallet_transactions, public.wallets, public.wholesale_listings, public.wholesale_orders
  TO service_role;

GRANT SELECT ON public.companies TO anon;
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.agents TO anon;
GRANT SELECT ON public.factories TO anon;
GRANT SELECT ON public.tenders TO anon;
GRANT SELECT ON public.rfqs TO anon;
GRANT SELECT ON public.wholesale_listings TO anon;
GRANT SELECT ON public.business_categories TO anon;
GRANT SELECT ON public.company_profiles_extra TO anon;
GRANT SELECT ON public.agent_landing_pages TO anon;
GRANT INSERT ON public.leads TO anon;