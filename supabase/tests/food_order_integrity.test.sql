-- =====================================================================
-- Ewizzy — Food order integrity: pgTAP verification suite
-- =====================================================================
--
-- Companion to:
--   supabase/migrations/20261002000000_food_order_integrity.sql
--
-- PURPOSE
--   Proves the migration enforces what it claims. The migration is
--   deliberately NOT self-testing, so a failing assertion can never roll
--   back a correct schema change.
--
-- HOW TO RUN
--   Local (recommended — never points at production):
--        supabase test db
--   Single file against a throwaway local database:
--        psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--          -f supabase/tests/food_order_integrity.test.sql
--
--   The runner executes every supabase/tests/*.test.sql in filename
--   order and fails the command if any TAP assertion fails.
--
-- SAFETY
--   - Opens BEGIN, ends with ROLLBACK.
--   - Fixtures, helper functions and all side effects are discarded.
--   - Nothing is committed, deployed or pushed.
--
-- IDENTITY SWITCHING
--   Row-level security is only enforced for a non-owner role, so each
--   test switches to `authenticated` and sets the JWT sub claim, which is
--   what auth.uid() reads. Everything runs inside one transaction, so the
--   SET LOCAL values are confined to it.
--
--   ez_food_test_reset_identity() clears the role AND the JWT claim. The
--   claim must be cleared too: `set role none` restores the table owner
--   but auth.uid() would otherwise still return the previous rider, which
--   would make owner writes look like rider writes. It is also called
--   again before every assertion, so pgtap's own reporting functions
--   always run as the session user.
--
-- NOTE ON THE GUARD TRIGGERS
--   Both food_orders guard triggers only enforce when auth.uid() is not
--   null. The table owner, service_role and the migration runner have
--   auth.uid() = null and are trusted, which is the same trust model
--   Supabase already applies to RLS bypass.
--
-- CONCURRENCY NOTE
--   "Only one rider can claim" is verified sequentially: the second
--   claimant must be rejected. Truly simultaneous claims need two
--   concurrent sessions and cannot be proven from a single script. The
--   guarantee rests on the single conditional UPDATE in
--   claim_food_order(), which PostgreSQL re-evaluates against the
--   committed row after the row lock is released.
--
-- EXPECTED RESULT
--   39 test cases across 39 DO blocks, producing 40 pgtap assertions,
--   all passing. D3 emits two assertions (D3 and D3b) from one block, so
--   the assertion count is one higher than the case count. Four other ok()
--   call sites sit in early-return exception paths (A2, A5, C1, E4) and
--   can never run alongside their sibling assertion, so they add nothing
--   to the total.
--
--   The count is declared up front with plan() and verified by finish();
--   pgtap fails the run on any mismatch, so a dropped or duplicated
--   assertion cannot pass silently.
-- =====================================================================

begin;

-- pgtap may not be installed yet. The IF NOT EXISTS clause makes this a
-- no-op when the runner already created it. The schema clause puts it
-- where Supabase expects; the search_path below covers either location.
create extension if not exists pgtap with schema extensions;

set search_path = public, extensions, pg_temp;

select plan(40);


-- ---------------------------------------------------------------------
-- Harness
--
-- pgtap keeps its own counters and result set, so only a lookup table for
-- the fixture identifiers is needed here.
-- ---------------------------------------------------------------------
create temp table ez_food_ids (
  key   text primary key,
  value text
) on commit drop;

-- Run as the session user with no JWT identity.
create or replace function public.ez_food_test_reset_identity()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim', '', true);
end;
$$;

-- Run as an authenticated user with the given auth.uid().
create or replace function public.ez_food_test_act_as(p_uid uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end;
$$;

grant execute on function public.ez_food_test_reset_identity() to authenticated;
grant execute on function public.ez_food_test_act_as(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- FIXTURES
--
-- Created as the table owner with row-level security bypassed. The
-- BEFORE INSERT guard is disabled while seeding so fixtures can be
-- written directly in non-'pending' states, then re-enabled so every
-- behavioural test runs with the real guard active.
--
-- food_orders_set_order_number is deliberately LEFT enabled, so the
-- fixtures exercise real order_number generation.
-- ---------------------------------------------------------------------
do $$
declare
  v_c1      uuid := gen_random_uuid();
  v_c2      uuid := gen_random_uuid();
  v_r1_user uuid := gen_random_uuid();
  v_r2_user uuid := gen_random_uuid();
  v_roff    uuid := gen_random_uuid();
  v_rinact  uuid := gen_random_uuid();
  v_owner   uuid := gen_random_uuid();

  v_rest   bigint;
  v_r1     bigint;
  v_r2     bigint;
  v_ro     bigint;
  v_rinact bigint;

  v_pending     bigint;
  v_pending2    bigint;
  v_pending3    bigint;
  v_ready1      bigint;
  v_ready2      bigint;
  v_ready3      bigint;
  v_assigned1   bigint;
  v_skipped     bigint;
  v_ridercancel bigint;
  v_delivered   bigint;
  v_cancelled   bigint;
begin
  insert into public.restaurants (
    owner_user_id, name, description, cuisine, delivery_fee,
    estimated_delivery_minutes, rating, address, city,
    is_active, is_open
  ) values (
    v_owner, 'Test Kitchen', 'Fixture restaurant', 'Nigerian Food', 500,
    35, 4.5, '1 Test Street', 'Lagos',
    true, true
  ) returning id into v_rest;

  insert into public.riders (user_id, full_name, phone, vehicle_type, active, available)
  values (v_r1_user, 'Rider One', '08000000001', 'motorcycle', true, true)
  returning id into v_r1;

  insert into public.riders (user_id, full_name, phone, vehicle_type, active, available)
  values (v_r2_user, 'Rider Two', '08000000002', 'motorcycle', true, true)
  returning id into v_r2;

  insert into public.riders (user_id, full_name, phone, vehicle_type, active, available)
  values (v_roff, 'Rider Offline', '08000000003', 'motorcycle', true, false)
  returning id into v_ro;

  insert into public.riders (user_id, full_name, phone, vehicle_type, active, available)
  values (v_rinact, 'Rider Inactive', '08000000004', 'motorcycle', false, true)
  returning id into v_rinact;

  alter table public.food_orders disable trigger food_orders_guard_insert;

  -- Three pending orders owned by the same customer, each reserved for a
  -- distinct test so no test consumes another's fixture:
  --   order_pending   customer cancellation and audit tests
  --   order_pending2  customer cross-tenant test and audit-forgery test
  --   order_pending3  restaurant cancellation test
  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 7500, 500, 8000, 'pending', 'pending')
  returning id into v_pending;

  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 7500, 500, 8000, 'pending', 'pending')
  returning id into v_pending2;

  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 7500, 500, 8000, 'pending', 'pending')
  returning id into v_pending3;

  -- Claimable deliveries.
  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'ready_for_pickup', 'pending')
  returning id into v_ready1;

  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'ready_for_pickup', 'pending')
  returning id into v_ready2;

  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'ready_for_pickup', 'pending')
  returning id into v_ready3;

  -- Assigned to rider 1 at ready_for_pickup: the claim-equivalent state.
  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status, rider_id)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'ready_for_pickup', 'pending', v_r1)
  returning id into v_assigned1;

  -- Assigned to rider 1 and already picked up. Seeding a mid-lifecycle
  -- state directly avoids having to rewind a delivered order, which the
  -- terminal-state rules correctly forbid.
  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status, rider_id)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'picked_up', 'pending', v_r1)
  returning id into v_skipped;

  -- Assigned to rider 1 and still ready_for_pickup. ready_for_pickup ->
  -- cancelled is a LEGAL transition, so this fixture isolates the
  -- "who may cancel" rule from the transition rule.
  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status, rider_id)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'ready_for_pickup', 'pending', v_r1)
  returning id into v_ridercancel;

  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'delivered', 'pending')
  returning id into v_delivered;

  insert into public.food_orders (customer_user_id, restaurant_id, delivery_address, subtotal, delivery_fee, total, status, payment_status, cancelled_at)
  values (v_c1, v_rest, '1 Customer Way', 5000, 500, 5500, 'cancelled', 'pending', now())
  returning id into v_cancelled;

  alter table public.food_orders enable trigger food_orders_guard_insert;

  insert into public.food_order_items (order_id, item_name_snapshot, unit_price, quantity, line_total)
  values (v_assigned1, 'Jollof Rice & Chicken', 7500, 1, 7500);

  insert into public.food_order_items (order_id, item_name_snapshot, unit_price, quantity, line_total)
  values (v_skipped, 'Pounded Yam & Egusi Soup', 6500, 1, 6500);

  insert into public.food_order_items (order_id, item_name_snapshot, unit_price, quantity, line_total)
  values (v_pending, 'Jollof Rice & Chicken', 7500, 1, 7500);

  insert into ez_food_ids values
    ('customer1',          v_c1::text),
    ('customer2',          v_c2::text),
    ('rider1_user',        v_r1_user::text),
    ('rider2_user',        v_r2_user::text),
    ('rider_offline_user', v_roff::text),
    ('rider_inactive_user',v_rinact::text),
    ('owner_user',         v_owner::text),
    ('rider1_id',          v_r1::text),
    ('rider2_id',          v_r2::text),
    ('order_pending',      v_pending::text),
    ('order_pending2',     v_pending2::text),
    ('order_pending3',     v_pending3::text),
    ('order_ready1',       v_ready1::text),
    ('order_ready2',       v_ready2::text),
    ('order_ready3',       v_ready3::text),
    ('order_assigned1',    v_assigned1::text),
    ('order_skipped',      v_skipped::text),
    ('order_ridercancel',  v_ridercancel::text),
    ('order_delivered',    v_delivered::text),
    ('order_cancelled',    v_cancelled::text);
end
$$;


-- =====================================================================
-- GROUP A — customer permissions
-- =====================================================================

-- A1. A customer may NOT mark their own pending order 'delivered'.
do $$
declare
  v_c1 uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_c1    from ez_food_ids where key = 'customer1';
  select value::bigint into v_order from ez_food_ids where key = 'order_pending';

  perform public.ez_food_test_act_as(v_c1);

  begin
    update public.food_orders set status = 'delivered' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass := (v_count = 0);
    v_detail := case
      when v_count = 0
        then '0 rows affected: the destination status is constrained by RLS WITH CHECK'
      else v_count || ' row(s) updated but the update should have been rejected'
    end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected with an error: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'A1 customer cannot mark delivered - ' || v_detail);
end
$$;

-- A2. A customer CAN cancel their own pending order, and the database
--     supplies cancelled_at / cancelled_by itself.
do $$
declare
  v_c1 uuid;
  v_order bigint;
  v_status text;
  v_ts timestamptz;
  v_by uuid;
  v_reason text;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_c1    from ez_food_ids where key = 'customer1';
  select value::bigint into v_order from ez_food_ids where key = 'order_pending';

  perform public.ez_food_test_act_as(v_c1);

  begin
    update public.food_orders
       set status = 'cancelled', cancel_reason = 'Changed my mind'
     where id = v_order;
  exception when others then
    perform public.ez_food_test_reset_identity();
    perform ok(false, 'A2 customer can cancel eligible order - unexpected failure: ' || sqlerrm);
    return;
  end;

  perform public.ez_food_test_reset_identity();
  select status, cancelled_at, cancelled_by, cancel_reason
    into v_status, v_ts, v_by, v_reason
    from public.food_orders
   where id = v_order;

  v_pass := (v_status = 'cancelled'
             and v_ts is not null
             and v_by = v_c1
             and v_reason = 'Changed my mind');

  v_detail := case
    when v_pass
      then 'cancelled; cancelled_at and cancelled_by were set by the trigger'
    else format('status=%s cancelled_at=%s cancelled_by=%s reason=%s',
                v_status, v_ts, v_by, v_reason)
  end;

  perform ok(v_pass, 'A2 customer can cancel eligible order - ' || v_detail);
end
$$;

-- A3. A cancelled order is terminal for the customer: it cannot be
--     cancelled again. Re-cancelling is rejected by RLS rather than by an
--     error, because the USING clause only exposes a still-'pending' row,
--     so BOTH outcomes count as a rejection.
do $$
declare
  v_c1 uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_c1    from ez_food_ids where key = 'customer1';
  select value::bigint into v_order from ez_food_ids where key = 'order_pending';

  perform public.ez_food_test_act_as(v_c1);

  begin
    update public.food_orders set status = 'cancelled' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass := (v_count = 0);
    v_detail := case
      when v_count = 0
        then '0 rows affected: the cancelled order is no longer visible to the customer policy'
      else v_count || ' row(s) updated: a cancelled order must not be modifiable'
    end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'A3 customer cannot re-cancel a cancelled order - ' || v_detail);
end
$$;

-- A4. A customer may NOT touch an order belonging to somebody else.
do $$
declare
  v_c2 uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_c2    from ez_food_ids where key = 'customer2';
  select value::bigint into v_order from ez_food_ids where key = 'order_pending2';

  perform public.ez_food_test_act_as(v_c2);

  begin
    update public.food_orders set status = 'cancelled' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass := (v_count = 0);
    v_detail := case
      when v_count = 0
        then '0 rows affected: RLS hides the other customer''s order'
      else 'LEAK: ' || v_count || ' row(s) updated by a non-owner'
    end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'A4 customer cannot cancel another customer order - ' || v_detail);
end
$$;

-- A5. A customer may NOT fabricate the cancellation audit fields.
--     The update itself succeeds, but the trigger must overwrite both the
--     actor and the timestamp with server-side values.
do $$
declare
  v_c1 uuid;
  v_forged uuid := gen_random_uuid();
  v_order bigint;
  v_by uuid;
  v_ts timestamptz;
  v_forged_ts timestamptz := '2000-01-01 00:00:00+00'::timestamptz;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_c1    from ez_food_ids where key = 'customer1';
  select value::bigint into v_order from ez_food_ids where key = 'order_pending2';

  perform public.ez_food_test_act_as(v_c1);

  begin
    update public.food_orders
       set status = 'cancelled',
           cancelled_at = v_forged_ts,
           cancelled_by = v_forged,
           cancel_reason = 'Forged audit'
     where id = v_order;
  exception when others then
    perform public.ez_food_test_reset_identity();
    perform ok(false, 'A5 customer cannot forge cancellation audit fields - the update failed unexpectedly: ' || sqlerrm);
    return;
  end;

  perform public.ez_food_test_reset_identity();
  select cancelled_by, cancelled_at into v_by, v_ts
    from public.food_orders where id = v_order;

  v_pass := (v_by = v_c1 and v_ts is not null and v_ts <> v_forged_ts);

  v_detail := case
    when v_pass
      then 'forged actor and timestamp were both replaced by the trigger'
    else format('cancelled_by=%s (expected %s) cancelled_at=%s (forged was %s)',
                v_by, v_c1, v_ts, v_forged_ts)
  end;

  perform ok(v_pass, 'A5 customer cannot forge cancellation audit fields - ' || v_detail);
end
$$;


-- =====================================================================
-- GROUP B — rider visibility
-- =====================================================================

-- B1. A rider can see claimable (ready_for_pickup, unassigned) orders.
do $$
declare
  v_user uuid;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid into v_user from ez_food_ids where key = 'rider1_user';

  perform public.ez_food_test_act_as(v_user);

  begin
    select count(*) into v_seen
      from public.food_orders
     where status = 'ready_for_pickup' and rider_id is null;
  exception when others then
    perform public.ez_food_test_reset_identity();
    perform ok(false, 'B1 rider can see claimable orders - unexpected failure: ' || sqlerrm);
    return;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_seen > 0,
    'B1 rider can see claimable orders - ' ||
    case when v_seen > 0
         then v_seen || ' claimable order(s) visible'
         else 'no claimable orders visible to the rider' end);
end
$$;

-- B2. A rider can see an order assigned to them.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_assigned1';

  perform public.ez_food_test_act_as(v_user);
  select count(*) into v_seen from public.food_orders where id = v_order;
  perform public.ez_food_test_reset_identity();

  perform ok(v_seen = 1, 'B2 rider can see their assigned order - ' ||
    case when v_seen = 1
         then 'assigned order visible'
         else 'expected 1 visible row, got ' || v_seen end);
end
$$;

-- B3. A rider can see the line items of their assigned order.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_assigned1';

  perform public.ez_food_test_act_as(v_user);
  select count(*) into v_seen
    from public.food_order_items where order_id = v_order;
  perform public.ez_food_test_reset_identity();

  perform ok(v_seen = 1, 'B3 rider can see assigned order items - ' ||
    case when v_seen = 1
         then 'order items visible'
         else 'expected 1 item row, got ' || v_seen end);
end
$$;

-- B4. A rider can NOT see an order assigned to a different rider.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider2_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_assigned1';

  perform public.ez_food_test_act_as(v_user);
  select count(*) into v_seen from public.food_orders where id = v_order;
  perform public.ez_food_test_reset_identity();

  perform ok(v_seen = 0, 'B4 rider cannot see another rider order - ' ||
    case when v_seen = 0
         then 'the other rider''s order is invisible'
         else 'LEAK: the other rider''s order is visible' end);
end
$$;

-- B5. A rider can NOT see the line items of another rider's order.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider2_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_assigned1';

  perform public.ez_food_test_act_as(v_user);
  select count(*) into v_seen
    from public.food_order_items where order_id = v_order;
  perform public.ez_food_test_reset_identity();

  perform ok(v_seen = 0, 'B5 rider cannot see another rider order items - ' ||
    case when v_seen = 0
         then 'the other rider''s items are invisible'
         else 'LEAK: the other rider''s items are visible' end);
end
$$;

-- B6. An offline rider sees no claimable orders.
do $$
declare
  v_user uuid;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid into v_user from ez_food_ids where key = 'rider_offline_user';

  perform public.ez_food_test_act_as(v_user);
  select count(*) into v_seen
    from public.food_orders
   where status = 'ready_for_pickup' and rider_id is null;
  perform public.ez_food_test_reset_identity();

  perform ok(v_seen = 0, 'B6 offline rider sees no claimable orders - ' ||
    case when v_seen = 0
         then 'the delivery board is hidden while the rider is offline'
         else 'LEAK: offline rider can see ' || v_seen || ' claimable order(s)' end);
end
$$;

-- B7. The rider "available" policy must not leak to a plain customer.
--     Note this checks claimable orders belonging to a DIFFERENT customer,
--     because a customer may legitimately see their own orders through
--     the customer SELECT policy.
do $$
declare
  v_user uuid;
  v_seen integer;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid into v_user from ez_food_ids where key = 'customer2';

  perform public.ez_food_test_act_as(v_user);
  select count(*) into v_seen
    from public.food_orders
   where status = 'ready_for_pickup'
     and rider_id is null
     and customer_user_id <> v_user;
  perform public.ez_food_test_reset_identity();

  perform ok(v_seen = 0, 'B7 non-rider does not get the rider delivery board - ' ||
    case when v_seen = 0
         then 'a customer sees no claimable orders belonging to other customers'
         else 'LEAK: a customer can see ' || v_seen || ' foreign claimable order(s)' end);
end
$$;


-- =====================================================================
-- GROUP C — claiming
-- =====================================================================

-- C1. An available rider can claim a claimable order, and the status
--     stays 'ready_for_pickup'.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_status text;
  v_rid bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready1';

  perform public.ez_food_test_act_as(v_user);

  begin
    select o.status, o.rider_id into v_status, v_rid
      from public.claim_food_order(v_order) o;
  exception when others then
    perform public.ez_food_test_reset_identity();
    perform ok(false, 'C1 rider can claim a ready_for_pickup order - unexpected failure: ' || sqlerrm);
    return;
  end;

  perform public.ez_food_test_reset_identity();
  v_pass := (v_rid is not null and v_status = 'ready_for_pickup');

  v_detail := case
    when v_pass
      then format('claimed by rider_id=%s, status unchanged as %s', v_rid, v_status)
    else format('rider_id=%s status=%s (status must stay ready_for_pickup)', v_rid, v_status)
  end;

  perform ok(v_pass, 'C1 rider can claim a ready_for_pickup order - ' || v_detail);
end
$$;

-- C2. A second rider CANNOT claim an order that is already claimed.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_pass boolean := false;
  v_detail text := 'SECOND CLAIM SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider2_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready1';

  perform public.ez_food_test_act_as(v_user);

  begin
    perform public.claim_food_order(v_order);
  exception when others then
    v_pass   := true;
    v_detail := 'second claim rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'C2 only one rider can claim an order - ' || v_detail);
end
$$;

-- C3. An offline rider cannot claim.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_pass boolean := false;
  v_detail text := 'offline rider SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider_offline_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready2';

  perform public.ez_food_test_act_as(v_user);

  begin
    perform public.claim_food_order(v_order);
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'C3 unavailable rider cannot claim - ' || v_detail);
end
$$;

-- C4. An inactive rider cannot claim.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_pass boolean := false;
  v_detail text := 'inactive rider SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider_inactive_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready2';

  perform public.ez_food_test_act_as(v_user);

  begin
    perform public.claim_food_order(v_order);
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'C4 inactive rider cannot claim - ' || v_detail);
end
$$;

-- C5. A user who is not a rider cannot claim.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_pass boolean := false;
  v_detail text := 'non-rider SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'customer1';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready2';

  perform public.ez_food_test_act_as(v_user);

  begin
    perform public.claim_food_order(v_order);
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'C5 non-rider cannot claim - ' || v_detail);
end
$$;

-- C6. A rider can NOT self-assign an unclaimed order with a direct
--     UPDATE. Note this does NOT raise: row-level security simply matches
--     no rows, so the row count is the assertion.
do $$
declare
  v_user uuid;
  v_rider bigint;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_rider from ez_food_ids where key = 'rider1_id';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready2';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set rider_id = v_rider where id = v_order;
    get diagnostics v_count = row_count;
    v_pass := (v_count = 0);
    v_detail := case
      when v_count = 0
        then '0 rows affected: claiming must go through claim_food_order()'
      else 'LEAK: direct UPDATE assigned ' || v_count || ' order(s)'
    end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'C6 rider cannot self-assign via direct update - ' || v_detail);
end
$$;

-- C7. A rider can NOT steal an order assigned to somebody else.
do $$
declare
  v_user uuid;
  v_rider bigint;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider2_user';
  select value::bigint into v_rider from ez_food_ids where key = 'rider2_id';
  select value::bigint into v_order from ez_food_ids where key = 'order_assigned1';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set rider_id = v_rider where id = v_order;
    get diagnostics v_count = row_count;
    v_pass := (v_count = 0);
    v_detail := case
      when v_count = 0
        then '0 rows affected: the WITH CHECK clause pins rider_id'
      else 'LEAK: reassigned ' || v_count || ' order(s)'
    end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'C7 rider cannot steal another rider order - ' || v_detail);
end
$$;


-- =====================================================================
-- GROUP D — rider update restrictions
-- =====================================================================

-- D1. The assigned rider CAN advance the delivery one step at a time.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_ok integer := 0;
  v_fail text := '';
  v_status text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_assigned1';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set status = 'picked_up' where id = v_order;         v_ok := v_ok + 1;
  exception when others then v_fail := v_fail || ' [to picked_up: ' || sqlerrm || ']'; end;

  begin
    update public.food_orders set status = 'out_for_delivery' where id = v_order;  v_ok := v_ok + 1;
  exception when others then v_fail := v_fail || ' [to out_for_delivery: ' || sqlerrm || ']'; end;

  begin
    update public.food_orders set status = 'delivered' where id = v_order;         v_ok := v_ok + 1;
  exception when others then v_fail := v_fail || ' [to delivered: ' || sqlerrm || ']'; end;

  perform public.ez_food_test_reset_identity();
  select status into v_status from public.food_orders where id = v_order;

  perform ok(v_ok = 3 and v_status = 'delivered',
    'D1 rider can progress a delivery to delivered - ' ||
    case when v_ok = 3 and v_status = 'delivered'
         then 'ready_for_pickup -> picked_up -> out_for_delivery -> delivered all accepted'
         else v_ok || '/3 transitions accepted, final status=' || v_status || v_fail end);
end
$$;

-- D2. The assigned rider can NOT skip a status
--     (picked_up -> delivered directly).
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'the skipping update SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_skipped';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set status = 'delivered' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case
      when v_count = 0
        then '0 rows affected: the illegal transition was filtered'
      else v_detail
    end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D2 rider cannot skip a status - ' || v_detail);
end
$$;

-- D3. The assigned rider can NOT change protected money fields, even
--     without touching the status.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'changing total SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_skipped';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set total = 1 where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: changing total was filtered'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D3 rider cannot change protected money fields - ' || v_detail);

  -- D3b. The same rule for subtotal and delivery_fee.
  perform public.ez_food_test_act_as(v_user);
  v_pass   := false;
  v_detail := 'changing subtotal/delivery_fee SUCCEEDED but should have been rejected';

  begin
    update public.food_orders set subtotal = 1, delivery_fee = 0 where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: changing subtotal/delivery_fee was filtered'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D3b rider cannot change subtotal or delivery fee - ' || v_detail);
end
$$;

-- D4. The assigned rider can NOT change the delivery address.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'changing delivery_address SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_skipped';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set delivery_address = 'Hijacked' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: changing delivery_address was filtered'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D4 rider cannot change the delivery address - ' || v_detail);
end
$$;

-- D5. The assigned rider can NOT set the cancellation audit fields.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'writing cancelled_at/cancelled_by SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_skipped';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders
       set cancelled_at = '2000-01-01 00:00:00+00'::timestamptz,
           cancelled_by = v_user
     where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: writing the audit columns was filtered'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D5 rider cannot set cancellation audit fields - ' || v_detail);
end
$$;

-- D6. The assigned rider can NOT cancel their own delivery. This order is
--     at ready_for_pickup, where -> cancelled is a legal transition, so
--     the rejection comes from the "who may cancel" rule rather than from
--     the transition rule.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'the cancel SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ridercancel';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set status = 'cancelled' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: the rider has no cancellation rights'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D6 rider cannot cancel their own delivery - ' || v_detail);
end
$$;

-- D7. A same-status no-op update is still accepted for the assigned
--     rider, so the guard never blocks a harmless write.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'rider1_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_skipped';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set status = status where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 1);
    v_detail := case when v_count = 1
                      then 'no-op update accepted'
                      else v_count || ' row(s) affected, expected 1' end;
  exception when others then
    v_pass   := false;
    v_detail := 'unexpected failure: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'D7 same-status update by assigned rider is allowed - ' || v_detail);
end
$$;


-- =====================================================================
-- GROUP E — terminal states and restaurant permissions
-- =====================================================================

-- E1. A delivered order is terminal and cannot be moved back.
do $$
declare
  v_owner uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'reopening a delivered order SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_owner from ez_food_ids where key = 'owner_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_delivered';

  perform public.ez_food_test_act_as(v_owner);

  begin
    update public.food_orders set status = 'out_for_delivery' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: the terminal state was enforced'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'E1 delivered order is terminal - ' || v_detail);
end
$$;

-- E2. A cancelled order is terminal and cannot be revived.
do $$
declare
  v_owner uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'reviving a cancelled order SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_owner from ez_food_ids where key = 'owner_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_cancelled';

  perform public.ez_food_test_act_as(v_owner);

  begin
    update public.food_orders set status = 'pending' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: the terminal state was enforced'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'E2 cancelled order is terminal - ' || v_detail);
end
$$;

-- E3. Restaurant owner permissions are preserved: the owner can still
--     advance their own order one step at a time.
do $$
declare
  v_owner uuid;
  v_order bigint;
  v_ok integer := 0;
  v_fail text := '';
  v_status text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_owner from ez_food_ids where key = 'owner_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready3';

  perform public.ez_food_test_act_as(v_owner);

  begin
    update public.food_orders set status = 'picked_up' where id = v_order;        v_ok := v_ok + 1;
  exception when others then v_fail := v_fail || ' [to picked_up: ' || sqlerrm || ']'; end;

  begin
    update public.food_orders set status = 'out_for_delivery' where id = v_order; v_ok := v_ok + 1;
  exception when others then v_fail := v_fail || ' [to out_for_delivery: ' || sqlerrm || ']'; end;

  begin
    update public.food_orders set status = 'delivered' where id = v_order;        v_ok := v_ok + 1;
  exception when others then v_fail := v_fail || ' [to delivered: ' || sqlerrm || ']'; end;

  perform public.ez_food_test_reset_identity();
  select status into v_status from public.food_orders where id = v_order;

  perform ok(v_ok = 3 and v_status = 'delivered',
    'E3 restaurant owner permissions preserved - ' ||
    case when v_ok = 3 and v_status = 'delivered'
         then 'restaurant status transitions all accepted'
         else v_ok || '/3 accepted, final=' || v_status || v_fail end);
end
$$;

-- E4. A restaurant owner can still cancel a pending order, and the
--     database records the actor.
do $$
declare
  v_owner uuid;
  v_order bigint;
  v_by uuid;
  v_ts timestamptz;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_owner from ez_food_ids where key = 'owner_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_pending3';

  perform public.ez_food_test_act_as(v_owner);

  begin
    update public.food_orders
       set status = 'cancelled', cancel_reason = 'Item out of stock'
     where id = v_order;
  exception when others then
    perform public.ez_food_test_reset_identity();
    perform ok(false, 'E4 restaurant can cancel a pending order - unexpected failure: ' || sqlerrm);
    return;
  end;

  perform public.ez_food_test_reset_identity();
  select cancelled_by, cancelled_at into v_by, v_ts
    from public.food_orders where id = v_order;

  v_pass := (v_ts is not null and v_by = v_owner);
  v_detail := case
    when v_pass then 'cancelled; actor recorded by the trigger'
    else format('cancelled_by=%s cancelled_at=%s', v_by, v_ts)
  end;

  perform ok(v_pass, 'E4 restaurant can cancel a pending order - ' || v_detail);
end
$$;

-- E5. A restaurant owner can NOT skip statuses on their own order.
do $$
declare
  v_owner uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean := false;
  v_detail text := 'ready_for_pickup -> delivered SUCCEEDED but should have been rejected';
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_owner from ez_food_ids where key = 'owner_user';
  select value::bigint into v_order from ez_food_ids where key = 'order_ready2';

  perform public.ez_food_test_act_as(v_owner);

  begin
    update public.food_orders set status = 'delivered' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected: the skipped transition was filtered'
                      else v_detail end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'E5 restaurant cannot skip statuses - ' || v_detail);
end
$$;

-- E6. A restaurant owner can NOT edit a rival restaurant's order.
do $$
declare
  v_user uuid;
  v_order bigint;
  v_count bigint;
  v_pass boolean;
  v_detail text;
begin
  perform public.ez_food_test_reset_identity();
  select value::uuid   into v_user  from ez_food_ids where key = 'customer2';
  select value::bigint into v_order from ez_food_ids where key = 'order_skipped';

  perform public.ez_food_test_act_as(v_user);

  begin
    update public.food_orders set status = 'delivered' where id = v_order;
    get diagnostics v_count = row_count;
    v_pass   := (v_count = 0);
    v_detail := case when v_count = 0
                      then '0 rows affected'
                      else 'LEAK: ' || v_count || ' row(s) updated' end;
  exception when others then
    v_pass   := true;
    v_detail := 'rejected: ' || sqlerrm;
  end;

  perform public.ez_food_test_reset_identity();
  perform ok(v_pass, 'E6 unrelated user cannot update an order - ' || v_detail);
end
$$;


-- =====================================================================
-- GROUP F — order_number and schema state
-- =====================================================================

-- F1. order_number was generated in the expected EZ-000001 format.
do $$
declare
  v_total integer;
  v_bad integer;
  v_sample text;
begin
  perform public.ez_food_test_reset_identity();

  select count(*) into v_total
    from public.food_orders
   where id in (select value::bigint from ez_food_ids where key like 'order_%');

  select count(*) into v_bad
    from public.food_orders
   where id in (select value::bigint from ez_food_ids where key like 'order_%')
     and (order_number is null or order_number !~ '^EZ-[0-9]{6,}$');

  select order_number into v_sample
    from public.food_orders
   where id in (select value::bigint from ez_food_ids where key like 'order_%')
   order by id
   limit 1;

  perform ok(v_total > 0 and v_bad = 0,
    'F1 order_number generated in EZ-000001 format - ' ||
    case when v_total > 0 and v_bad = 0
         then v_total || ' order(s) numbered, e.g. ' || coalesce(v_sample, '(none)')
         else v_bad || ' of ' || v_total || ' orders have a malformed order_number' end);
end
$$;

-- F2. order_number is NOT NULL and UNIQUE in the live schema.
do $$
declare
  v_not_null boolean;
  v_unique   boolean;
begin
  perform public.ez_food_test_reset_identity();

  select is_nullable = 'NO' into v_not_null
    from information_schema.columns
   where table_schema = 'public' and table_name = 'food_orders'
     and column_name = 'order_number';

  select count(*) = 1 into v_unique
    from pg_indexes
   where schemaname = 'public' and tablename = 'food_orders'
     and indexdef ilike '%unique%order_number%';

  perform ok(coalesce(v_not_null, false) and coalesce(v_unique, false),
    'F2 order_number is NOT NULL and UNIQUE - ' ||
    case when coalesce(v_not_null, false) and coalesce(v_unique, false)
         then 'NOT NULL constraint and unique index both present'
         else format('not_null=%s unique_index=%s', v_not_null, v_unique) end);
end
$$;

-- F3. The broken rider policies are gone and the new ones are installed.
do $$
declare
  v_broken integer;
  v_new    integer;
begin
  perform public.ez_food_test_reset_identity();

  select count(*) into v_broken
    from pg_policies
   where schemaname = 'public' and tablename = 'food_orders'
     and policyname in ('Riders can view assigned deliveries',
                        'Riders can update assigned delivery status');

  select count(*) into v_new
    from pg_policies
   where schemaname = 'public' and tablename = 'food_orders'
     and policyname in ('Riders can view available food deliveries',
                        'Riders can view their assigned food deliveries',
                        'Riders can update their assigned food deliveries');

  perform ok(v_broken = 0 and v_new = 3,
    'F3 broken rider policies replaced - ' ||
    case when v_broken = 0 and v_new = 3
         then '0 broken policies remain, 3 new rider policies installed'
         else format('broken_remaining=%s new_present=%s (expected 0 and 3)', v_broken, v_new) end);
end
$$;

-- F4. The old customer policy is gone and the cancel-only policy is in.
do $$
declare
  v_old integer;
  v_new integer;
begin
  perform public.ez_food_test_reset_identity();

  select count(*) into v_old
    from pg_policies
   where schemaname = 'public' and tablename = 'food_orders'
     and policyname = 'Customers can update their own pending orders';

  select count(*) into v_new
    from pg_policies
   where schemaname = 'public' and tablename = 'food_orders'
     and policyname = 'Customers can cancel their own pending orders';

  perform ok(v_old = 0 and v_new = 1,
    'F4 customer cancel-only policy installed - ' ||
    case when v_old = 0 and v_new = 1
         then 'old permissive policy removed, cancel-only policy present'
         else format('old_present=%s new_present=%s (expected 0 and 1)', v_old, v_new) end);
end
$$;

-- F5. The rider_id foreign key exists.
do $$
declare
  v_fk integer;
begin
  perform public.ez_food_test_reset_identity();

  select count(*) into v_fk
    from pg_constraint
   where conrelid = 'public.food_orders'::regclass
     and contype = 'f'
     and conname = 'food_orders_rider_id_fkey';

  perform ok(v_fk = 1,
    'F5 food_orders.rider_id foreign key installed - ' ||
    case when v_fk = 1
         then 'food_orders_rider_id_fkey present with ON DELETE SET NULL'
         else 'food_orders_rider_id_fkey is missing' end);
end
$$;

-- F6. No orphan rider_id values remain.
do $$
declare
  v_orphans integer;
begin
  perform public.ez_food_test_reset_identity();

  select count(*) into v_orphans
    from public.food_orders o
   where o.rider_id is not null
     and not exists (select 1 from public.riders r where r.id = o.rider_id);

  perform ok(v_orphans = 0,
    'F6 no orphan rider_id values - ' ||
    case when v_orphans = 0
         then 'all rider_id values reference a real rider'
         else v_orphans || ' orphan rider_id value(s) remain' end);
end
$$;


-- =====================================================================
-- REPORT
--
-- finish() asserts the run produced exactly the 40 planned assertions.
-- A mismatch fails the file, so a dropped or duplicated assertion cannot
-- pass silently.
--
-- F6's block ends with ez_food_test_reset_identity(), so the session is
-- already back to the table owner and finish() reports unfiltered.
-- =====================================================================
select * from finish();


-- =====================================================================
-- Nothing is committed. Fixtures, helper functions and every side effect
-- are discarded by the ROLLBACK below.
-- =====================================================================
rollback;
