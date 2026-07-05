
-- ============ QUOTATIONS ============
DO $$ BEGIN
  CREATE TYPE public.quotation_status AS ENUM ('draft','sent','accepted','rejected','expired','cancelled','converted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  seller_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'EGP',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  shipping numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  expiry_date date,
  notes text,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  title text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotations_participants_read" ON public.quotations
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "quotations_seller_write" ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "quotations_participants_update" ON public.quotations
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "quotations_admin_delete" ON public.quotations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR auth.uid() = seller_id);

CREATE POLICY "quotation_items_read" ON public.quotation_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id AND (q.buyer_id = auth.uid() OR q.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "quotation_items_seller_write" ON public.quotation_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Notify buyer on new quotation
CREATE OR REPLACE FUNCTION public.on_quotation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.status='sent' THEN
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (NEW.buyer_id,'quotation','عرض سعر جديد','وصلك عرض سعر بقيمة '||NEW.total||' '||NEW.currency,'/quotations/'||NEW.id::text);
  ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='sent' THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (NEW.buyer_id,'quotation','عرض سعر جديد','وصلك عرض سعر بقيمة '||NEW.total||' '||NEW.currency,'/quotations/'||NEW.id::text);
    ELSIF NEW.status IN ('accepted','rejected') THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (NEW.seller_id,'quotation','تحديث عرض السعر','تم '||CASE WHEN NEW.status='accepted' THEN 'قبول' ELSE 'رفض' END||' عرض السعر','/quotations/'||NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_on_quotation_change AFTER INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.on_quotation_change();

-- ============ PAYMENT METHODS (admin-configurable) ============
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  instructions_ar text,
  instructions_en text,
  account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_read_active" ON public.payment_methods FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pm_admin_write" ON public.payment_methods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pm_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed common methods (inactive by default until admin fills account details)
INSERT INTO public.payment_methods (code,name_ar,name_en,instructions_ar,is_active,sort_order,icon) VALUES
  ('vodafone_cash','فودافون كاش','Vodafone Cash','حول المبلغ إلى الرقم أدناه ثم ارفع صورة الإيصال',false,10,'📱'),
  ('instapay','إنستا باي','InstaPay','حول عبر إنستا باي إلى العنوان أدناه ثم ارفع صورة الإيصال',false,20,'💳'),
  ('bank_transfer','تحويل بنكي','Bank Transfer','حول إلى الحساب البنكي أدناه ثم ارفع صورة الإيصال',false,30,'🏦'),
  ('usdt_trc20','USDT (TRC20)','USDT TRC20','أرسل USDT إلى المحفظة أدناه (شبكة TRC20)',false,40,'₮'),
  ('bybit','Bybit','Bybit','حول عبر Bybit UID أدناه ثم ارفع لقطة الشاشة',false,50,'🅑'),
  ('cash','كاش عند الاستلام','Cash on Delivery','ادفع نقدًا للمندوب عند التسليم',false,60,'💵')
ON CONFLICT (code) DO NOTHING;

-- ============ PAYMENT PROOFS ============
DO $$ BEGIN
  CREATE TYPE public.payment_proof_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wholesale_orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid,
  payment_method_id uuid REFERENCES public.payment_methods(id),
  payment_method_code text,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  proof_url text,
  reference text,
  note text,
  status public.payment_proof_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO service_role;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_buyer_read" ON public.payment_proofs FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pp_buyer_insert" ON public.payment_proofs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "pp_admin_update" ON public.payment_proofs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_pp_updated_at BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Approving a proof marks the order paid + confirmed (escrow held) and notifies parties.
CREATE OR REPLACE FUNCTION public.on_payment_proof_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_order public.wholesale_orders%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT * INTO v_order FROM public.wholesale_orders WHERE id = NEW.order_id;
    IF NEW.status='approved' THEN
      UPDATE public.wholesale_orders
        SET payment_status='paid', paid_at=now(),
            status = CASE WHEN status IN ('awaiting_seller','draft','pending_buyer') THEN 'accepted' ELSE status END,
            confirmed_at = COALESCE(confirmed_at, now())
        WHERE id = NEW.order_id;
      INSERT INTO public.notifications(user_id,type,title,body,link) VALUES
        (v_order.buyer_id,'payment','تم تأكيد الدفع','تم اعتماد الدفع لطلبك','/orders/'||v_order.id::text);
      IF NEW.seller_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id,type,title,body,link) VALUES
          (NEW.seller_id,'payment','تم استلام الدفع','الدفع محفوظ لدى المنصة حتى تأكيد الاستلام','/orders/'||v_order.id::text);
      END IF;
    ELSIF NEW.status='rejected' THEN
      UPDATE public.wholesale_orders SET payment_status='rejected' WHERE id = NEW.order_id;
      INSERT INTO public.notifications(user_id,type,title,body,link) VALUES
        (v_order.buyer_id,'payment','تم رفض إثبات الدفع', COALESCE(NEW.review_note,'يرجى إعادة رفع إثبات الدفع'),'/orders/'||v_order.id::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_on_payment_proof_review AFTER UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_proof_review();

-- ============ ORDER EXTENSIONS ============
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- ============ ESCROW RELEASE on order completion ============
CREATE OR REPLACE FUNCTION public.release_order_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE
  v_seller uuid;
  v_seller_wallet uuid;
  v_platform_wallet uuid;
  v_platform_cut numeric(14,2);
  v_seller_cut numeric(14,2);
  v_amount numeric(14,2);
BEGIN
  IF NEW.status='completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.payment_status='paid' THEN
    v_amount := COALESCE(NEW.total_amount, 0);
    IF v_amount <= 0 THEN RETURN NEW; END IF;

    -- Resolve seller owner via listings/wholesale_listings
    SELECT c.owner_id INTO v_seller
      FROM public.listings l JOIN public.companies c ON c.id = l.company_id
      WHERE l.id = COALESCE(NEW.product_listing_id, NEW.listing_id);
    IF v_seller IS NULL THEN
      SELECT c.owner_id INTO v_seller
        FROM public.wholesale_listings wl JOIN public.companies c ON c.id = wl.company_id
        WHERE wl.id = COALESCE(NEW.listing_id, NEW.product_listing_id);
    END IF;
    IF v_seller IS NULL THEN RETURN NEW; END IF;

    v_platform_cut := round(v_amount * 0.05, 2); -- 5% platform on orders
    v_seller_cut := v_amount - v_platform_cut;

    v_seller_wallet := public.ensure_wallet(v_seller, 'company'::wallet_kind);
    v_platform_wallet := public.ensure_wallet(NULL, 'platform'::wallet_kind);

    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_seller_wallet, v_seller_cut, COALESCE(NEW.currency,'EGP'), 'order', NEW.id, 'order', 'Escrow release');
    UPDATE public.wallets SET balance = balance + v_seller_cut, total_earned = total_earned + v_seller_cut WHERE id = v_seller_wallet;

    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_platform_wallet, v_platform_cut, COALESCE(NEW.currency,'EGP'), 'order', NEW.id, 'order', 'Platform 5% cut');
    UPDATE public.wallets SET balance = balance + v_platform_cut, total_earned = total_earned + v_platform_cut WHERE id = v_platform_wallet;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_release_order_escrow ON public.wholesale_orders;
