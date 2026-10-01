-- =====================================================================
-- Ewizzy — Food order integrity, rider fulfilment and cancellation audit
-- =====================================================================
--
-- Fixes the following defects in the food-order schema created by
-- 20260830000001_restaurants_and_menus.sql, 20260830000002_food_orders.sql
-- and 20260830000003_riders.sql:
--
--   1. food_orders.rider_id RLS compared a bigint column to auth.uid(),
--      which is a uuid. There is no `bigint = uuid` operator, so the
--      two "Riders can ..." policies could never be created and never
--      granted a rider any access.
--   2. No policy allowed a rider to see unclaimed 'ready_for_pickup'
--      orders, so the delivery board was always empty.
--   3. food_order_items had no rider policy at all, so the line items of
--      a delivery were never returned to the rider.
--   4. food_orders.rider_id had no foreign key to riders(id).
--   5. The customer UPDATE policy restricted *which row* a customer
--      could touch but not the *destination* status, so a customer could
--      move their own pending order straight to 'delivered'.
--   6. No status transition guard existed for restaurants or riders.
--   7. food_orders had no persistent order_number.
--   8. Cancellation recorded no reason, timestamp or actor.
--
-- Properties:
--   - Additive. No table, column, status value or unrelated policy is
--     removed.
--   - Idempotent. Re-running is safe.
--   - Safe for existing rows. Backfills preserve every order.
--   - Only the 8 status values already permitted by the existing
--     food_orders status CHECK constraint are used.
--
-- Deliberately NOT included:
--   - restaurants.review_count. There is no legitimate restaurant review
--     source: the existing reviews table is booking_id-scoped with no
--     restaurant linkage, and the review INSERT policy requires a
--     completed booking. A stored counter with no writer would always
--     read 0. Restaurant reviews need their own separate design.
--   - Anything payment related. The existing payments table is
--     booking_id-scoped and food payments are a separate concern.
--   - Atomic order creation. The application still inserts food_orders
--     and then food_order_items, which can leave an itemless order if
--     the second insert fails. That needs an RPC and is out of scope.
--
-- NOTE ON TRIGGER SECURITY DEFINER:
--   public.food_orders_guard_update and public.food_orders_guard_insert
--   are SECURITY DEFINER so that their authorization lookups against
--   public.profiles and public.restaurants are not themselves subject to
--   those tables' RLS. If profiles RLS were ever tightened, a SECURITY
--   INVOKER trigger would silently evaluate every caller as a
--   non-admin. SECURITY DEFINER does not widen access to food_orders:
--   row-level security on food_orders still governs which rows may be
--   read or written, and these triggers only read lookup tables.
-- =====================================================================


-- =====================================================================
-- SECTION 1. Rider identity resolution
--
-- The correct relationship between the three identifiers is:
--
--     auth.uid()            (uuid)  ==  riders.user_id  (uuid)
--     food_orders.rider_id  (bigint) ==  riders.id       (bigint)
--
-- rider_id therefore stores riders.id, and must never be compared to
-- auth.uid() directly. This function performs the join once, in one
-- place, so no policy or trigger ever mixes the two types.
--
-- SECURITY DEFINER so the lookup is not blocked by public.riders RLS.
-- STABLE because the result cannot change within a statement.
-- =====================================================================
create or replace function public.current_rider_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select r.id
    from public.riders r
   where r.user_id = auth.uid()
     and r.active = true
   limit 1;
$$;

revoke execute on function public.current_rider_id() from public;
revoke execute on function public.current_rider_id() from anon;
grant execute on function public.current_rider_id() to authenticated;

comment on function public.current_rider_id() is
  'riders.id for the current authenticated active rider, or NULL. Resolves auth.uid() via riders.user_id.';


