
CREATE OR REPLACE FUNCTION public.on_agent_role_provision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'agent'::public.app_role THEN
    -- Skip company accounts: they must never receive a marketer wallet/profile
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'company') THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.agents (user_id) VALUES (NEW.user_id)
      ON CONFLICT (user_id) DO NOTHING;
    PERFORM public.ensure_wallet(NEW.user_id, 'agent'::public.wallet_kind);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'on_agent_role_provision failed for %: %', NEW.user_id, SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_agent_role_provision ON public.user_roles;
CREATE TRIGGER trg_agent_role_provision
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.on_agent_role_provision();

-- Repair existing marketers missing an agents row (skip company accounts)
INSERT INTO public.agents (user_id)
SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'agent'
    AND NOT EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = ur.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = ur.user_id AND ur2.role = 'company')
ON CONFLICT (user_id) DO NOTHING;

-- Repair wallets for all existing marketers (skip company accounts)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'agent'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = ur.user_id AND ur2.role = 'company')
      AND NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = ur.user_id AND w.kind = 'agent')
  LOOP
    PERFORM public.ensure_wallet(r.user_id, 'agent'::public.wallet_kind);
  END LOOP;
END $$;
