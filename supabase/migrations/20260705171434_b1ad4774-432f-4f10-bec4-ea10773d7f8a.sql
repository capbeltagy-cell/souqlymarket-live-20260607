
-- 1. Platform settings singleton
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  marketer_commission_pct numeric(5,2) NOT NULL DEFAULT 90.00 CHECK (marketer_commission_pct >= 0 AND marketer_commission_pct <= 100),
  platform_commission_pct numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (platform_commission_pct >= 0 AND platform_commission_pct <= 100),
  min_withdrawal_amount numeric(14,2) NOT NULL DEFAULT 100,
  withdrawal_review_mode text NOT NULL DEFAULT 'manual' CHECK (withdrawal_review_mode IN ('manual','auto')),
  currency text NOT NULL DEFAULT 'EGP',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone auth reads settings" ON public.platform_settings;
CREATE POLICY "anyone auth reads settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins manage settings" ON public.platform_settings;
CREATE POLICY "admins manage settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_platform_settings_updated
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Update commission_to_wallet to read platform pct from settings
CREATE OR REPLACE FUNCTION public.commission_to_wallet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agent_user uuid;
  v_company_owner uuid;
  v_agent_wallet uuid;
  v_company_wallet uuid;
  v_platform_wallet uuid;
  v_platform_pct numeric;
  v_platform_cut numeric(14,2);
  v_agent_cut numeric(14,2);
BEGIN
  SELECT platform_commission_pct INTO v_platform_pct FROM public.platform_settings WHERE id = true;
  v_platform_pct := COALESCE(v_platform_pct, 10);

  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT user_id INTO v_agent_user FROM public.agents WHERE id = NEW.agent_id;
    SELECT owner_id INTO v_company_owner FROM public.companies WHERE id = NEW.company_id;

    v_platform_cut := round(NEW.amount * (v_platform_pct / 100.0), 2);
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
      VALUES (v_platform_wallet, v_platform_cut, NEW.currency, 'commission', NEW.id, 'commission', 'Platform cut');
    UPDATE public.wallets SET balance = balance + v_platform_cut, total_earned = total_earned + v_platform_cut WHERE id = v_platform_wallet;
  END IF;

  IF NEW.status = 'pending' AND TG_OP = 'INSERT' AND v_agent_user IS NULL THEN
    SELECT user_id INTO v_agent_user FROM public.agents WHERE id = NEW.agent_id;
    IF v_agent_user IS NOT NULL THEN
      v_agent_wallet := public.ensure_wallet(v_agent_user, 'agent');
      UPDATE public.wallets SET pending_balance = pending_balance + (NEW.amount * ((100 - v_platform_pct) / 100.0)) WHERE id = v_agent_wallet;
    END IF;
  END IF;

  RETURN NEW;
END $function$;

-- 3. Notify agent on commission changes
CREATE OR REPLACE FUNCTION public.on_commission_change_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.agents WHERE id = NEW.agent_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (v_user,'commission','عمولة جديدة','تم تسجيل عمولة جديدة بقيمة '||NEW.amount||' '||NEW.currency,'/commissions');
  ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (v_user,'commission','تم اعتماد العمولة','عمولتك بقيمة '||NEW.amount||' '||NEW.currency||' تم اعتمادها','/commissions');
    ELSIF NEW.status='paid' THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (v_user,'commission','تم إضافة الأرباح للمحفظة','تم تحويل '||NEW.amount||' '||NEW.currency||' إلى محفظتك','/wallet');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_commission_change_notify ON public.commissions;
CREATE TRIGGER trg_on_commission_change_notify
  AFTER INSERT OR UPDATE OF status ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.on_commission_change_notify();

-- 4. Notify user on payout request state changes
CREATE OR REPLACE FUNCTION public.on_payout_status_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (NEW.user_id,'payout','تم إرسال طلب السحب','طلبك بقيمة '||NEW.amount||' '||NEW.currency||' قيد المراجعة','/payouts');
  ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (NEW.user_id,'payout','تم اعتماد طلب السحب','سيتم تحويل المبلغ قريباً','/payouts');
    ELSIF NEW.status='paid' THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (NEW.user_id,'payout','تم تحويل أرباحك بنجاح','تم تحويل '||NEW.amount||' '||NEW.currency||' بنجاح','/payouts');
    ELSIF NEW.status='rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,link)
      VALUES (NEW.user_id,'payout','تم رفض طلب السحب', COALESCE('السبب: '||NEW.admin_notes,'يرجى التواصل مع الدعم'),'/payouts');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_payout_status_notify ON public.payout_requests;
CREATE TRIGGER trg_on_payout_status_notify
  AFTER INSERT OR UPDATE OF status ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_payout_status_notify();