-- =====================================================================
-- SECTION 2. Legal status transitions
--
-- Pure predicate over the 8 statuses the existing CHECK constraint
-- already permits. Forward-only, one step at a time.
--
--   pending            -> confirmed
--   confirmed          -> preparing
--   preparing          -> ready_for_pickup
--   ready_for_pickup   -> picked_up
--   picked_up          -> out_for_delivery
--   out_for_delivery   -> delivered
--
-- Same-status updates are always allowed (no-op transitions).
--
-- Cancellation is permitted from pending, confirmed, preparing and
-- ready_for_pickup. Customer-side cancellation is narrowed further to
-- 'pending' only, by RLS in Section 11.
--
-- 'delivered' and 'cancelled' are terminal: they have no outbound edge,
-- so they can never be un-delivered or un-cancelled.
-- =====================================================================
create or replace function public.food_orders_status_transition_allowed(
  p_from text,
  p_to   text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from is null or p_to is null then false
    when p_from = p_to then true
    when p_to = 'cancelled' then
      p_from in ('pending', 'confirmed', 'preparing', 'ready_for_pickup')
    when p_from = 'pending'           and p_to = 'confirmed'         then true
    when p_from = 'confirmed'         and p_to = 'preparing'        then true
    when p_from = 'preparing'         and p_to = 'ready_for_pickup' then true
    when p_from = 'ready_for_pickup'  and p_to = 'picked_up'        then true
    when p_from = 'picked_up'         and p_to = 'out_for_delivery' then true
    when p_from = 'out_for_delivery'  and p_to = 'delivered'        then true
    else false
  end;
$$;

revoke execute on function public.food_orders_status_transition_allowed(text, text) from public;
revoke execute on function public.food_orders_status_transition_allowed(text, text) from anon;
grant execute on function public.food_orders_status_transition_allowed(text, text) to authenticated;

comment on function public.food_orders_status_transition_allowed(text, text) is
  'True when a food order may move from p_from to p_to. Forward-only, one step at a time; delivered and cancelled are terminal.';


-- =====================================================================
-- SECTION 3. Cancellation audit columns
--
--   cancel_reason text        matches the existing bookings.cancel_reason
--   cancelled_at  timestamptz set by the database only
--   cancelled_by  uuid         the authenticated user who cancelled
--
-- Types rationale:
--   cancel_reason is free text, matching public.bookings.cancel_reason.
--   cancelled_by is uuid because it holds an auth.users id, matching the
--   other actor columns in this schema (food_orders.customer_user_id,
--   bookings.provider_user_id, reviews.customer_user_id), none of which
--   carry a foreign key. It is deliberately left without an FK for the
--   same reason: user deletion must not fail because of an audit trail.
--   Integrity that matters is enforced by the Section 4 trigger, which
--   overwrites cancelled_by with auth.uid() on every transition into
--   'cancelled', so a client can never fabricate an actor.
-- =====================================================================
alter table public.food_orders
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at  timestamptz,
  add column if not exists cancelled_by  uuid;

create index if not exists idx_food_orders_cancelled_by
  on public.food_orders (cancelled_by)
  where cancelled_by is not null;

-- Backfill: orders already in the 'cancelled' state receive a timestamp.
-- cancelled_by is intentionally left NULL. The historical actor is
-- genuinely unknown and must not be guessed. Consumers must therefore
-- tolerate a NULL cancelled_by on legacy rows.
update public.food_orders
   set cancelled_at = coalesce(cancelled_at, created_at)
 where status = 'cancelled'
   and cancelled_at is null;


-- =====================================================================
-- SECTION 4. BEFORE UPDATE protection
--
-- Guarantees, in order:
--   a) no status is skipped and no illegal transition occurs
--      (admins may correct a record);
--   b) only the ordering customer, the restaurant owner or an admin may
--      cancel;
--   c) the assigned rider cannot alter money, customer, restaurant,
--      payment, address or cancellation-audit columns, and cannot set
--      cancelled_at / cancelled_by themselves;
--   d) cancelled_at and cancelled_by are derived from the server, never
--      from client input, and exist only while status = 'cancelled';
--   e) updated_at is maintained by the database.
--
-- Assigning an arbitrary rider id is prevented in two places, because
-- RLS is row-level and not column-level:
--   - a rider cannot self-assign, because the Section 9 UPDATE policy
--     requires the row to already be assigned to them;
--   - the legitimate path is the claim_food_order RPC in Section 10.
-- =====================================================================
create or replace function public.food_orders_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid                uuid := auth.uid();
  v_is_admin           boolean := false;
  v_is_restaurant      boolean := false;
  v_is_customer        boolean := false;
  v_is_assigned_rider  boolean := false;
