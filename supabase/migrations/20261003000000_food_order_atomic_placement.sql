-- =====================================================================
-- Ewizzy — Atomic food order placement with database-authoritative prices
-- =====================================================================
--
-- Companion to (and strictly additive to):
--   supabase/migrations/20261002000000_food_order_integrity.sql
--
-- THE DEFECT THIS FIXES
--   Order creation was a two-step client flow:
--     1. INSERT food_orders  (subtotal, delivery_fee, total sent by the browser)
--     2. INSERT food_order_items (unit_price, line_total sent by the browser)
--
--   Every number in that flow was client-supplied and therefore forgeable.
--   A caller could POST subtotal = 1 and total = 1, or unit_price = 1, and
--   the database stored it. Nothing re-derived the money from
--   restaurant_menu_items.price, and nothing verified that the requested
--   menu items actually belonged to the restaurant on the order.
--
--   The two inserts were also not atomic. If step 2 failed, step 1 had
--   already committed, leaving a real paid-for order row with no food on
--   it and nothing the restaurant could ever fulfil.
--
-- WHAT THIS MIGRATION DOES
--   1. Adds public.place_food_order(), a SECURITY DEFINER RPC that is the
--      only supported way to create a food order. It:
--        - takes the customer identity from auth.uid(), never from input;
--        - re-reads every price from restaurant_menu_items;
--        - verifies each item exists, belongs to the named restaurant and
--          is still available;
--        - re-reads the delivery fee from restaurants.delivery_fee;
--        - computes subtotal and total itself;
--        - writes the order row and its items in ONE transaction, so an
--          order can never exist without its food.
--   2. Removes the two customer INSERT policies that allowed the old
--      two-step flow, closing the price-forgery hole at the RLS layer.
--
-- PRICE SNAPSHOT SEMANTICS (unchanged and now enforced)
--   food_order_items.unit_price is written from the menu row as it exists
--   at order time. It is never a live join, so if the restaurant changes
--   a price tomorrow, every existing order still shows the price the
--   customer actually paid. restaurant_menu_items is never updated by
--   this function.
--
-- EXISTING PROTECTIONS ARE NOT TOUCHED
--   20261002000000_food_order_integrity.sql owns:
--     - food_orders_guard_insert / food_orders_guard_update triggers
--     - the status transition guard
--     - the cancellation audit fields
--     - the rider assignment and rider RLS policies
--     - the customer cancel-only UPDATE policy
--     - food_orders.order_number
--   None of those objects are created, altered or dropped here. The new
--   INSERT path deliberately satisfies food_orders_guard_insert by writing
--   rider_id = null, status = 'pending' and payment_status = 'pending', so
--   the guard still runs and still has the final say.
--
-- PROPERTIES
--   - Additive. No table, column, status value or other policy is removed.
--   - Idempotent. Re-running is safe.
--   - Adopts the same SQL/RLS style as the surrounding migrations.
-- =====================================================================


