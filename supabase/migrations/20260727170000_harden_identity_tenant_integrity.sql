-- Harden public signup and tenant ownership invariants.
-- Additive/convergent only: no production rows are deleted or rewritten.
BEGIN;

-- Public signup can select product account types only. Operational roles such
-- as admin and super_admin must only be granted by an existing administrator.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role text := lower(btrim(coalesce(NEW.raw_user_meta_data ->> 'role', '')));
  safe_role public.app_role;
BEGIN
  safe_role := CASE requested_role
    WHEN 'company' THEN 'company'::public.app_role
    WHEN 'agent' THEN 'agent'::public.app_role
    WHEN 'customer' THEN 'customer'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  INSERT INTO public.profiles (id, full_name, avatar_url, display_name, phone)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Only the canonical company owner may hold the protected workspace owner role.
CREATE OR REPLACE FUNCTION public.enforce_company_member_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  canonical_owner uuid;
BEGIN
  IF NEW.role = 'owner' THEN
    SELECT company.owner_id
      INTO canonical_owner
      FROM public.companies AS company
     WHERE company.id = NEW.company_id;

    IF canonical_owner IS NULL OR NEW.user_id IS DISTINCT FROM canonical_owner THEN
      RAISE EXCEPTION 'company_member_owner_must_match_company_owner'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_company_member_owner_role()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_company_member_owner_role ON public.company_members;
CREATE TRIGGER trg_enforce_company_member_owner_role
BEFORE INSERT OR UPDATE OF company_id, user_id, role ON public.company_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_company_member_owner_role();

DROP POLICY IF EXISTS "company_members_admin_insert" ON public.company_members;
CREATE POLICY "company_members_admin_insert"
ON public.company_members FOR INSERT TO authenticated
WITH CHECK (
  role <> 'owner'
  AND public.has_company_permission(company_id, 'members.manage', auth.uid())
);

-- Derive listing ownership from the company and prevent cross-tenant store or
-- store-category references. Browser-supplied ownership is never authoritative.
CREATE OR REPLACE FUNCTION public.enforce_listing_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  canonical_owner uuid;
  canonical_store_owner uuid;
  canonical_store_company uuid;
  canonical_category_store uuid;
BEGIN
  SELECT company.owner_id
    INTO canonical_owner
    FROM public.companies AS company
   WHERE company.id = NEW.company_id;

  IF canonical_owner IS NULL THEN
    RAISE EXCEPTION 'listing_company_owner_not_found' USING ERRCODE = '23503';
  END IF;

  IF NEW.store_id IS NOT NULL THEN
    SELECT store.owner_id, store.company_id
      INTO canonical_store_owner, canonical_store_company
      FROM public.stores AS store
     WHERE store.id = NEW.store_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'listing_store_not_found' USING ERRCODE = '23503';
    END IF;

    IF canonical_store_company IS DISTINCT FROM NEW.company_id
       OR canonical_store_owner IS DISTINCT FROM canonical_owner THEN
      RAISE EXCEPTION 'listing_store_company_owner_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.store_category_id IS NOT NULL THEN
    IF to_regclass('public.store_categories') IS NULL THEN
      RAISE EXCEPTION 'store_categories_unavailable' USING ERRCODE = '55000';
    END IF;

    EXECUTE
      'SELECT category.store_id
         FROM public.store_categories AS category
        WHERE category.id = $1'
      INTO canonical_category_store
      USING NEW.store_category_id;

    IF NOT FOUND OR NEW.store_id IS NULL
       OR canonical_category_store IS DISTINCT FROM NEW.store_id THEN
      RAISE EXCEPTION 'listing_store_category_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.owner_id := canonical_owner;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_listing_owner()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_listing_owner ON public.listings;
CREATE TRIGGER trg_enforce_listing_owner
BEFORE INSERT OR UPDATE OF company_id, owner_id, store_id, store_category_id
ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_owner();

-- Lead creation is already implemented by the validated server function.
-- Disable direct Data API writes that can spoof company, buyer, or status.
REVOKE INSERT ON public.leads FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
DROP POLICY IF EXISTS "Public can submit valid lead" ON public.leads;

-- An activity may never be moved to a lead belonging to another company.
DROP POLICY IF EXISTS "crm_activities_company_update" ON public.crm_activities;
CREATE POLICY "crm_activities_company_update"
ON public.crm_activities FOR UPDATE TO authenticated
USING (
  actor_id = auth.uid()
  AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
)
WITH CHECK (
  actor_id = auth.uid()
  AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
  AND EXISTS (
    SELECT 1
      FROM public.leads AS lead
     WHERE lead.id = lead_id
       AND lead.company_id = company_id
  )
);

COMMIT;