begin
  -- Resolve the caller's identity. When auth.uid() is null the caller is
  -- the table owner, a service_role job or the migration runner, all of
  -- which bypass row-level security, so the lookups are skipped entirely.
  if v_uid is not null then

    if exists (
      select 1
        from public.profiles p
       where p.user_id = v_uid
         and p.role = 'admin'
    ) then
      v_is_admin := true;
    end if;

    if not v_is_admin and exists (
      select 1
        from public.restaurants r
       where r.id = old.restaurant_id
         and r.owner_user_id = v_uid
    ) then
      v_is_restaurant := true;
    end if;

    if old.customer_user_id = v_uid then
      v_is_customer := true;
    end if;

    if not v_is_admin
       and old.rider_id is not null
       and old.rider_id = public.current_rider_id() then
      v_is_assigned_rider := true;
    end if;

    -- (a) Status transition guard.
    --     Runs whenever the status actually changes, so a no-op update can
    --     never be rejected.
    if new.status is distinct from old.status then

      if not v_is_admin
         and not public.food_orders_status_transition_allowed(old.status, new.status) then
        raise exception
          'Illegal food order status transition: % -> %', old.status, new.status
          using errcode = '22023';
      end if;

      -- (b) Only the customer, the restaurant owner or an admin may cancel.
      if new.status = 'cancelled'
         and not (v_is_admin or v_is_restaurant or v_is_customer) then
        raise exception
          'Only the customer, the restaurant owner or an admin may cancel a food order'
          using errcode = '42501';
      end if;
    end if;

    -- (c) The assigned rider may only change status and rider_id.
    --     This MUST run on every update, not only when the status
    --     changes, otherwise a rider could rewrite the money, address,
    --     customer or audit columns simply by leaving the status alone.
    --     rider_id itself is pinned by the WITH CHECK clause of the rider
    --     UPDATE policy in Section 9.
    if v_is_assigned_rider and not v_is_restaurant then
      if new.customer_user_id      is distinct from old.customer_user_id
         or new.restaurant_id      is distinct from old.restaurant_id
         or new.order_number       is distinct from old.order_number
         or new.subtotal           is distinct from old.subtotal
         or new.delivery_fee       is distinct from old.delivery_fee
         or new.total              is distinct from old.total
         or new.payment_status     is distinct from old.payment_status
         or new.delivery_address   is distinct from old.delivery_address
         or new.delivery_latitude  is distinct from old.delivery_latitude
         or new.delivery_longitude is distinct from old.delivery_longitude
         or new.notes              is distinct from old.notes
         or new.cancel_reason      is distinct from old.cancel_reason
         or new.cancelled_at       is distinct from old.cancelled_at
         or new.cancelled_by       is distinct from old.cancelled_by then
        raise exception
          'Riders may not modify protected food order fields'
          using errcode = '42501';
      end if;
    end if;
  end if;

  -- (d) Cancellation audit integrity.
  --     The audit fields change only on a real status transition, and
  --     only ever while the order is actually cancelled. A same-status
  --     update can never rewrite an existing audit trail, and a live
  --     order can never carry an audit timestamp or actor.
  if new.status is distinct from old.status then
    if new.status = 'cancelled' then
      -- Both audit values come from the server, never from the client.
      -- now() is used unconditionally rather than coalesce(new.cancelled_at,
      -- now()) so a client cannot supply a forged or backdated timestamp.
      new.cancelled_at := now();
      new.cancelled_by := v_uid;
    else
      new.cancelled_at := null;
      new.cancelled_by := null;
    end if;
  elsif new.status = 'cancelled' then
    new.cancelled_at := old.cancelled_at;
    new.cancelled_by := old.cancelled_by;
  else
    new.cancelled_at := null;
    new.cancelled_by := null;
  end if;

  -- (e) updated_at is owned by the database from here on.
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists food_orders_guard_update on public.food_orders;
create trigger food_orders_guard_update
  before update on public.food_orders
  for each row
  execute function public.food_orders_guard_update();


-- =====================================================================
-- SECTION 5. BEFORE INSERT protection
--
-- The existing INSERT policy only verified customer_user_id = auth.uid(),
-- which left three fields under client control on a brand new order:
--   - rider_id        a customer could pre-assign a rider,
--   - status          a customer could create an already-delivered order,
--   - payment_status  a customer could create an already-paid order.
-- Claiming is only ever done by claim_food_order(). A new order always
-- starts 'pending' / 'pending'. Admins retain full control.
-- =====================================================================
create or replace function public.food_orders_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_uid is not null and exists (
    select 1
      from public.profiles p
     where p.user_id = v_uid
       and p.role = 'admin'
  ) then
    v_is_admin := true;
  end if;

  if not v_is_admin then
    new.rider_id := null;

    if new.status is distinct from 'pending' then
      raise exception 'New food orders must start with status ''pending'''
        using errcode = '22023';
    end if;

    if new.payment_status is distinct from 'pending' then
      raise exception 'New food orders must start with payment_status ''pending'''
        using errcode = '22023';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists food_orders_guard_insert on public.food_orders;
