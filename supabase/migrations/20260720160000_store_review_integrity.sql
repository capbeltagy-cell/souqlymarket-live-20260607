-- Only verified buyers may review stores, and sellers may only edit their reply.

DROP POLICY IF EXISTS "store_reviews_author_insert" ON public.store_reviews;
CREATE POLICY "store_reviews_verified_buyer_insert" ON public.store_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.wholesale_orders o
       WHERE o.id = order_id
         AND o.store_id = store_id
         AND o.buyer_id = auth.uid()
         AND o.status IN ('delivered', 'completed')
    )
  );

CREATE OR REPLACE FUNCTION public.protect_store_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin');
  v_is_store_owner boolean;
BEGIN
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stores s
     WHERE s.id = OLD.store_id AND s.owner_id = auth.uid()
  ) INTO v_is_store_owner;

  IF v_is_store_owner THEN
    NEW.store_id := OLD.store_id;
    NEW.user_id := OLD.user_id;
    NEW.order_id := OLD.order_id;
    NEW.rating := OLD.rating;
    NEW.body := OLD.body;
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    NEW.store_id := OLD.store_id;
    NEW.user_id := OLD.user_id;
    NEW.order_id := OLD.order_id;
    NEW.seller_reply := OLD.seller_reply;
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this review';
END;
$$;

REVOKE ALL ON FUNCTION public.protect_store_review_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_store_review_fields ON public.store_reviews;
CREATE TRIGGER trg_protect_store_review_fields
BEFORE UPDATE ON public.store_reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_store_review_fields();
