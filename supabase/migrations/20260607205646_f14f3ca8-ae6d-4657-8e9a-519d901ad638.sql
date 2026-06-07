
-- Categories
CREATE TABLE public.business_categories (
  slug text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT ALL ON public.business_categories TO service_role;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.business_categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.business_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.business_categories (slug,name_ar,name_en,icon,sort) VALUES
 ('factories','مصانع','Factories','Factory',1),
 ('suppliers','موردين','Suppliers','Truck',2),
 ('services','خدمات','Services','Briefcase',3),
 ('real-estate','عقارات','Real Estate','Building2',4),
 ('lands','أراضي','Lands','LandPlot',5),
 ('industrial-equipment','معدات صناعية','Industrial Equipment','Wrench',6),
 ('construction','مقاولات','Construction','HardHat',7),
 ('agriculture','زراعة','Agriculture','Sprout',8),
 ('logistics','نقل ولوجستيات','Logistics','PackageSearch',9),
 ('marketing','تسويق','Marketing','Megaphone',10);

-- Extra company profile fields
CREATE TABLE public.company_profiles_extra (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  cover_url text,
  whatsapp text,
  website text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  catalog_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  downloads_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_profiles_extra TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_profiles_extra TO authenticated;
GRANT ALL ON public.company_profiles_extra TO service_role;
ALTER TABLE public.company_profiles_extra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile extra public read" ON public.company_profiles_extra FOR SELECT USING (true);
CREATE POLICY "profile extra owner write" ON public.company_profiles_extra FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER company_profiles_extra_updated_at BEFORE UPDATE ON public.company_profiles_extra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Company referrals (distinct from agent referrals)
CREATE TABLE public.company_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  clicks int NOT NULL DEFAULT 0,
  signups int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_referrals TO anon;
GRANT SELECT, INSERT, UPDATE ON public.company_referrals TO authenticated;
GRANT ALL ON public.company_referrals TO service_role;
ALTER TABLE public.company_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company referrals public read" ON public.company_referrals FOR SELECT USING (true);
CREATE POLICY "company referrals owner insert" ON public.company_referrals FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "company referrals owner update" ON public.company_referrals FOR UPDATE TO authenticated USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Extend companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS category_slug text,
  ADD COLUMN IF NOT EXISTS export_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_capacity text;
