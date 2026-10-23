-- Ewizzy: Link restaurant dispatch bookings to riders
-- Additive only. No existing tables, columns, policies, or functions are
-- dropped, renamed, or repurposed.
--
-- Adds restaurant_id and food_order_id to dispatch_bookings so a restaurant
-- can request a delivery through the existing Dispatch Riders service.
-- Reuses the existing riders, RPCs, and rider dashboard without creating
-- any separate restaurant rider account or duplicate dispatch system.

-- ============================================================
-- A. Add restaurant and food order columns to dispatch_bookings
-- ============================================================
alter table public.dispatch_bookings
  add column if not exists restaurant_id bigint
    references public.restaurants(id) on delete set null;

alter table public.dispatch_bookings
  add column if not exists food_order_id bigint
    references public.food_orders(id) on delete set null;

-- ============================================================
-- B. RLS policies for restaurants
-- ============================================================
do $$
begin
  -- Restaurants can view their own dispatch bookings
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dispatch_bookings'
      and policyname = 'Restaurants can view their own dispatch bookings'
  ) then
    create policy "Restaurants can view their own dispatch bookings"
      on public.dispatch_bookings
      for select to authenticated
      using (
        restaurant_id is not null
        and exists (
          select 1 from public.restaurants r
          where r.id = dispatch_bookings.restaurant_id
            and r.owner_user_id = auth.uid()
        )
      );
  end if;

  -- Restaurants can create their own dispatch bookings
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dispatch_bookings'
      and policyname = 'Restaurants can create their own dispatch bookings'
  ) then
    create policy "Restaurants can create their own dispatch bookings"
      on public.dispatch_bookings
      for insert to authenticated
      with check (
        restaurant_id is not null
        and exists (
          select 1 from public.restaurants r
          where r.id = dispatch_bookings.restaurant_id
            and r.owner_user_id = auth.uid()
        )
      );
  end if;

  -- Restaurants can cancel their own dispatch bookings (before acceptance)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dispatch_bookings'
      and policyname = 'Restaurants can cancel their own dispatch bookings'
  ) then
    create policy "Restaurants can cancel their own dispatch bookings"
      on public.dispatch_bookings
      for update to authenticated
      using (
        restaurant_id is not null
        and exists (
          select 1 from public.restaurants r
          where r.id = dispatch_bookings.restaurant_id
            and r.owner_user_id = auth.uid()
        )
        and status in ('pending', 'searching_for_rider')
        and rider_id is null
      )
      with check (
        restaurant_id is not null
        and exists (
          select 1 from public.restaurants r
          where r.id = dispatch_bookings.restaurant_id
            and r.owner_user_id = auth.uid()
        )
        and status = 'cancelled'
      );
  end if;
end
$$;

-- ============================================================
-- C. Indexes
-- ============================================================
create index if not exists idx_dispatch_bookings_restaurant
  on public.dispatch_bookings (restaurant_id, created_at desc);

create index if not exists idx_dispatch_bookings_food_order
  on public.dispatch_bookings (food_order_id, created_at desc);

-- ============================================================
-- D. Extend the BEFORE UPDATE guard for restaurant cancellation
-- ============================================================
create or replace function public.dispatch_bookings_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_customer boolean := false;
  v_is_restaurant boolean := false;
  v_is_assigned_rider boolean := false;
