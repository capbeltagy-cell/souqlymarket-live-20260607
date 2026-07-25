-- Secure company invitation acceptance.
-- Stores only SHA-256 token hashes and verifies the signed-in user's email.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invitation public.company_invitations%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  v_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email = '' THEN RAISE EXCEPTION 'verified_email_required'; END IF;

  SELECT * INTO v_invitation
  FROM public.company_invitations
  WHERE token_hash = encode(digest(_token, 'sha256'), 'hex')
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF v_invitation.expires_at <= now() THEN
    UPDATE public.company_invitations SET status = 'expired', updated_at = now()
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF lower(v_invitation.email) <> v_email THEN RAISE EXCEPTION 'invitation_email_mismatch'; END IF;

  INSERT INTO public.company_members (
    company_id, user_id, role, permissions, status, invited_by
  ) VALUES (
    v_invitation.company_id, auth.uid(), v_invitation.role,
    v_invitation.permissions, 'active', v_invitation.invited_by
  )
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET role = CASE WHEN company_members.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END,
        permissions = CASE WHEN company_members.role = 'owner' THEN company_members.permissions ELSE EXCLUDED.permissions END,
        status = 'active',
        updated_at = now();

  UPDATE public.company_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_company_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(text) TO authenticated;

COMMIT;
