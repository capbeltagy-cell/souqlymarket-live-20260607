
-- 1. Messages: attachments + voice
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image','file','pdf','voice','system')),
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS order_ref uuid;

-- Allow body to be empty when there is an attachment
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN body SET DEFAULT '';

-- 2. Orders: extend wholesale_orders as canonical order table
ALTER TABLE public.wholesale_orders DROP CONSTRAINT IF EXISTS wholesale_orders_status_check;
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS total_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP',
  ADD COLUMN IF NOT EXISTS unit_price numeric(14,2),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.wholesale_orders ALTER COLUMN listing_id DROP NOT NULL;
ALTER TABLE public.wholesale_orders ALTER COLUMN quantity SET DEFAULT 1;

ALTER TABLE public.wholesale_orders
  ADD CONSTRAINT wholesale_orders_status_check CHECK (
    status IN (
      'draft','new','awaiting_seller','accepted','rejected',
      'packed','shipped','delivered','completed','cancelled','returned','fulfilled'
    )
  );

ALTER TABLE public.wholesale_orders
  ADD CONSTRAINT wholesale_orders_payment_status_check CHECK (
    payment_status IN ('unpaid','pending_approval','held','paid','refunded')
  );

CREATE INDEX IF NOT EXISTS wholesale_orders_buyer_idx ON public.wholesale_orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wholesale_orders_product_idx ON public.wholesale_orders (product_listing_id);

-- Order → notification trigger for buyer
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.buyer_id, 'order', 'تحديث حالة الطلب', 'حالة طلبك الآن: ' || NEW.status, '/orders/' || NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wholesale_orders_status_notify ON public.wholesale_orders;
CREATE TRIGGER wholesale_orders_status_notify
AFTER UPDATE ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

-- 3. User addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  governorate text NOT NULL,
  city text NOT NULL,
  address_line text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own addresses" ON public.user_addresses;
CREATE POLICY "own addresses" ON public.user_addresses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER user_addresses_updated_at BEFORE UPDATE ON public.user_addresses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS user_addresses_user_idx ON public.user_addresses (user_id, is_default DESC);

-- 4. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wholesale_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.wholesale_orders REPLICA IDENTITY FULL;

-- 5. Search: pg_trgm indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS listings_title_ar_trgm ON public.listings USING gin (title_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_title_en_trgm ON public.listings USING gin (title_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS companies_name_ar_trgm ON public.companies USING gin (name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS companies_name_en_trgm ON public.companies USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS wholesale_title_trgm ON public.wholesale_listings USING gin (title gin_trgm_ops);
