-- Server-authoritative checkout and quotation conversion.
-- This migration removes direct authenticated order writes after both supported
-- creation flows have atomic SECURITY DEFINER entry points.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_buyer_id uuid,
  p_listing_id uuid,
  p_quantity integer,
  p_notes text,
  p_contact_phone text,
  p_shipping_address jsonb,
  p_shipping_amount numeric,
  p_shipping_eta_min_days integer,
  p_shipping_eta_max_days integer,
  p_checkout_session_id uuid,
  p_referral_code text,
  p_coupon_code text,
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  listing_row public.listings%ROWTYPE;
  store_row public.stores%ROWTYPE;
  coupon_row public.store_coupons%ROWTYPE;
  existing_order_id uuid;
  new_order_id uuid;
  canonical_referral_code text;
  unit_price numeric(14,2);
  subtotal_amount numeric(14,2);
  discount_amount numeric(14,2) := 0;
  shipping_amount numeric(14,2) := 0;
  shipping_eta_min integer;
  shipping_eta_max integer;
  governorate_key text;
  inventory_balance integer;
  inventory_location_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_buyer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'checkout_buyer_mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_checkout_session_id IS NULL THEN
    RAISE EXCEPTION 'checkout_session_required' USING ERRCODE = '22023';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'invalid_order_quantity' USING ERRCODE = '22023';
  END IF;

  SELECT order_row.id
    INTO existing_order_id
    FROM public.wholesale_orders AS order_row
   WHERE order_row.buyer_id = auth.uid()
     AND order_row.checkout_session_id = p_checkout_session_id
     AND order_row.product_listing_id = p_listing_id
   LIMIT 1;
  IF existing_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', existing_order_id, 'idempotent', true);
  END IF;

  SELECT *
    INTO listing_row
    FROM public.listings
   WHERE id = p_listing_id
   FOR UPDATE;
  IF NOT FOUND OR listing_row.type <> 'product' OR listing_row.status <> 'approved' THEN
    RAISE EXCEPTION 'product_unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF p_quantity < coalesce(listing_row.min_order_quantity, 1) THEN
    RAISE EXCEPTION 'minimum_order_quantity_not_met' USING ERRCODE = '22023';
  END IF;
  IF listing_row.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'seller_cannot_buy_own_product' USING ERRCODE = '42501';
  END IF;
  IF NOT coalesce(listing_row.visible_in_marketplace, false)
     AND NOT coalesce(listing_row.visible_in_store, false) THEN
    RAISE EXCEPTION 'product_not_visible' USING ERRCODE = 'P0001';
  END IF;

  IF listing_row.store_id IS NOT NULL THEN
    SELECT *
      INTO store_row
      FROM public.stores
     WHERE id = listing_row.store_id;
    IF NOT FOUND
       OR store_row.status <> 'published'
       OR store_row.company_id IS DISTINCT FROM listing_row.company_id
       OR store_row.owner_id IS DISTINCT FROM listing_row.owner_id THEN
      RAISE EXCEPTION 'store_unavailable_or_mismatched' USING ERRCODE = '42501';
    END IF;
  END IF;

  unit_price := coalesce(listing_row.sale_price, listing_row.price);
  IF unit_price IS NULL OR unit_price <= 0 THEN
    RAISE EXCEPTION 'invalid_product_price' USING ERRCODE = 'P0001';
  END IF;
  subtotal_amount := round(unit_price * p_quantity, 2);

  -- Shipping values sent by the browser are compatibility-only. The database
  -- derives the canonical quote from the address governorate.
  IF p_shipping_address IS NOT NULL THEN
    governorate_key := lower(btrim(coalesce(p_shipping_address ->> 'governorate', '')));
    IF governorate_key IN ('القاهرة', 'القاهره', 'cairo', 'الجيزة', 'الجيزه', 'giza') THEN
      shipping_amount := 70; shipping_eta_min := 1; shipping_eta_max := 2;
    ELSIF governorate_key IN (
      'الإسكندرية', 'الاسكندرية', 'الاسكندريه', 'alexandria', 'البحيرة', 'البحيره', 'beheira'
    ) THEN
      shipping_amount := 85; shipping_eta_min := 2; shipping_eta_max := 3;
    ELSIF governorate_key IN (
      'القليوبية', 'القليوبيه', 'المنوفية', 'المنوفيه', 'الغربية', 'الغربيه',
      'الدقهلية', 'الدقهليه', 'الشرقية', 'الشرقيه', 'كفر الشيخ', 'دمياط',
      'بورسعيد', 'الإسماعيلية', 'الاسماعيلية', 'الاسماعيليه', 'السويس',
      'qalyubia', 'monufia', 'gharbia', 'dakahlia', 'sharqia',
      'kafr el sheikh', 'damietta', 'port said', 'ismailia', 'suez'
    ) THEN
      shipping_amount := 95; shipping_eta_min := 2; shipping_eta_max := 4;
    ELSIF governorate_key IN (
      'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'اسيوط', 'سوهاج', 'قنا',
      'الأقصر', 'الاقصر', 'أسوان', 'اسوان', 'fayoum', 'beni suef',
      'minya', 'assiut', 'sohag', 'qena', 'luxor', 'aswan'
    ) THEN
      shipping_amount := 120; shipping_eta_min := 3; shipping_eta_max := 5;
    ELSE
      shipping_amount := 140; shipping_eta_min := 3; shipping_eta_max := 6;
    END IF;
  END IF;

  IF p_conversation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.conversations AS conversation
     WHERE conversation.id = p_conversation_id
       AND conversation.listing_id = listing_row.id
       AND conversation.buyer_id = auth.uid()
       AND conversation.seller_id = listing_row.owner_id
  ) THEN
    RAISE EXCEPTION 'invalid_order_conversation' USING ERRCODE = '42501';
  END IF;

  IF p_referral_code IS NOT NULL THEN
    SELECT referral.code
      INTO canonical_referral_code
      FROM public.referrals AS referral
     WHERE referral.code = p_referral_code
       AND referral.listing_id = listing_row.id
     LIMIT 1;
  END IF;

  IF p_coupon_code IS NOT NULL THEN
    IF listing_row.store_id IS NULL THEN
      RAISE EXCEPTION 'coupon_requires_store_product' USING ERRCODE = '22023';
    END IF;
    SELECT *
      INTO coupon_row
      FROM public.store_coupons
     WHERE store_id = listing_row.store_id
       AND upper(code) = upper(btrim(p_coupon_code))
     FOR UPDATE;
    IF NOT FOUND
       OR NOT coupon_row.active
       OR (coupon_row.starts_at IS NOT NULL AND coupon_row.starts_at > now())
       OR (coupon_row.ends_at IS NOT NULL AND coupon_row.ends_at < now())
       OR subtotal_amount < coupon_row.min_order
       OR (
         coupon_row.usage_limit_total IS NOT NULL
         AND coupon_row.used_count >= coupon_row.usage_limit_total
       )
       OR (
         SELECT count(*)
           FROM public.store_coupon_usage AS usage
          WHERE usage.coupon_id = coupon_row.id
            AND usage.user_id = auth.uid()
       ) >= coupon_row.usage_limit_per_user THEN
      RAISE EXCEPTION 'coupon_invalid_or_exhausted' USING ERRCODE = 'P0001';
    END IF;
    IF coupon_row.applies_to <> '{}'::jsonb
       AND (
         jsonb_typeof(coupon_row.applies_to -> 'listing_ids') <> 'array'
         OR NOT EXISTS (
           SELECT 1
             FROM jsonb_array_elements_text(coupon_row.applies_to -> 'listing_ids') AS item(value)
            WHERE item.value = listing_row.id::text
         )
       ) THEN
      RAISE EXCEPTION 'coupon_not_applicable' USING ERRCODE = 'P0001';
    END IF;

    discount_amount := CASE coupon_row.type::text
      WHEN 'percent' THEN subtotal_amount * coupon_row.value / 100
      ELSE coupon_row.value
    END;
    discount_amount := least(
      subtotal_amount,
      coalesce(coupon_row.max_discount, discount_amount),
      discount_amount
    );
    discount_amount := round(greatest(discount_amount, 0), 2);
  END IF;

  IF coalesce(listing_row.track_inventory, false) THEN
    IF listing_row.stock_quantity IS NULL OR listing_row.stock_quantity < p_quantity THEN
      RAISE EXCEPTION 'insufficient_inventory' USING ERRCODE = 'P0001';
    END IF;
    inventory_balance := listing_row.stock_quantity - p_quantity;
  END IF;

  INSERT INTO public.wholesale_orders (
    buyer_id, listing_id, product_listing_id, store_id, quantity, notes,
    contact_phone, status, shipping_address, unit_price, subtotal,
    discount_amount, shipping_amount, shipping_eta_min_days,
    shipping_eta_max_days, total_amount, currency, payment_status,
    conversation_id, referral_code, coupon_code, checkout_session_id,
    idempotency_key, inventory_reserved_at, inventory_released_at
  )
  VALUES (
    auth.uid(), NULL, listing_row.id, listing_row.store_id, p_quantity, p_notes,
    p_contact_phone, 'awaiting_seller', p_shipping_address, unit_price,
    subtotal_amount, discount_amount, shipping_amount, shipping_eta_min,
    shipping_eta_max, greatest(subtotal_amount - discount_amount, 0) + shipping_amount,
    coalesce(listing_row.currency, 'EGP'), 'unpaid', p_conversation_id,
    canonical_referral_code, CASE WHEN coupon_row.id IS NULL THEN NULL ELSE coupon_row.code END,
    p_checkout_session_id, p_checkout_session_id::text,
    CASE WHEN coalesce(listing_row.track_inventory, false) THEN now() ELSE NULL END,
    NULL
  )
  ON CONFLICT (buyer_id, checkout_session_id, product_listing_id)
    WHERE checkout_session_id IS NOT NULL AND product_listing_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO new_order_id;

  IF new_order_id IS NULL THEN
    SELECT order_row.id
      INTO new_order_id
      FROM public.wholesale_orders AS order_row
     WHERE order_row.buyer_id = auth.uid()
       AND order_row.checkout_session_id = p_checkout_session_id
       AND order_row.product_listing_id = listing_row.id;
    RETURN jsonb_build_object('order_id', new_order_id, 'idempotent', true);
  END IF;

  IF coalesce(listing_row.track_inventory, false) THEN
    UPDATE public.listings
       SET stock_quantity = inventory_balance,
           updated_at = now()
     WHERE id = listing_row.id;

    SELECT location.id
      INTO inventory_location_id
      FROM public.inventory_locations AS location
     WHERE location.company_id = listing_row.company_id
       AND location.active
     ORDER BY location.is_default DESC, location.created_at
     LIMIT 1;

    INSERT INTO public.inventory_movements (
      company_id, listing_id, location_id, movement_type, quantity_delta,
      balance_after, reference_type, reference_id, note, created_by
    )
    VALUES (
      listing_row.company_id, listing_row.id, inventory_location_id, 'sale',
      -p_quantity, inventory_balance, 'order', new_order_id,
      'حجز مخزون عند إنشاء الطلب', auth.uid()
    );
  END IF;

  IF coupon_row.id IS NOT NULL THEN
    INSERT INTO public.store_coupon_usage (
      coupon_id, user_id, order_id, discount_amount
    )
    VALUES (coupon_row.id, auth.uid(), new_order_id, discount_amount);
  END IF;

  RETURN jsonb_build_object(
    'order_id', new_order_id,
    'idempotent', false,
    'subtotal', subtotal_amount,
    'discount', discount_amount,
    'shipping', shipping_amount,
    'total', greatest(subtotal_amount - discount_amount, 0) + shipping_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(
  uuid, uuid, integer, text, text, jsonb, numeric, integer, integer,
  uuid, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(
  uuid, uuid, integer, text, text, jsonb, numeric, integer, integer,
  uuid, text, text, uuid
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.accept_quotation_atomic(
  p_quotation_id uuid,
  p_shipping_address jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  quotation_row public.quotations%ROWTYPE;
  listing_row public.listings%ROWTYPE;
  first_listing_id uuid;
  total_quantity integer;
  new_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO quotation_row
    FROM public.quotations
   WHERE id = p_quotation_id
   FOR UPDATE;
  IF NOT FOUND OR quotation_row.buyer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'quotation_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  IF quotation_row.status = 'converted' AND quotation_row.order_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', quotation_row.order_id, 'idempotent', true);
  END IF;
  IF quotation_row.status NOT IN ('sent', 'draft') THEN
    RAISE EXCEPTION 'quotation_cannot_be_converted' USING ERRCODE = 'P0001';
  END IF;
  IF quotation_row.expiry_date IS NOT NULL AND quotation_row.expiry_date < current_date THEN
    RAISE EXCEPTION 'quotation_expired' USING ERRCODE = 'P0001';
  END IF;

  SELECT item.listing_id
    INTO first_listing_id
    FROM public.quotation_items AS item
   WHERE item.quotation_id = quotation_row.id
   ORDER BY item.created_at, item.id
   LIMIT 1;

  SELECT greatest(1, round(sum(item.quantity))::integer)
    INTO total_quantity
    FROM public.quotation_items AS item
   WHERE item.quotation_id = quotation_row.id;

  IF first_listing_id IS NOT NULL THEN
    SELECT *
      INTO listing_row
      FROM public.listings
     WHERE id = first_listing_id;
    IF NOT FOUND
       OR listing_row.company_id IS DISTINCT FROM quotation_row.seller_company_id
       OR listing_row.owner_id IS DISTINCT FROM quotation_row.seller_id THEN
      RAISE EXCEPTION 'quotation_listing_seller_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.wholesale_orders (
    buyer_id, product_listing_id, store_id, quantity, status, unit_price,
    subtotal, discount_amount, shipping_amount, total_amount, currency,
    shipping_address, conversation_id, payment_status, quotation_id, notes
  )
  VALUES (
    auth.uid(), first_listing_id, listing_row.store_id, coalesce(total_quantity, 1),
    'accepted', CASE WHEN coalesce(total_quantity, 0) > 0
      THEN quotation_row.total / total_quantity ELSE quotation_row.total END,
    quotation_row.subtotal, quotation_row.discount, quotation_row.shipping,
    quotation_row.total, quotation_row.currency, p_shipping_address,
    quotation_row.conversation_id, 'unpaid', quotation_row.id, quotation_row.notes
  )
  RETURNING id INTO new_order_id;

  UPDATE public.quotations
     SET status = 'converted',
         order_id = new_order_id,
         updated_at = now()
   WHERE id = quotation_row.id;

  RETURN jsonb_build_object('order_id', new_order_id, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_quotation_atomic(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_quotation_atomic(uuid, jsonb)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_released_order_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  listing_row public.listings%ROWTYPE;
  inventory_location_id uuid;
BEGIN
  IF OLD.inventory_released_at IS NULL AND NEW.inventory_released_at IS NOT NULL THEN
    SELECT *
      INTO listing_row
      FROM public.listings
     WHERE id = coalesce(NEW.product_listing_id, NEW.listing_id);

    IF FOUND AND coalesce(listing_row.track_inventory, false) THEN
      SELECT location.id
        INTO inventory_location_id
        FROM public.inventory_locations AS location
       WHERE location.company_id = listing_row.company_id
         AND location.active
       ORDER BY location.is_default DESC, location.created_at
       LIMIT 1;

      INSERT INTO public.inventory_movements (
        company_id, listing_id, location_id, movement_type, quantity_delta,
        balance_after, reference_type, reference_id, note, created_by
      )
      VALUES (
        listing_row.company_id, listing_row.id, inventory_location_id, 'return',
        NEW.quantity, coalesce(listing_row.stock_quantity, 0), 'order', NEW.id,
        'إعادة مخزون بعد إلغاء أو رفض الطلب', coalesce(auth.uid(), NEW.buyer_id)
      );
    END IF;

    DELETE FROM public.store_coupon_usage WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_released_order_inventory()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_record_released_order_inventory ON public.wholesale_orders;
CREATE TRIGGER trg_record_released_order_inventory
AFTER UPDATE OF payment_status, status ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.record_released_order_inventory();

-- All client order creation now goes through the two validated RPCs above.
DROP POLICY IF EXISTS "wholesale_orders buyer insert" ON public.wholesale_orders;
REVOKE INSERT ON public.wholesale_orders FROM authenticated;
DROP POLICY IF EXISTS "wholesale_orders company update" ON public.wholesale_orders;
REVOKE UPDATE ON public.wholesale_orders FROM authenticated;
DROP POLICY IF EXISTS "store_coupon_usage_self_insert" ON public.store_coupon_usage;
REVOKE INSERT ON public.store_coupon_usage FROM authenticated;

COMMIT;