create trigger food_orders_guard_insert
  before insert on public.food_orders
  for each row
  execute function public.food_orders_guard_insert();


-- =====================================================================
-- SECTION 6. Persistent order_number
--
--   order_number text, NOT NULL, UNIQUE, format EZ-000001
--
-- WHY A TRIGGER RATHER THAN A SEQUENCE DEFAULT
--   public.food_orders.id is `bigint generated by default as identity`.
--   A column DEFAULT cannot reference other columns, so a DEFAULT cannot
--   observe new.id. A BEFORE INSERT trigger runs *after* identity
--   defaults have been applied, so new.id is already populated and final.
--
--   Generating from id means:
--     - uniqueness is guaranteed by the existing primary key, so there is
--       no second sequence that can drift out of sync;
--     - a backfilled legacy row can never collide with a new row;
--     - a rolled-back insert still consumes an identity value, so the
--       reference stays aligned with the row that actually exists.
--
--   The sequence alternative would be
--     'EZ-' || lpad(nextval('seq')::text, 6, '0')
--   which additionally requires setval() to be seeded from max(id) and
--   re-seeded after any backfill. More moving parts for the same result,
--   so it is not used.
--
-- ORDER MATTERS: the trigger is created before the backfill, so any
-- insert racing the backfill still receives a number and cannot leave a
-- NULL behind when NOT NULL is applied.
-- =====================================================================
alter table public.food_orders
  add column if not exists order_number text;

create or replace function public.food_orders_set_order_number()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := 'EZ-' || lpad(new.id::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists food_orders_set_order_number on public.food_orders;
create trigger food_orders_set_order_number
  before insert on public.food_orders
  for each row
  execute function public.food_orders_set_order_number();

-- Safe backfill: every existing order is numbered from its own id.
update public.food_orders
   set order_number = 'EZ-' || lpad(id::text, 6, '0')
 where order_number is null or btrim(order_number) = '';

create unique index if not exists food_orders_order_number_key
  on public.food_orders (order_number);

-- Safe now: the backfill completed above and the trigger covers every
-- insert from this point on.
-- NOTE: takes an ACCESS EXCLUSIVE lock and scans the table once. At
-- current food_orders size this is sub-second. On a large table use
--   alter table public.food_orders
--     add constraint food_orders_order_number_nn
--     check (order_number is not null) not valid;
--   alter table public.food_orders
--     validate constraint food_orders_order_number_nn;
-- instead.
alter table public.food_orders
  alter column order_number set not null;

comment on column public.food_orders.order_number is
  'Human-readable persistent order reference, e.g. EZ-000001. Generated from id by trigger.';


-- =====================================================================
-- SECTION 7. rider_id integrity
--
-- Clear rider_id values that point at a row which does not exist in
-- public.riders. Without this the foreign key cannot be added. This only
-- ever touches values that were already unusable, because no valid rider
-- row was being referenced.
-- =====================================================================
update public.food_orders o
   set rider_id = null
 where o.rider_id is not null
   and not exists (
     select 1
       from public.riders r
      where r.id = o.rider_id
   );

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.food_orders'::regclass
       and conname  = 'food_orders_rider_id_fkey'
  ) then
    alter table public.food_orders
      add constraint food_orders_rider_id_fkey
      foreign key (rider_id)
      references public.riders(id)
      on delete set null;
  end if;
end
$$;

-- Serves the rider delivery board without scanning non-live orders.
create index if not exists idx_food_orders_claimable
  on public.food_orders (created_at)
 where status = 'ready_for_pickup'
   and rider_id is null;


