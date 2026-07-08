
-- Remove the permissive insert policies; we'll route inserts through a
-- SECURITY DEFINER function that validates the order server-side.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone creates order items" ON public.order_items;

REVOKE INSERT, UPDATE ON public.orders FROM anon, authenticated;
REVOKE INSERT ON public.order_items FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_delivery_type delivery_type,
  p_address TEXT,
  p_area TEXT,
  p_notes TEXT,
  p_items JSONB   -- [{"menu_item_id":uuid,"quantity":int,"addons":[{"name":str,"price":num}],"notes":str}]
)
RETURNS TABLE (id UUID, order_number TEXT, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC := 0;
  v_delivery_fee NUMERIC := 0;
  v_total NUMERIC := 0;
  v_settings RECORD;
  v_item JSONB;
  v_menu RECORD;
  v_qty INT;
  v_addon JSONB;
  v_addon_total NUMERIC;
  v_line_price NUMERIC;
  v_addons_clean JSONB;
BEGIN
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF p_phone IS NULL OR length(trim(p_phone)) < 7 THEN
    RAISE EXCEPTION 'Valid phone number is required';
  END IF;
  IF p_delivery_type = 'delivery' AND (p_address IS NULL OR length(trim(p_address)) < 5) THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in one order';
  END IF;

  SELECT * INTO v_settings FROM public.settings WHERE id = 1;
  IF NOT v_settings.is_open THEN
    RAISE EXCEPTION 'The kitchen is currently closed';
  END IF;
  IF p_delivery_type = 'delivery' THEN
    v_delivery_fee := v_settings.delivery_fee;
  END IF;

  INSERT INTO public.orders (
    user_id, customer_name, phone, email, delivery_type, address, area, notes,
    subtotal, delivery_fee, total
  ) VALUES (
    auth.uid(),
    trim(p_customer_name),
    trim(p_phone),
    NULLIF(trim(coalesce(p_email,'')), ''),
    p_delivery_type,
    NULLIF(trim(coalesce(p_address,'')), ''),
    NULLIF(trim(coalesce(p_area,'')), ''),
    NULLIF(trim(coalesce(p_notes,'')), ''),
    0, v_delivery_fee, 0
  )
  RETURNING orders.id, orders.order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := coalesce((v_item->>'quantity')::int, 1);
    IF v_qty < 1 OR v_qty > 20 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT id, name, price, in_stock, protein_options
      INTO v_menu
      FROM public.menu_items
     WHERE id = (v_item->>'menu_item_id')::uuid;

    IF v_menu.id IS NULL THEN
      RAISE EXCEPTION 'Menu item not found';
    END IF;
    IF NOT v_menu.in_stock THEN
      RAISE EXCEPTION 'Item "%" is out of stock', v_menu.name;
    END IF;

    -- Validate addons against menu's protein_options
    v_addon_total := 0;
    v_addons_clean := '[]'::jsonb;
    IF v_item ? 'addons' AND jsonb_typeof(v_item->'addons') = 'array' THEN
      FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'addons')
      LOOP
        DECLARE
          v_match JSONB;
        BEGIN
          SELECT elem INTO v_match
            FROM jsonb_array_elements(v_menu.protein_options) elem
           WHERE elem->>'name' = v_addon->>'name'
           LIMIT 1;
          IF v_match IS NULL THEN
            RAISE EXCEPTION 'Invalid add-on "%" for %', v_addon->>'name', v_menu.name;
          END IF;
          v_addon_total := v_addon_total + (v_match->>'price')::numeric;
          v_addons_clean := v_addons_clean || jsonb_build_array(v_match);
        END;
      END LOOP;
    END IF;

    v_line_price := v_menu.price + v_addon_total;
    v_subtotal := v_subtotal + (v_line_price * v_qty);

    INSERT INTO public.order_items (
      order_id, menu_item_id, name_snapshot, price_at_time, quantity, addons, notes
    ) VALUES (
      v_order_id,
      v_menu.id,
      v_menu.name,
      v_line_price,
      v_qty,
      v_addons_clean,
      NULLIF(trim(coalesce(v_item->>'notes','')), '')
    );
  END LOOP;

  v_total := v_subtotal + v_delivery_fee;

  UPDATE public.orders
     SET subtotal = v_subtotal,
         total = v_total
   WHERE id = v_order_id;

  RETURN QUERY SELECT v_order_id, v_order_number, v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order(TEXT,TEXT,TEXT,delivery_type,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT,TEXT,TEXT,delivery_type,TEXT,TEXT,TEXT,JSONB) TO anon, authenticated;