CREATE TRIGGER trg_release_order_escrow AFTER UPDATE ON public.wholesale_orders
  FOR EACH ROW EXECUTE FUNCTION public.release_order_escrow();

-- ============ TRUST SCORE VIEW ============
CREATE OR REPLACE VIEW public.companies_trust AS
SELECT
  c.id AS company_id,
  c.name_ar, c.name_en, c.is_verified, c.is_premium,
  COALESCE((SELECT count(*) FROM public.wholesale_orders wo
     WHERE wo.status = 'completed'
       AND (wo.product_listing_id IN (SELECT id FROM public.listings WHERE company_id = c.id)
         OR wo.listing_id IN (SELECT id FROM public.wholesale_listings WHERE company_id = c.id))
  ), 0) AS completed_orders,
  COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.reviews r WHERE r.company_id = c.id), 0) AS avg_rating,
  COALESCE((SELECT count(*) FROM public.reviews r WHERE r.company_id = c.id), 0) AS reviews_count,
  LEAST(100, (
    (CASE WHEN c.is_verified THEN 25 ELSE 0 END) +
    (CASE WHEN c.is_premium THEN 10 ELSE 0 END) +
    LEAST(30, COALESCE((SELECT count(*) FROM public.wholesale_orders wo
        WHERE wo.status='completed'
          AND (wo.product_listing_id IN (SELECT id FROM public.listings WHERE company_id = c.id)
            OR wo.listing_id IN (SELECT id FROM public.wholesale_listings WHERE company_id = c.id))
      ), 0) * 2) +
    (COALESCE((SELECT round(avg(rating)*7)::int FROM public.reviews r WHERE r.company_id = c.id), 0))
  )) AS trust_score
FROM public.companies c;

GRANT SELECT ON public.companies_trust TO anon, authenticated;
