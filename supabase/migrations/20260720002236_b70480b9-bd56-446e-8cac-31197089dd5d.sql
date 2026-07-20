
-- =========================================
-- STORES SYSTEM MIGRATION
-- =========================================

-- Enum for store status
DO $$ BEGIN
  CREATE TYPE public.store_status AS ENUM ('draft','pending_review','published','suspended','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.store_coupon_type AS ENUM ('percent','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- stores
-- =========================================
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  business_type text,
  logo_url text,
  banner_url text,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  city text,
  governorate text,
  shipping_policy text,
  return_policy text,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  payout_method_id uuid,
  status public.store_status NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  followers_count integer NOT NULL DEFAULT 0,
  products_count integer NOT NULL DEFAULT 0,
  review_avg numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, company_id)
);
CREATE INDEX IF NOT EXISTS stores_status_idx ON public.stores(status);
CREATE INDEX IF NOT EXISTS stores_owner_idx ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS stores_company_idx ON public.stores(company_id);

GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_public_read_published" ON public.stores
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "stores_owner_read" ON public.stores
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "stores_owner_insert" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_owner_update" ON public.stores
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "stores_admin_delete" ON public.stores
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Protect privileged fields on stores (only admin can flip is_verified/is_featured/status→published)
CREATE OR REPLACE FUNCTION public.protect_store_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.is_verified := OLD.is_verified;
    NEW.is_featured := OLD.is_featured;
    NEW.review_avg := OLD.review_avg;
    NEW.review_count := OLD.review_count;
    NEW.followers_count := OLD.followers_count;
    NEW.products_count := OLD.products_count;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    -- owner can only move between draft/pending_review; admin can move to published/suspended/rejected
    IF NEW.status IN ('published','suspended','rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_store_privileged ON public.stores;
CREATE TRIGGER trg_protect_store_privileged
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_store_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_store_privileged_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.is_verified := false;
    NEW.is_featured := false;
    NEW.review_avg := 0;
    NEW.review_count := 0;
    NEW.followers_count := 0;
    NEW.products_count := 0;
    IF NEW.status <> 'draft' AND NEW.status <> 'pending_review' THEN
      NEW.status := 'draft';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_store_privileged_insert ON public.stores;
CREATE TRIGGER trg_protect_store_privileged_insert
BEFORE INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_store_privileged_insert();

DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- store_categories
-- =========================================
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
GRANT SELECT ON public.store_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories TO authenticated;
GRANT ALL ON public.store_categories TO service_role;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_categories_public_read" ON public.store_categories
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status='published'));

CREATE POLICY "store_categories_owner_all" ON public.store_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- =========================================
-- store_coupons
-- =========================================
CREATE TABLE IF NOT EXISTS public.store_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  type public.store_coupon_type NOT NULL,
  value numeric(12,2) NOT NULL CHECK (value > 0),
  min_order numeric(12,2) NOT NULL DEFAULT 0,
  max_discount numeric(12,2),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit_total integer,
  usage_limit_per_user integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_coupons TO authenticated;
GRANT ALL ON public.store_coupons TO service_role;
ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_coupons_owner_all" ON public.store_coupons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

DROP TRIGGER IF EXISTS trg_store_coupons_updated_at ON public.store_coupons;
CREATE TRIGGER trg_store_coupons_updated_at BEFORE UPDATE ON public.store_coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- store_coupon_usage
-- =========================================
CREATE TABLE IF NOT EXISTS public.store_coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.store_coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_coupon_usage_user_idx ON public.store_coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS store_coupon_usage_coupon_idx ON public.store_coupon_usage(coupon_id);
GRANT SELECT, INSERT ON public.store_coupon_usage TO authenticated;
GRANT ALL ON public.store_coupon_usage TO service_role;
ALTER TABLE public.store_coupon_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_coupon_usage_self_read" ON public.store_coupon_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.store_coupons c JOIN public.stores s ON s.id = c.store_id
                    WHERE c.id = coupon_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "store_coupon_usage_self_insert" ON public.store_coupon_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================
-- store_followers
-- =========================================
CREATE TABLE IF NOT EXISTS public.store_followers (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.store_followers TO authenticated;
GRANT ALL ON public.store_followers TO service_role;
ALTER TABLE public.store_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_followers_self_read" ON public.store_followers
  FOR SELECT TO authenticated USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "store_followers_self_insert" ON public.store_followers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "store_followers_self_delete" ON public.store_followers
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================
-- store_reviews
-- =========================================
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  seller_reply text,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id, order_id)
);
GRANT SELECT ON public.store_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_reviews TO authenticated;
GRANT ALL ON public.store_reviews TO service_role;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_reviews_public_read" ON public.store_reviews
  FOR SELECT TO anon, authenticated
  USING (status='published' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.status='published'));
CREATE POLICY "store_reviews_author_insert" ON public.store_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "store_reviews_author_update" ON public.store_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid())
    OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid())
    OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "store_reviews_admin_delete" ON public.store_reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_store_reviews_updated_at ON public.store_reviews;
CREATE TRIGGER trg_store_reviews_updated_at BEFORE UPDATE ON public.store_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- store_staff
-- =========================================
CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_staff TO authenticated;
GRANT ALL ON public.store_staff TO service_role;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_staff_owner_all" ON public.store_staff
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND (s.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin')))
         OR user_id=auth.uid())
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND (s.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- =========================================
-- Extend listings
-- =========================================
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS store_category_id uuid REFERENCES public.store_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visible_in_marketplace boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_in_store boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sale_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS weight_grams integer,
  ADD COLUMN IF NOT EXISTS dimensions jsonb,
  ADD COLUMN IF NOT EXISTS variants jsonb;
CREATE INDEX IF NOT EXISTS listings_store_idx ON public.listings(store_id);

-- =========================================
-- Extend wholesale_orders (used as unified orders table today)
-- =========================================
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS wholesale_orders_idempotency_uidx
  ON public.wholesale_orders(buyer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- =========================================
-- Counters + follow triggers
-- =========================================
CREATE OR REPLACE FUNCTION public.bump_store_followers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.stores SET followers_count = followers_count + 1 WHERE id = NEW.store_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.stores SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.store_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_bump_store_followers ON public.store_followers;
CREATE TRIGGER trg_bump_store_followers
AFTER INSERT OR DELETE ON public.store_followers
FOR EACH ROW EXECUTE FUNCTION public.bump_store_followers();

CREATE OR REPLACE FUNCTION public.recompute_store_review_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_store uuid; v_avg numeric; v_count int;
BEGIN
  v_store := COALESCE(NEW.store_id, OLD.store_id);
  SELECT COALESCE(AVG(rating),0), COUNT(*) INTO v_avg, v_count
    FROM public.store_reviews WHERE store_id = v_store AND status='published';
  UPDATE public.stores SET review_avg = ROUND(v_avg,2), review_count = v_count WHERE id = v_store;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_recompute_store_review_stats ON public.store_reviews;
CREATE TRIGGER trg_recompute_store_review_stats
AFTER INSERT OR UPDATE OR DELETE ON public.store_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_store_review_stats();