begin
  -- Only enforce when a real user is making the call
  if v_uid is null then
    return new;
  end if;

  -- Resolve admin status
  if exists (
    select 1 from public.profiles p
    where p.user_id = v_uid and p.role = 'admin'
  ) then
    v_is_admin := true;
  end if;

  -- Resolve customer status
  if old.customer_user_id = v_uid then
    v_is_customer := true;
  end if;

  -- Resolve restaurant status
  if old.restaurant_id is not null
     and exists (
       select 1 from public.restaurants r
       where r.id = old.restaurant_id
         and r.owner_user_id = v_uid
     )
  then
    v_is_restaurant := true;
  end if;

  -- Resolve assigned rider status
  if not v_is_admin
     and old.rider_id is not null
     and old.rider_id = (select public.current_rider_id()) then
    v_is_assigned_rider := true;
  end if;

  -- Status transition guard
  if new.status is distinct from old.status then
    if not v_is_admin then
      if not public.dispatch_booking_transition_allowed(old.status, new.status) then
        raise exception
          'Illegal dispatch booking status transition: % -> %', old.status, new.status
          using errcode = '22023';
      end if;

      -- Only customer, restaurant owner, or admin can cancel
      if new.status = 'cancelled'
         and not (v_is_admin or v_is_customer or v_is_restaurant) then
        raise exception
          'Only the customer, restaurant owner, or an admin may cancel a dispatch booking'
          using errcode = '42501';
      end if;
    end if;
  end if;

  -- Assigned rider may only change status (fulfilment), not customer/address/etc.
  if v_is_assigned_rider and not v_is_admin then
    if new.customer_user_id   is distinct from old.customer_user_id
       or new.pickup_contact_name   is distinct from old.pickup_contact_name
       or new.pickup_contact_phone  is distinct from old.pickup_contact_phone
       or new.pickup_address        is distinct from old.pickup_address
       or new.pickup_area           is distinct from old.pickup_area
       or new.recipient_name        is distinct from old.recipient_name
       or new.recipient_phone       is distinct from old.recipient_phone
       or new.dropoff_address       is distinct from old.dropoff_address
       or new.dropoff_area          is distinct from old.dropoff_area
       or new.item_description      is distinct from old.item_description
       or new.package_details       is distinct from old.package_details
       or new.additional_instructions is distinct from old.additional_instructions
       or new.fare_estimate         is distinct from old.fare_estimate
       or new.rider_id              is distinct from old.rider_id then
      raise exception
        'Riders may not modify protected dispatch booking fields'
        using errcode = '42501';
    end if;
  end if;

  -- Restaurant owner may only cancel, not modify protected fields
  if v_is_restaurant and not v_is_admin and not v_is_customer then
    if new.customer_user_id   is distinct from old.customer_user_id
       or new.pickup_contact_name   is distinct from old.pickup_contact_name
       or new.pickup_contact_phone  is distinct from old.pickup_contact_phone
       or new.pickup_address        is distinct from old.pickup_address
       or new.pickup_area           is distinct from old.pickup_area
       or new.recipient_name        is distinct from old.recipient_name
       or new.recipient_phone       is distinct from old.recipient_phone
       or new.dropoff_address       is distinct from old.dropoff_address
       or new.dropoff_area          is distinct from old.dropoff_area
       or new.item_description      is distinct from old.item_description
       or new.package_details       is distinct from old.package_details
       or new.additional_instructions is distinct from old.additional_instructions
       or new.fare_estimate         is distinct from old.fare_estimate
       or new.rider_id              is distinct from old.rider_id then
      raise exception
        'Restaurant owners may not modify protected dispatch booking fields'
        using errcode = '42501';
    end if;
  end if;

  -- Terminal timestamps managed by server
  if new.status is distinct from old.status then
    if new.status = 'accepted' and old.accepted_at is null then
      new.accepted_at := now();
    end if;
    if new.status = 'picked_up' and old.picked_up_at is null then
      new.picked_up_at := now();
    end if;
    if new.status = 'delivered' and old.delivered_at is null then
      new.delivered_at := now();
    end if;
    if new.status = 'cancelled' then
      new.cancelled_at := now();
      new.cancelled_by := v_uid;
    else
      new.cancelled_at := null;
      new.cancelled_by := null;
    end if;
  elsif new.status = 'cancelled' then
    new.cancelled_at := old.cancelled_at;
    new.cancelled_by := old.cancelled_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dispatch_bookings_guard_update on public.dispatch_bookings;
create trigger dispatch_bookings_guard_update
  before update on public.dispatch_bookings
  for each row
  execute function public.dispatch_bookings_guard_update();

-- ============================================================
-- E. Grant table access (restaurant insert already covered by authenticated grant)
-- ============================================================
grant select, insert, update on public.dispatch_bookings to authenticated;
