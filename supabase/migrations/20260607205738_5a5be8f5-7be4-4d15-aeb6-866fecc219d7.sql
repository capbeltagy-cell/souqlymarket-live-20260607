
-- RFQs
CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category_slug text REFERENCES public.business_categories(slug),
  quantity int,
  unit text,
  budget_min numeric,
  budget_max numeric,
  currency text NOT NULL DEFAULT 'EGP',
  governorate text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','awarded')),
  winner_offer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rfqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT ALL ON public.rfqs TO service_role;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfqs public read" ON public.rfqs FOR SELECT USING (true);
CREATE POLICY "rfqs buyer insert" ON public.rfqs FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "rfqs buyer update" ON public.rfqs FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rfqs buyer delete" ON public.rfqs FOR DELETE TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER rfqs_updated_at BEFORE UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.rfq_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  lead_time_days int,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_offers TO authenticated;
GRANT ALL ON public.rfq_offers TO service_role;
ALTER TABLE public.rfq_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfq_offers read by stakeholders" ON public.rfq_offers FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = auth.uid())
  OR EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "rfq_offers company insert" ON public.rfq_offers FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
);
CREATE POLICY "rfq_offers update by stakeholders" ON public.rfq_offers FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = auth.uid())
  OR EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER rfq_offers_updated_at BEFORE UPDATE ON public.rfq_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Wholesale
CREATE TABLE public.wholesale_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_slug text REFERENCES public.business_categories(slug),
  moq int NOT NULL DEFAULT 1,
  price_per_unit numeric,
  currency text NOT NULL DEFAULT 'EGP',
  governorate text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wholesale_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wholesale_listings TO authenticated;
GRANT ALL ON public.wholesale_listings TO service_role;
ALTER TABLE public.wholesale_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wholesale public read" ON public.wholesale_listings FOR SELECT USING (true);
CREATE POLICY "wholesale owner write" ON public.wholesale_listings FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER wholesale_listings_updated_at BEFORE UPDATE ON public.wholesale_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.wholesale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.wholesale_listings(id) ON DELETE CASCADE,
  quantity int NOT NULL,
  notes text,
  contact_phone text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','rejected','fulfilled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wholesale_orders TO authenticated;
GRANT ALL ON public.wholesale_orders TO service_role;
ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wholesale_orders stakeholders read" ON public.wholesale_orders FOR SELECT TO authenticated USING (
  buyer_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.wholesale_listings wl JOIN public.companies c ON c.id = wl.company_id WHERE wl.id = listing_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "wholesale_orders buyer insert" ON public.wholesale_orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "wholesale_orders company update" ON public.wholesale_orders FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM public.wholesale_listings wl JOIN public.companies c ON c.id = wl.company_id WHERE wl.id = listing_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER wholesale_orders_updated_at BEFORE UPDATE ON public.wholesale_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Factories
CREATE TABLE public.factories (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  production_capacity text,
  employees_range text,
  export_available boolean NOT NULL DEFAULT false,
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.factories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.factories TO authenticated;
GRANT ALL ON public.factories TO service_role;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factories public read" ON public.factories FOR SELECT USING (true);
CREATE POLICY "factories owner write" ON public.factories FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tenders
CREATE TABLE public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category_slug text REFERENCES public.business_categories(slug),
  governorate text,
  budget numeric,
  currency text NOT NULL DEFAULT 'EGP',
  deadline date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','awarded')),
  winner_proposal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenders TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenders TO authenticated;
GRANT ALL ON public.tenders TO service_role;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenders public read" ON public.tenders FOR SELECT USING (true);
CREATE POLICY "tenders publisher insert" ON public.tenders FOR INSERT TO authenticated WITH CHECK (publisher_id = auth.uid());
CREATE POLICY "tenders publisher update" ON public.tenders FOR UPDATE TO authenticated USING (publisher_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenders publisher delete" ON public.tenders FOR DELETE TO authenticated USING (publisher_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tenders_updated_at BEFORE UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.tender_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  timeline_days int,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tender_proposals TO authenticated;
GRANT ALL ON public.tender_proposals TO service_role;
ALTER TABLE public.tender_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tender_proposals stakeholders read" ON public.tender_proposals FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.publisher_id = auth.uid())
  OR EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "tender_proposals company insert" ON public.tender_proposals FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
);
CREATE POLICY "tender_proposals stakeholders update" ON public.tender_proposals FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.publisher_id = auth.uid())
  OR EXISTS(SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER tender_proposals_updated_at BEFORE UPDATE ON public.tender_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
