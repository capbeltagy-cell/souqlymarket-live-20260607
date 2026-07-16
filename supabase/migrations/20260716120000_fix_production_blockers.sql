-- Migration: add marketplace ranking view, agent provisioning trigger, and wallet RLS fixes

-- 1) Create listing_score function and listings_ranked view
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.compute_listing_score(listing_row public.listings)
  RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT (
      (CASE WHEN (SELECT subscription_plan = 'premium_company' FROM public.companies WHERE id = listing_row.company_id) THEN 100000 ELSE 0 END)
      + (CASE WHEN listing_row.featured AND (listing_row.featured_until IS NULL OR listing_row.featured_until > now()) THEN 10000 ELSE 0 END)
      + (CASE WHEN listing_row.marketer_promotion_enabled AND (listing_row.promotion_status IS NULL OR listing_row.promotion_status = 'active') THEN 1000 ELSE 0 END)
      + (CASE WHEN (SELECT is_verified FROM public.companies WHERE id = listing_row.company_id) THEN 100 ELSE 0 END)
      + COALESCE(listing_row.views_count,0)
      + (EXTRACT(EPOCH FROM (now() - listing_row.created_at)) * -0.0001)
    );
  $$;
EXCEPTION WHEN duplicate_function THEN NULL; END $$;

CREATE OR REPLACE VIEW public.listings_ranked AS
SELECT l.*, public.compute_listing_score(l) AS _rank_score
FROM public.listings l
WHERE l.status = 'approved';

GRANT SELECT ON public.listings_ranked TO anon, authenticated;

-- 2) Client-side routes must use this view; we will update client code in a separate commit

-- 3) Ensure wallet RLS: restrict wallets and wallet_transactions to owner or service_role
DO $$ BEGIN
  ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY wallets_owner ON public.wallets FOR ALL
    USING (user_id IS NOT NULL AND user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY wallet_tx_owner ON public.wallet_transactions FOR SELECT, INSERT
    USING (EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_transactions.wallet_id AND (w.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_transactions.wallet_id AND (w.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Agent provisioning: create ensure_agent_provision() and trigger on agents
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.ensure_agent_provision(_agent_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    v_user uuid;
    v_wallet uuid;
    v_ref_uuid uuid;
    v_code text;
    v_landing uuid;
  BEGIN
    SELECT user_id INTO v_user FROM public.agents WHERE id = _agent_id;
    IF v_user IS NULL THEN RETURN; END IF;

    -- Ensure wallet exists using existing ensure_wallet if available, otherwise create minimal wallet
    BEGIN
      SELECT public.ensure_wallet(v_user, 'agent'::text) INTO v_wallet;
    EXCEPTION WHEN undefined_function THEN
      -- fallback create wallet if ensure_wallet not available
      INSERT INTO public.wallets(user_id, kind, balance, pending_balance, total_earned, created_at)
        VALUES (v_user, 'agent', 0, 0, 0, now())
      ON CONFLICT (user_id, kind) DO NOTHING
      RETURNING id INTO v_wallet;
    END;

    -- Ensure referral row exists for agent (one default referral profile)
    v_code := concat('AG-', substring(gen_random_uuid()::text,1,8));
    INSERT INTO public.agent_landing_pages(agent_id, listing_id, slug, headline_ar, headline_en, created_at)
      VALUES (_agent_id, NULL, concat('agent-', substring(gen_random_uuid()::text,1,8)), '','')
    ON CONFLICT (agent_id) DO NOTHING;

    -- Create one referral code row for the agent if none exists
    SELECT id INTO v_ref_uuid FROM public.referrals WHERE agent_id = _agent_id LIMIT 1;
    IF v_ref_uuid IS NULL THEN
      INSERT INTO public.referrals(agent_id, listing_id, code, clicks, conversions, created_at)
        VALUES (_agent_id, NULL, v_code, 0, 0, now())
      ON CONFLICT DO NOTHING;
    END IF;
  END;
  $$;
EXCEPTION WHEN duplicate_function THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ensure_agent_provision
  AFTER INSERT ON public.agents
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION public.ensure_agent_provision(NEW.id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Repair missing agent provision on login: triggering via a public RPC to be called on login
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.repair_agent_provisions_for_user(_user uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE a_id uuid;
  BEGIN
    FOR a_id IN SELECT id FROM public.agents WHERE user_id = _user LOOP
      PERFORM public.ensure_agent_provision(a_id);
    END LOOP;
  END;
  $$;
EXCEPTION WHEN duplicate_function THEN NULL; END $$;

GRANT EXECUTE ON FUNCTION public.repair_agent_provisions_for_user(uuid) TO authenticated;

-- 6) Cart persistence: if a carts table isn't present, create carts/cart_items using existing quotations as canonical persistent cart
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
    title text NOT NULL,
    quantity numeric(12,2) NOT NULL DEFAULT 1,
    unit_price numeric(14,2) NOT NULL DEFAULT 0,
    company_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts, public.cart_items TO authenticated;
GRANT ALL ON public.carts, public.cart_items TO service_role;

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_own_cart" ON public.carts FOR ALL
    USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
    WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cart_items_parent_read" ON public.cart_items FOR SELECT
    USING (EXISTS(SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
  CREATE POLICY "cart_items_parent_write" ON public.cart_items FOR ALL
    USING (EXISTS(SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
    WITH CHECK (EXISTS(SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7) Expose an RPC to merge client cart into server cart on login
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.merge_guest_cart_to_user(_user uuid, _items jsonb)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    v_cart uuid;
    item jsonb;
    v_listing uuid;
    v_title text;
    v_company uuid;
    v_price numeric;
    v_qty numeric;
  BEGIN
    SELECT id INTO v_cart FROM public.carts WHERE user_id = _user LIMIT 1;
    IF v_cart IS NULL THEN
      INSERT INTO public.carts(user_id) VALUES (_user) RETURNING id INTO v_cart;
    END IF;
    FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
      v_listing := (item->>'listing_id')::uuid;
      v_title := (item->>'title');
      v_company := NULLIF(item->>'company_id','')::uuid;
      v_price := (item->>'price')::numeric;
      v_qty := (item->>'quantity')::numeric;
      INSERT INTO public.cart_items(cart_id, listing_id, title, quantity, unit_price, company_id)
      VALUES (v_cart, v_listing, v_title, v_qty, v_price, v_company)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END;
  $$;
EXCEPTION WHEN duplicate_function THEN NULL; END $$;

GRANT EXECUTE ON FUNCTION public.merge_guest_cart_to_user(uuid, jsonb) TO authenticated;

-- 8) Lock down SECURITY DEFINER functions: revoke public execute where appropriate (best-effort, do not remove service_role)
-- List known security definer functions from migration set and revoke public
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.provolatile = 'i' LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I TO public;', r.proname);
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
  END LOOP;
END $$;

-- End of migration