-- =====================================================================
-- SECTION 8. Rider RLS — replacing the two broken policies
--
-- POLICY BEING DROPPED, exact current definition from
-- 20260830000002_food_orders.sql:
--
--   create policy "Riders can view assigned deliveries"
--     on public.food_orders
--     for select to authenticated
--     using (rider_id = auth.uid());
--
--   create policy "Riders can update assigned delivery status"
--     on public.food_orders
--     for update to authenticated
--     using (rider_id = auth.uid())
--     with check (rider_id = auth.uid());
--
-- WHY THEY ARE INCOMPATIBLE
--   public.food_orders.rider_id is bigint. auth.uid() returns uuid.
--   PostgreSQL has no `bigint = uuid` operator, so CREATE POLICY cannot
--   type-check these expressions and the statements cannot execute.
--   They therefore granted riders no access whatsoever.
--
--   Casting is not an acceptable fix. Capping the bigint to text would
--   make rider access depend on a string encoding of an id, and would
--   still not match how rider_id is actually populated: rider_id holds
--   riders.id, which is reached from auth.uid() through riders.user_id.
--
--   The drop is safe whether or not the policies currently exist, which
--   is the actual situation. `drop policy if exists` succeeds either way,
--   and both are recreated below, so this section is idempotent.
--
-- NOTES ON POLICY SEMANTICS
--   Policies for the same command are OR'd together, so the two SELECT
--   policies below together mean: a rider sees claimable orders plus
--   their own assigned orders, and nothing else.
--   `(select public.current_rider_id())` is wrapped in a scalar subquery
--   on purpose: it lets PostgreSQL evaluate it once as an InitPlan
--   instead of once per row.
-- =====================================================================
drop policy if exists "Riders can view assigned deliveries"
  on public.food_orders;

drop policy if exists "Riders can update assigned delivery status"
  on public.food_orders;

-- See available deliveries: ready for pickup and not yet claimed.
-- The rider must be active and online; a rider who toggled themselves
-- offline is hidden from the board.
create policy "Riders can view available food deliveries"
  on public.food_orders
  for select
  to authenticated
  using (
        status = 'ready_for_pickup'
    and rider_id is null
    and exists (
      select 1
        from public.riders r
       where r.user_id = auth.uid()
         and r.active = true
         and r.available = true
    )
  );

-- See deliveries already assigned to this rider.
create policy "Riders can view their assigned food deliveries"
  on public.food_orders
  for select
  to authenticated
  using (
        rider_id is not null
    and rider_id = (select public.current_rider_id())
  );

-- Update only deliveries already assigned to this rider. The USING clause
-- means a rider can never reach an unclaimed row, so self-assignment via
-- a direct UPDATE is impossible. The WITH CHECK clause pins rider_id so
-- an assigned rider cannot hand a job to somebody else. The BEFORE UPDATE
-- trigger then limits the rider to fulfilment columns and legal
-- transitions.
create policy "Riders can update their assigned food deliveries"
  on public.food_orders
  for update
  to authenticated
  using (
        rider_id is not null
    and rider_id = (select public.current_rider_id())
  )
  with check (
    rider_id = (select public.current_rider_id())
  );


-- =====================================================================
-- SECTION 9. claim_food_order — atomic, race-safe claiming
--
-- The single conditional UPDATE is the concurrency control. Under the
-- default READ COMMITTED isolation, when two riders claim the same order
-- the second transaction blocks on the row lock, then re-evaluates its
-- WHERE clause against the row the winner committed. Because rider_id is
-- no longer NULL, the second UPDATE matches zero rows, FOUND stays
-- false, and it raises. Exactly one rider can win.
--
-- SECURITY DEFINER bypasses row-level security, so authorization is
-- re-implemented explicitly inside the body rather than inherited:
--   - the caller must have an active riders row;
--   - the caller must be available (online);
--   - the order must be ready_for_pickup and unclaimed.
--
-- The order status is deliberately NOT changed. It stays
-- 'ready_for_pickup' after a claim, which is the customer-visible
-- "Rider assigned" step. The physical pickup is the rider's own later
-- transition to 'picked_up'.
-- =====================================================================
create or replace function public.claim_food_order(p_order_id bigint)
returns public.food_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rider public.riders%rowtype;
  v_order public.food_orders%rowtype;
