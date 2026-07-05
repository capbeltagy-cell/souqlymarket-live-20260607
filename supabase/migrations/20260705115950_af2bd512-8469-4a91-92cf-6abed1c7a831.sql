
-- ============================================================
-- 1. AGENTS: prevent self-grant of trust/premium/subscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_agent_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := OLD.is_verified;
    NEW.is_trusted := OLD.is_trusted;
    NEW.is_premium := OLD.is_premium;
    NEW.subscription_plan := OLD.subscription_plan;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_agent_privileged ON public.agents;
CREATE TRIGGER trg_protect_agent_privileged
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_agent_privileged_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := false;
    NEW.is_trusted := false;
    NEW.is_premium := false;
    NEW.subscription_plan := 'free';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_agent_privileged_insert ON public.agents;
CREATE TRIGGER trg_protect_agent_privileged_insert
  BEFORE INSERT ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_privileged_insert();

-- ============================================================
-- 2. COMPANIES: prevent self-grant of verified/premium/subscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_company_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := OLD.is_verified;
    NEW.is_premium := OLD.is_premium;
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.subscription_updated_at := OLD.subscription_updated_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_company_privileged ON public.companies;
CREATE TRIGGER trg_protect_company_privileged
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_company_privileged_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := false;
    NEW.is_premium := false;
    NEW.subscription_plan := 'free';
    NEW.subscription_expires_at := NULL;
    NEW.subscription_updated_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_company_privileged_insert ON public.companies;
CREATE TRIGGER trg_protect_company_privileged_insert
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_privileged_insert();

-- ============================================================
-- 3. LISTINGS: prevent self-feature / stat tampering
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_listing_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.featured := OLD.featured;
    NEW.featured_until := OLD.featured_until;
    NEW.views_count := OLD.views_count;
    NEW.clicks_count := OLD.clicks_count;
    NEW.leads_count := OLD.leads_count;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_listing_privileged ON public.listings;
CREATE TRIGGER trg_protect_listing_privileged
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_listing_privileged_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.featured := false;
    NEW.featured_until := NULL;
    NEW.views_count := 0;
    NEW.clicks_count := 0;
    NEW.leads_count := 0;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_listing_privileged_insert ON public.listings;
CREATE TRIGGER trg_protect_listing_privileged_insert
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_privileged_insert();

-- ============================================================
-- 4. COMMISSIONS: prevent self-settle / delete by company owners
-- ============================================================
DROP POLICY IF EXISTS "Company manages commissions" ON public.commissions;

CREATE POLICY "Company inserts commissions" ON public.commissions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = commissions.company_id AND c.owner_id = auth.uid()
  ));

CREATE POLICY "Company updates own commissions" ON public.commissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = commissions.company_id AND c.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = commissions.company_id AND c.owner_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.protect_commission_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.paid_at := NULL;
    NEW.payout_requested_at := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'paid' THEN
      RAISE EXCEPTION 'Only admins can mark commissions as paid';
    END IF;
    NEW.amount := OLD.amount;
    NEW.currency := OLD.currency;
    NEW.agent_id := OLD.agent_id;
    NEW.company_id := OLD.company_id;
    NEW.paid_at := OLD.paid_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_commission_privileged ON public.commissions;
CREATE TRIGGER trg_protect_commission_privileged
  BEFORE INSERT OR UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_commission_privileged_fields();

-- ============================================================
-- 5. TENDERS: scope read to open OR publisher OR admin
-- ============================================================
DROP POLICY IF EXISTS "tenders authenticated read" ON public.tenders;
CREATE POLICY "tenders scoped read" ON public.tenders
  FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR publisher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