-- =====================================================================
-- SECTION 1. place_food_order
--
-- WHY AN RPC AND NOT A TRIGGER
--   The values that must be server-derived (price, subtotal, fee, total)
--   do not exist yet when the food_orders row is written, and the item
--   rows do not exist at all until after it. A trigger on food_orders
--   would have to invent the second insert and then undo itself if the
--   item set turned out to be invalid, which is far harder to reason
--   about than one function that validates first and writes second.
--
-- WHY SECURITY DEFINER
--   The function must read restaurant_menu_items, restaurants and
--   food_order_items in order to derive the money, and it must be able to
--   write both food_orders and food_order_items atomically. RLS on those
--   tables is written for a customer's own rows, not for the derivation
--   lookups this function performs. SECURITY DEFINER does not widen what
--   a customer can do, because the function never accepts a customer id:
--   v_uid is auth.uid(), and every other input is validated against the
--   database before it is used. The only rows it writes belong to the
--   caller.
--
-- SEARCH_PATH
--   Empty, and every object is schema-qualified, so the function cannot be
--   redirected by a caller-controlled search_path.
-- =====================================================================
create or replace function public.place_food_order(
  p_restaurant_id      bigint,
  p_items              jsonb,
  p_delivery_address   text,
  p_notes              text             default null,
  p_delivery_latitude  numeric          default null,
  p_delivery_longitude numeric          default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid              uuid    := auth.uid();
  v_rest             public.restaurants%rowtype;
  v_order            public.food_orders%rowtype;
  v_element          jsonb;
  v_menu_item_id     bigint;
  v_quantity         integer;
  v_merged           jsonb   := '{}'::jsonb;
  v_merged_count     integer := 0;
  v_inserted         integer := 0;
  v_subtotal         numeric(12, 2) := 0;
  v_delivery_fee     numeric(12, 2) := 0;
  v_total            numeric(12, 2);
  v_address          text;
  v_notes            text;
  v_item_restaurant  bigint;
  v_available        boolean;
  v_price            numeric(10, 2);
  v_items_json       jsonb   := '[]'::jsonb;
  -- business ceiling, chosen to stay well inside food_orders.total which
  -- is numeric(10, 2) and therefore tops out at 99,999,999.99
  c_max_order_value  constant numeric := 9000000;
  c_max_quantity     constant integer := 99;
  c_max_line_items   constant integer := 100;
  c_max_address_len  constant integer := 500;
  c_max_notes_len    constant integer := 500;
begin
  -- -------------------------------------------------------------------
  -- 1. The caller must be a signed-in customer. There is no way to place
  --    an order for somebody else: v_uid comes from the JWT and is the
  --    only identity ever written to customer_user_id.
  -- -------------------------------------------------------------------
  if v_uid is null then
    raise exception 'You must be signed in to place a food order.'
      using errcode = '42501';
  end if;

  -- -------------------------------------------------------------------
  -- 2. Input shape checks. Every one of these produces a message a
  --    customer can act on rather than a raw cast error.
  -- -------------------------------------------------------------------
  if p_restaurant_id is null then
    raise exception 'A restaurant is required to place a food order.'
      using errcode = '22023';
  end if;

  if p_delivery_address is null or btrim(p_delivery_address) = '' then
    raise exception 'A delivery address is required.'
      using errcode = '22023';
  end if;

  v_address := btrim(p_delivery_address);

  if length(v_address) > c_max_address_len then
    raise exception 'Your delivery address is too long. Please shorten it.'
      using errcode = '22023';
  end if;

  if p_notes is not null then
    v_notes := nullif(btrim(p_notes), '');
    if v_notes is not null and length(v_notes) > c_max_notes_len then
      raise exception 'Your order notes are too long. Please shorten them.'
        using errcode = '22023';
    end if;
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > c_max_line_items then
    raise exception 'An order may contain at most % different items.',
      c_max_line_items
      using errcode = '22023';
  end if;

  if p_delivery_latitude is not null
     and (p_delivery_latitude < -90 or p_delivery_latitude > 90) then
    raise exception 'That delivery location could not be read. Please check your address.'
      using errcode = '22023';
  end if;

  if p_delivery_longitude is not null
     and (p_delivery_longitude < -180 or p_delivery_longitude > 180) then
    raise exception 'That delivery location could not be read. Please check your address.'
      using errcode = '22023';
  end if;

  -- -------------------------------------------------------------------
  -- 3. The restaurant must be a real, active, open row. This is what
  --    stops a demo or invented restaurant from ever reaching a write.
  -- -------------------------------------------------------------------
  select *
    into v_rest
    from public.restaurants r
   where r.id = p_restaurant_id;

  if not found then
    raise exception 'This restaurant could not be found.'
      using errcode = '22023';
  end if;

  if not coalesce(v_rest.is_active, false) then
    raise exception 'This restaurant is not currently available on Ewizzy.'
      using errcode = '22023';
  end if;

  if not coalesce(v_rest.is_open, false) then
    raise exception '% is closed right now. Please try again later.',
      v_rest.name
      using errcode = '22023';
  end if;

  -- The delivery fee is the restaurant's own figure, never the browser's.
  v_delivery_fee := coalesce(v_rest.delivery_fee, 0);

  -- -------------------------------------------------------------------
  -- 4. Normalise the requested lines.
  --
  --    Quantities are validated as digits only, so negatives, decimals,
  --    and non-numeric values are all rejected before any cast runs.
  --    Duplicate menu_item_id lines are merged, so repeating an item
  --    cannot be used to slip past the per-item quantity ceiling.
  -- -------------------------------------------------------------------
  for v_element in
    select jsonb_array_elements(p_items)
  loop
    if v_element ->> 'menu_item_id' is null
       or v_element ->> 'menu_item_id' !~ '^[0-9]{1,19}$' then
      raise exception 'Every item in your cart must reference a valid menu item.'
        using errcode = '22023';
    end if;

    if v_element ->> 'quantity' is null
       or v_element ->> 'quantity' !~ '^[0-9]{1,4}$' then
      raise exception 'Every item in your cart needs a valid quantity.'
        using errcode = '22023';
    end if;

    v_menu_item_id := (v_element ->> 'menu_item_id')::bigint;
    v_quantity     := (v_element ->> 'quantity')::integer;

    if v_menu_item_id <= 0 then
      raise exception 'Every item in your cart must reference a valid menu item.'
        using errcode = '22023';
    end if;

    if v_quantity < 1 then
      raise exception 'Every item in your cart needs a quantity of at least 1.'
        using errcode = '22023';
    end if;

    -- merge with any earlier line for the same item
    v_quantity := v_quantity
                  + coalesce((v_merged ->> v_menu_item_id::text)::integer, 0);

    if v_quantity > c_max_quantity then
      raise exception 'You can order at most % of a single item per order.',
        c_max_quantity
        using errcode = '22023';
    end if;

    if v_merged ? v_menu_item_id::text then
      v_merged := jsonb_set(
        v_merged,
        array[v_menu_item_id::text],
        to_jsonb(v_quantity)
      );
    else
      v_merged := v_merged || jsonb_build_object(v_menu_item_id::text, v_quantity);
      v_merged_count := v_merged_count + 1;

      if v_merged_count > c_max_line_items then
        raise exception 'An order may contain at most % different items.',
          c_max_line_items
          using errcode = '22023';
      end if;
    end if;
  end loop;

  if v_merged_count = 0 then
    raise exception 'Your cart is empty.'
      using errcode = '22023';
  end if;

  -- -------------------------------------------------------------------
  -- 5. Validate every item and derive the money from the menu.
  --
  --    FOR SHARE takes a row lock on each menu item for the remainder of
  --    this transaction, so a restaurant editing a price at the same
  --    moment cannot change the number between this check and the insert
  --    below. The order either gets the price this loop approved, or it
  --    fails; it can never get a torn mixture.
  -- -------------------------------------------------------------------
  for v_element in
    select jsonb_each_text(v_merged)
  loop
    v_menu_item_id := v_element.key::bigint;
    v_quantity     := v_element.value::integer;

    select mi.restaurant_id, mi.available, mi.price
      into v_item_restaurant, v_available, v_price
      from public.restaurant_menu_items mi
     where mi.id = v_menu_item_id
       for share;

    if not found then
      raise exception 'An item in your cart no longer exists. Please review your cart.'
        using errcode = '22023';
    end if;

    if v_item_restaurant <> p_restaurant_id then
      raise exception 'An item in your cart does not belong to this restaurant. Please review your cart.'
        using errcode = '22023';
    end if;

    if not coalesce(v_available, false) then
      raise exception 'An item in your cart is no longer available. Please review your cart.'
        using errcode = '22023';
    end if;

    if v_price is null or v_price < 0 then
      raise exception 'An item in your cart does not have a valid price. Please contact Ewizzy support.'
        using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + (v_price * v_quantity);
  end loop;

  if v_subtotal > c_max_order_value then
    raise exception 'This order is too large to place online. Please contact Ewizzy support.'
      using errcode = '22023';
  end if;

  v_total := round(v_subtotal + v_delivery_fee, 2);

  -- -------------------------------------------------------------------
  -- 6. Write the order.
  --
  --    Every money column is filled from the loop above. The client
  --    never supplies any of them, so there is nothing for it to forge.
  --    status and payment_status are fixed here and the
  --    food_orders_guard_insert trigger from
  --    20261002000000_food_order_integrity.sql independently requires
  --    exactly these values, so the two agree by construction.
  -- -------------------------------------------------------------------
  insert into public.food_orders (
    customer_user_id,
    restaurant_id,
    delivery_address,
    delivery_latitude,
    delivery_longitude,
    subtotal,
    delivery_fee,
    total,
    status,
    payment_status,
    notes
  )
  values (
    v_uid,
    p_restaurant_id,
    v_address,
    p_delivery_latitude,
    p_delivery_longitude,
    v_subtotal,
    v_delivery_fee,
    v_total,
    'pending',
    'pending',
    v_notes
  )
  returning * into v_order;

  -- -------------------------------------------------------------------
  -- 7. Write the items, re-reading the price from the same locked rows.
  --
  --    unit_price and item_name_snapshot come from restaurant_menu_items,
  --    never from the request. This is the historical snapshot: a later
  --    price change does not rewrite these rows.
  -- -------------------------------------------------------------------
  insert into public.food_order_items (
    order_id,
    menu_item_id,
    item_name_snapshot,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order.id,
    mi.id,
    mi.name,
    mi.price,
    (e.value)::integer,
    round(mi.price * (e.value)::integer, 2)
  from jsonb_each_text(v_merged) e
  join public.restaurant_menu_items mi
    on mi.id = e.key::bigint
   and mi.restaurant_id = p_restaurant_id;

  get diagnostics v_inserted = row_count;

  -- An order with no food is exactly the failure this migration exists
  -- to prevent, so it is treated as a hard error rather than a success
  -- with a warning. The whole transaction rolls back with it.
  if v_inserted <> v_merged_count then
    raise exception 'Your order could not be saved with all of its items. Nothing was charged and no order was created.'
      using errcode = '22023';
  end if;

  -- -------------------------------------------------------------------
  -- 8. Return what was actually persisted, so the client can display the
  --    authoritative figures rather than re-deriving them from the cart.
  -- -------------------------------------------------------------------
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'menu_item_id', oi.menu_item_id,
               'name',        oi.item_name_snapshot,
               'unit_price',  oi.unit_price,
               'quantity',    oi.quantity,
               'line_total',  oi.line_total
             )
             order by oi.id
           ),
           '[]'::jsonb
         )
    into v_items_json
    from public.food_order_items oi
   where oi.order_id = v_order.id;

  return jsonb_build_object(
    'success',      true,
    'order_id',     v_order.id,
    'order_number', v_order.order_number,
    'status',       v_order.status,
    'subtotal',     v_order.subtotal,
    'delivery_fee', v_order.delivery_fee,
    'total',        v_order.total,
    'items',        v_items_json
  );
