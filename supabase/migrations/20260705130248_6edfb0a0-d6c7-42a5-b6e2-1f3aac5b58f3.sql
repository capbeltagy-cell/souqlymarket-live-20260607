
-- Enums
DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('draft','active','paused','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('pending','approved','rejected','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ agent_campaigns ============
CREATE TABLE IF NOT EXISTS public.agent_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  target_url text,
  start_at timestamptz,
  end_at timestamptz,
  budget numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_campaigns_agent_idx ON public.agent_campaigns(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_campaigns_status_idx ON public.agent_campaigns(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_campaigns TO authenticated;
GRANT SELECT ON public.agent_campaigns TO anon;
GRANT ALL ON public.agent_campaigns TO service_role;
ALTER TABLE public.agent_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaigns public read active" ON public.agent_campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Agent manages own campaigns" ON public.agent_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_campaigns.agent_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_campaigns.agent_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins manage campaigns" ON public.agent_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_agent_campaigns_updated BEFORE UPDATE ON public.agent_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Link referrals -> campaigns
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.agent_campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS referrals_campaign_idx ON public.referrals(campaign_id);

-- ============ payout_methods ============
CREATE TABLE IF NOT EXISTS public.payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payout_methods_user_idx ON public.payout_methods(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_methods TO authenticated;
GRANT ALL ON public.payout_methods TO service_role;
ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payout methods" ON public.payout_methods FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all payout methods" ON public.payout_methods FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payout_methods_updated BEFORE UPDATE ON public.payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ payout_requests ============
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EGP',
  status public.payout_status NOT NULL DEFAULT 'pending',
  payout_method_id uuid REFERENCES public.payout_methods(id) ON DELETE SET NULL,
  notes text,
  admin_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payout_requests_user_idx ON public.payout_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON public.payout_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payouts" ON public.payout_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own payouts" ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own pending payouts" ON public.payout_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));
CREATE POLICY "Admins manage payouts" ON public.payout_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payout_requests_updated BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: hold amount on create, refund on cancel/reject, debit on paid
CREATE OR REPLACE FUNCTION public.payout_wallet_flow()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avail numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT balance INTO v_avail FROM public.wallets WHERE id = NEW.wallet_id;
    IF v_avail IS NULL OR v_avail < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE public.wallets
      SET balance = balance - NEW.amount,
          pending_balance = pending_balance + NEW.amount
      WHERE id = NEW.wallet_id;
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (NEW.wallet_id, 0, NEW.currency, 'payout', NEW.id, 'payout_request', 'Payout requested - held');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status IN ('rejected','cancelled') AND OLD.status IN ('pending','approved') THEN
      UPDATE public.wallets
        SET balance = balance + OLD.amount,
            pending_balance = GREATEST(pending_balance - OLD.amount, 0)
        WHERE id = OLD.wallet_id;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (OLD.wallet_id, OLD.amount, OLD.currency, 'payout', OLD.id, 'payout_request', 'Payout ' || NEW.status || ' - refunded');
      NEW.processed_at := now();
    ELSIF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
      UPDATE public.wallets
        SET pending_balance = GREATEST(pending_balance - OLD.amount, 0),
            total_paid_out = total_paid_out + OLD.amount
        WHERE id = OLD.wallet_id;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (OLD.wallet_id, -OLD.amount, OLD.currency, 'payout', OLD.id, 'payout_request', 'Payout paid');
      NEW.processed_at := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payout_wallet_flow ON public.payout_requests;
CREATE TRIGGER trg_payout_wallet_flow
  BEFORE INSERT OR UPDATE OF status ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.payout_wallet_flow();

-- ============ agent_achievements ============
CREATE TABLE IF NOT EXISTS public.agent_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  code text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  description_en text,
  icon text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, code)
);
CREATE INDEX IF NOT EXISTS agent_achievements_agent_idx ON public.agent_achievements(agent_id);

GRANT SELECT ON public.agent_achievements TO anon, authenticated;
GRANT ALL ON public.agent_achievements TO service_role;
ALTER TABLE public.agent_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements public read" ON public.agent_achievements FOR SELECT USING (true);
CREATE POLICY "Admins manage achievements" ON public.agent_achievements FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-award on first paid commission and on milestones
CREATE OR REPLACE FUNCTION public.award_agent_achievements()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paid_count int; v_total numeric;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT count(*), COALESCE(sum(amount),0) INTO v_paid_count, v_total
      FROM public.commissions WHERE agent_id = NEW.agent_id AND status = 'paid';
    IF v_paid_count >= 1 THEN
      INSERT INTO public.agent_achievements(agent_id, code, title_ar, title_en, description_ar, description_en, icon)
      VALUES (NEW.agent_id, 'first_sale', 'أول صفقة', 'First Sale', 'أكملت أول عمولة مدفوعة', 'You closed your first paid commission', '🎉')
      ON CONFLICT (agent_id, code) DO NOTHING;
    END IF;
    IF v_paid_count >= 10 THEN
      INSERT INTO public.agent_achievements(agent_id, code, title_ar, title_en, description_ar, description_en, icon)
      VALUES (NEW.agent_id, 'ten_sales', 'عشر صفقات', '10 Sales', 'أكملت 10 عمولات مدفوعة', '10 paid commissions', '🏆')
      ON CONFLICT (agent_id, code) DO NOTHING;
    END IF;
    IF v_total >= 10000 THEN
      INSERT INTO public.agent_achievements(agent_id, code, title_ar, title_en, description_ar, description_en, icon)
      VALUES (NEW.agent_id, 'earner_10k', 'كسبت 10 آلاف', 'Earned 10K', 'وصلت لعشرة آلاف جنيه أرباح', 'Reached 10,000 EGP earnings', '💎')
      ON CONFLICT (agent_id, code) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_award_agent_achievements ON public.commissions;
CREATE TRIGGER trg_award_agent_achievements
  AFTER UPDATE OF status ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.award_agent_achievements();

-- ============ Leaderboard view ============
CREATE OR REPLACE VIEW public.marketer_leaderboard AS
SELECT
  a.id AS agent_id,
  a.user_id,
  COALESCE(p.display_name, p.full_name, 'Marketer') AS name,
  p.avatar_url,
  COALESCE(w.total_earned, 0) AS total_earned,
  COALESCE(w.balance, 0) AS balance,
  (SELECT COUNT(*) FROM public.commissions c WHERE c.agent_id = a.id AND c.status = 'paid') AS deals_closed,
  (SELECT COUNT(*) FROM public.agent_achievements ac WHERE ac.agent_id = a.id) AS achievements_count
FROM public.agents a
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.wallets w ON w.user_id = a.user_id AND w.kind = 'agent';

GRANT SELECT ON public.marketer_leaderboard TO anon, authenticated;
