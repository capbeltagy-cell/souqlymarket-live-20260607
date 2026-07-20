-- Database-backed rate limits for sensitive authenticated mutations.

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, action)
);

REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
  p_action text,
  p_max_requests integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.auth_rate_limits%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_action IS NULL OR length(p_action) > 80 OR p_max_requests < 1
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO public.auth_rate_limits (user_id, action, request_count)
  VALUES (v_user_id, p_action, 0)
  ON CONFLICT (user_id, action) DO NOTHING;

  SELECT * INTO v_row
    FROM public.auth_rate_limits
   WHERE user_id = v_user_id AND action = p_action
   FOR UPDATE;

  IF v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.auth_rate_limits
       SET window_started_at = now(), request_count = 1
     WHERE user_id = v_user_id AND action = p_action;
    RETURN true;
  END IF;

  IF v_row.request_count >= p_max_requests THEN
    RETURN false;
  END IF;

  UPDATE public.auth_rate_limits
     SET request_count = request_count + 1
   WHERE user_id = v_user_id AND action = p_action;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS auth_rate_limits_window_idx
  ON public.auth_rate_limits (window_started_at);