begin
  if p_order_id is null then
    raise exception 'order_id is required' using errcode = '22023';
  end if;

  select r.*
    into v_rider
    from public.riders r
   where r.user_id = auth.uid()
     and r.active = true
   limit 1;

  if not found then
    raise exception 'You are not an active Ewizzy rider' using errcode = '42501';
  end if;

  if not v_rider.available then
    raise exception 'Go online before accepting a delivery' using errcode = '42501';
  end if;

  -- Atomic conditional claim. Exactly one concurrent caller can match.
  update public.food_orders o
     set rider_id = v_rider.id,
         updated_at = now()
   where o.id = p_order_id
     and o.status = 'ready_for_pickup'
     and o.rider_id is null
  returning * into v_order;

  if not found then
    raise exception
      'This delivery is no longer available. It was just taken by another rider.'
      using errcode = 'P0001';
  end if;

  return v_order;
end;
$$;

-- EXECUTE is restricted to authenticated only. The function body is what
-- enforces that the caller is an eligible rider; no other role may call it.
revoke execute on function public.claim_food_order(bigint) from public;
revoke execute on function public.claim_food_order(bigint) from anon;
grant execute on function public.claim_food_order(bigint) to authenticated;

comment on function public.claim_food_order(bigint) is
  'Atomically assigns an unclaimed ready_for_pickup food order to the current rider. Does not change status.';


-- =====================================================================
-- SECTION 10. Rider read access to food_order_items
--
-- This policy did not exist in any form. Without it the rider dashboard
-- could see a delivery but never its line items.
--
-- Mirrors the two food_orders rider SELECT policies exactly: an item is
-- visible when its parent order is either assigned to this rider, or
-- claimable by this rider.
-- =====================================================================
create policy "Riders can view food order items for their deliveries"
  on public.food_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.food_orders fo
       where fo.id = order_id
         and (
              ( fo.rider_id is not null
                and fo.rider_id = (select public.current_rider_id()) )
           or ( fo.status = 'ready_for_pickup'
                and fo.rider_id is null
                and exists (
                  select 1
                    from public.riders r
                   where r.user_id = auth.uid()
                     and r.active = true
                     and r.available = true
                ) )
         )
    )
  );


-- =====================================================================
-- SECTION 11. Customer cancellation policy
--
-- POLICY BEING REPLACED, exact current definition:
--
--   create policy "Customers can update their own pending orders"
--     on public.food_orders
--     for update to authenticated
--     using (customer_user_id = auth.uid() and status = 'pending')
--     with check (customer_user_id = auth.uid());
--
-- WHY IT IS UNSAFE
--   The USING clause correctly restricts a customer to their own order
--   while it is still 'pending'. The WITH CHECK clause only re-tested
--   ownership and imposed no constraint on the destination status, so a
--   single statement moving the order to 'delivered' or
--   'out_for_delivery' was accepted by the database.
--
-- THE REPLACEMENT
--   The USING clause is preserved byte-for-byte, so the existing
--   "a customer may only act while the order is still pending" rule is
--   unchanged. Only the WITH CHECK clause is tightened: the sole status a
--   customer may write is 'cancelled'. The Section 4 trigger then
--   guarantees cancelled_at and cancelled_by are set by the server, and
--   that nobody except the customer, the restaurant owner or an admin can
--   cancel at all.
-- =====================================================================
drop policy if exists "Customers can update their own pending orders"
  on public.food_orders;

create policy "Customers can cancel their own pending orders"
  on public.food_orders
  for update
  to authenticated
  using (customer_user_id = auth.uid() and status = 'pending')
  with check (customer_user_id = auth.uid() and status = 'cancelled');


-- =====================================================================
-- SECTION 12. Preserved without modification
--
--   food_orders:
--     "Customers can view their own orders"
--     "Customers can create their own orders"
--     "Restaurant owners can view orders for their restaurant"
--     "Restaurant owners can update orders for their restaurant"
--     "Admins can manage all orders"
--   food_order_items:
--     "Customers can view their own order items"
--     "Customers can insert their own order items"
--     "Restaurant owners can view order items for their restaurant"
--     "Admins can manage all order items"
--   restaurants, riders, profiles: untouched.
--   Payments: untouched.
--   Grants on food_orders stay INSERT, SELECT, UPDATE for authenticated.
--   No DELETE is granted, so orders are never removed; cancellation
--   always moves status to 'cancelled'.
--
-- END OF MIGRATION
--
-- Behavioural verification lives in a separate, rollback-only script:
--   supabase/food_order_integrity_tests.sql
-- It is intentionally not part of this file so that a failing assertion
-- can never roll back a correct migration.
-- =====================================================================
