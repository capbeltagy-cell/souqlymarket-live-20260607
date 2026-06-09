
-- Default commission currency to EGP going forward
ALTER TABLE public.commissions ALTER COLUMN currency SET DEFAULT 'EGP';

-- Wallet kind enum
DO $$ BEGIN
  CREATE TYPE public.wallet_kind AS ENUM ('company','agent','platform');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_tx_reason AS ENUM ('commission','referral','payout','subscription','featured','manual_credit','manual_debit','refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('pending','paid','failed','refunded','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.wallet_kind NOT NULL,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  pending_balance numeric(14,2) NOT NULL DEFAULT 0,
  total_earned numeric(14,2) NOT NULL DEFAULT 0,
  total_paid_out numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own wallet" ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage wallets" ON public.wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  reason public.wallet_tx_reason NOT NULL,
  reference_id uuid,
  reference_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_tx_wallet_idx ON public.wallet_transactions(wallet_id, created_at DESC);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own wallet tx" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_transactions.wallet_id AND (w.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Admins manage wallet tx" ON public.wallet_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  status public.invoice_status NOT NULL DEFAULT 'pending',
  purpose text NOT NULL,
  description text,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id, created_at DESC);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper: ensure wallet exists
CREATE OR REPLACE FUNCTION public.ensure_wallet(_user_id uuid, _kind public.wallet_kind)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.wallets WHERE user_id IS NOT DISTINCT FROM _user_id AND kind = _kind;
  IF v_id IS NULL THEN
    INSERT INTO public.wallets(user_id, kind) VALUES (_user_id, _kind) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- Commission lifecycle hook -> wallet ledger
CREATE OR REPLACE FUNCTION public.commission_to_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agent_user uuid;
  v_company_owner uuid;
  v_agent_wallet uuid;
  v_company_wallet uuid;
  v_platform_wallet uuid;
  v_platform_cut numeric(14,2);
  v_agent_cut numeric(14,2);
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT user_id INTO v_agent_user FROM public.agents WHERE id = NEW.agent_id;
    SELECT owner_id INTO v_company_owner FROM public.companies WHERE id = NEW.company_id;

    v_platform_cut := round(NEW.amount * 0.10, 2);
    v_agent_cut := NEW.amount - v_platform_cut;

    IF v_agent_user IS NOT NULL THEN
      v_agent_wallet := public.ensure_wallet(v_agent_user, 'agent');
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (v_agent_wallet, v_agent_cut, NEW.currency, 'commission', NEW.id, 'commission', 'Commission earned');
      UPDATE public.wallets SET
        balance = balance + v_agent_cut,
        total_earned = total_earned + v_agent_cut
      WHERE id = v_agent_wallet;
    END IF;

    IF v_company_owner IS NOT NULL THEN
      v_company_wallet := public.ensure_wallet(v_company_owner, 'company');
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (v_company_wallet, -NEW.amount, NEW.currency, 'commission', NEW.id, 'commission', 'Commission paid out');
      UPDATE public.wallets SET total_paid_out = total_paid_out + NEW.amount WHERE id = v_company_wallet;
    END IF;

    v_platform_wallet := public.ensure_wallet(NULL, 'platform');
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_platform_wallet, v_platform_cut, NEW.currency, 'commission', NEW.id, 'commission', 'Platform 10% cut');
    UPDATE public.wallets SET balance = balance + v_platform_cut, total_earned = total_earned + v_platform_cut WHERE id = v_platform_wallet;
  END IF;

  IF NEW.status = 'pending' AND TG_OP = 'INSERT' AND v_agent_user IS NULL THEN
    SELECT user_id INTO v_agent_user FROM public.agents WHERE id = NEW.agent_id;
    IF v_agent_user IS NOT NULL THEN
      v_agent_wallet := public.ensure_wallet(v_agent_user, 'agent');
      UPDATE public.wallets SET pending_balance = pending_balance + (NEW.amount * 0.9) WHERE id = v_agent_wallet;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_commission_to_wallet ON public.commissions;
CREATE TRIGGER trg_commission_to_wallet
  AFTER INSERT OR UPDATE OF status ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.commission_to_wallet();

-- Auto-create invoice when a payment is marked paid
CREATE OR REPLACE FUNCTION public.payment_to_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num text;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    v_num := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(NEW.id::text,1,8);
    INSERT INTO public.invoices(user_id, invoice_number, amount, currency, status, purpose, payment_id, paid_at)
      VALUES (NEW.user_id, v_num, NEW.amount, NEW.currency, 'paid', NEW.purpose, NEW.id, now())
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payment_to_invoice ON public.payments;
CREATE TRIGGER trg_payment_to_invoice
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payment_to_invoice();

-- Seed platform wallet
SELECT public.ensure_wallet(NULL, 'platform');