end;
$$;

-- EXECUTE is restricted to signed-in customers. The function body rejects
-- a null auth.uid() anyway, so this grant is belt and braces rather than
-- the only check.
revoke execute on function public.place_food_order(bigint, jsonb, text, text, numeric, numeric) from public;
revoke execute on function public.place_food_order(bigint, jsonb, text, text, numeric, numeric) from anon;
grant execute on function public.place_food_order(bigint, jsonb, text, text, numeric, numeric) to authenticated;

comment on function public.place_food_order(bigint, jsonb, text, text, numeric, numeric) is
  'Creates a food order and its items in one transaction. Prices, delivery fee, subtotal and total are derived from the database; the caller may only supply restaurant id, menu item ids, quantities, address, notes and location.';


-- =====================================================================
-- SECTION 2. Close the two-step INSERT path
--
-- The RLS layer is what makes the old flow unforgeable-or-absent, so the
-- policies that permitted it are removed here rather than merely
-- discouraged. Both are replaced by public.place_food_order(), which
-- derives every protected field server-side, so this is a strictly more
-- secure implementation of the same capability, not a removal of one.
--
--   food_orders
--     "Customers can create their own orders"
--       allowed a browser to INSERT any subtotal, delivery_fee, total,
--       status, payment_status, restaurant_id and rider_id it liked, for
--       itself. food_orders_guard_insert clamps status, payment_status and
--       rider_id, but it has no way to know the correct money, so the
--       totals were entirely client-controlled. Replaced by place_food_order.
--
--   food_order_items
--     "Customers can insert their own order items"
--       allowed a browser to append arbitrary unit_price and line_total
--       rows to any of its own orders at any time, including after
--       checkout, which corrupted the price snapshot. Replaced by
--       place_food_order.
--
-- PRESERVED
--   - Every SELECT policy, unchanged: customers can read their own orders
--     and items, restaurant owners can read theirs, riders can read
--     assigned and claimable deliveries (added by
--     20261002000000_food_order_integrity.sql).
--   - "Admins can manage all orders" and "Admins can manage all order
--     items" are FOR ALL, so they still cover INSERT and admin tooling is
--     unaffected.
--   - The customer UPDATE path used for cancellation is untouched.
--   - Table grants are left exactly as they were. Revoking INSERT from
--     the authenticated role would also block the admin policies above,
--     which are written FOR ALL to authenticated, so RLS alone is used to
--     close the door. With row level security enabled and no permissive
--     INSERT policy for a customer role, a direct INSERT matches no rows
--     and is rejected.
-- =====================================================================
drop policy if exists "Customers can create their own orders"
  on public.food_orders;

drop policy if exists "Customers can insert their own order items"
  on public.food_order_items;

-- One index is worth having for the new read path: place_food_order's final
-- summary query filters food_order_items by order_id, and this keeps that
-- lookup index-driven.
create index if not exists idx_food_order_items_order_snapshot
  on public.food_order_items (order_id, menu_item_id);


-- =====================================================================
-- END OF MIGRATION
--
-- The client calls this through the Supabase SDK:
--
--   supabase.rpc('place_food_order', {
--     p_restaurant_id: 12,
--     p_items: [{ menu_item_id: 44, quantity: 2 }],
--     p_delivery_address: '12 Allen Avenue, Ikeja',
--     p_notes: 'No onions please',
--     p_delivery_latitude: 6.6045,
--     p_delivery_longitude: 3.3515,
--   })
--
-- No price, subtotal, fee, total, status or payment field is sent, because
-- the database owns all of them.
--
-- END OF MIGRATION
-- =====================================================================
