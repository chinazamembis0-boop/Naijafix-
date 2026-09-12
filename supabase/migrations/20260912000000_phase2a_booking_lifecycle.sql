-- NaijaFix Phase 2A: booking lifecycle hardening.
-- Safe, idempotent migration. No destructive operations. No existing data
-- modified. Extends the EXISTING bookings table; does not create a second
-- booking/transaction system. No payment statuses are introduced.
--
-- Problem this fixes:
--   The provider "Mark completed" action previously set
--   bookings.status = 'Completed' directly, which:
--     * manufactured a final Completed state without customer confirmation,
--     * made review/reward/Book-Again eligibility fire on the provider's word
--       alone, and
--     * skipped completed_at in some paths.
--
-- New additive column:
--   provider_completed_at timestamptz
--     NULL   => provider has NOT marked the service complete
--     NOT NULL => provider says the service is done; CUSTOMER CONFIRMATION
--                 IS STILL REQUIRED before the booking becomes Completed.
--
-- This deliberately does NOT add a new bookings.status value. The existing
-- statuses (Pending, Accepted, Completed, Cancelled) are preserved. Declined
-- continues to be represented via decline_reason. No payment statuses
-- (payment_pending, payment_protected, payout_pending, paid_out, refunded)
-- are introduced here; those belong to later phases.

alter table public.bookings
  add column if not exists provider_completed_at timestamptz;

-- ============================================================
-- Customer completion confirmation (SECURITY DEFINER).
--
-- The ONLY path by which a booking transitions into the final
-- 'Completed' state with customer confirmation. The provider can never
-- call this, and the provider's "mark completed" only sets
-- provider_completed_at (a separate column), never this status.
--
-- Security:
--   - security definer: runs with the function owner's privileges so the
--     caller cannot bypass the state checks via RLS.
--   - SET search_path = '' and every reference is schema-qualified.
--   - validates auth.uid() is the booking's customer_user_id.
--   - validates the provider has already marked the service complete
--     (provider_completed_at is not null).
--   - validates the booking is not already Completed (idempotent).
--   - EXECUTE is restricted to authenticated; the function body still
--     enforces ownership, so a customer cannot confirm another's booking.
-- ============================================================
create or replace function public.confirm_booking_completion(p_booking_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_confirmed boolean := false;
begin
  if p_booking_id is null then
    raise exception 'booking_id is required';
  end if;

  select * into v_booking
    from public.bookings b
   where b.id = p_booking_id;

  if not found then
    raise exception 'booking not found';
  end if;

  -- 1. Only the owning customer may confirm.
  if v_booking.customer_user_id is null or v_booking.customer_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  -- 2. The provider must have marked the service complete first.
  if v_booking.provider_completed_at is null then
    raise exception 'provider has not marked this service complete yet';
  end if;

  -- 3. Transition to final Completed with customer confirmation.
  --    The UPDATE is the single source of truth for whether this attempt
  --    actually made the transition. Its WHERE clause already excludes rows
  --    that are already Completed, so repeated/concurrent attempts match zero
  --    rows. We capture that result instead of re-checking status, which
  --    closes a TOCTOU gap: a notification is sent only when this attempt
  --    performed the transition, guaranteeing exactly one notification per
  --    real confirmation and never re-writing completed_at.
  update public.bookings b
     set status = 'Completed',
         completed_at = now(),
         updated_at = now()
   where b.id = p_booking_id
     and b.customer_user_id = auth.uid()
     and b.provider_completed_at is not null
     and lower(coalesce(b.status, '')) <> 'completed';

  get diagnostics v_confirmed = row_count;

  select * into v_booking
    from public.bookings b
   where b.id = p_booking_id;

  -- 4. Notify the provider ONLY when THIS attempt performed the transition.
  --    Idempotent: a repeat/concurrent call finds v_confirmed = 0 and sends
  --    no notification, and does not touch completed_at again.
  if v_confirmed > 0 and v_booking.provider_user_id is not null then
    insert into public.notifications
      (user_id, type, title, message, is_read, metadata, created_at)
    values (
      v_booking.provider_user_id,
      'booking',
      'Booking confirmed',
      'The customer confirmed completion for booking #' || p_booking_id || '.',
      false,
      jsonb_build_object('booking_id', p_booking_id),
      now()
    );
  end if;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'completed_at', v_booking.completed_at,
    'already_confirmed', coalesce(v_confirmed, 0) = 0
  );
end;
$$;

-- Restricted EXECUTE: authenticated only. The function body enforces
-- ownership, so a customer still cannot confirm another user's booking.
revoke execute on function public.confirm_booking_completion(bigint) from public;
revoke execute on function public.confirm_booking_completion(bigint) from anon;
grant execute on function public.confirm_booking_completion(bigint) to authenticated;

-- ============================================================
-- DB-LEVEL GUARD: the final 'Completed' state is reachable ONLY through
-- confirm_booking_completion(). The existing customer/provider UPDATE
-- policies (defined in bookings_rls.sql) only restrict by row ownership and
-- had no column-level restriction on status, so an authenticated client
-- could write status = 'Completed' directly and bypass customer
-- confirmation. We tighten ONLY those two non-admin UPDATE policies with an
-- additive WITH CHECK clause. confirm_booking_completion() is SECURITY
-- DEFINER, so its own status = 'Completed' write bypasses RLS and is
-- unaffected. Admins keep their existing full manage policy.
--
-- provider_completed_at is protected separately by the
-- bookings_completion_guard trigger (below), which is the correct tool for
-- column-specific authorization: PostgreSQL RLS WITH CHECK evaluates the
-- whole new row, so it cannot forbid one column while allowing others.
-- Safety: no legitimate client transition sets status = 'Completed'
-- (customer cancel -> 'Cancelled'; provider accept/decline/on-the-way/
-- in-progress -> other values; provider mark-complete -> provider_completed_at
-- only). Existing already-Completed rows are untouched (WITH CHECK only
-- governs new UPDATEs). Accept/decline, cancellation, time handling, booking
-- history, notifications, reviews and Book Again are all preserved.
-- ============================================================
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookings'
      and policyname = 'Customers can update their own bookings'
  ) then
    drop policy if exists "Customers can update their own bookings" on public.bookings;
    create policy "Customers can update their own bookings"
      on public.bookings for update to authenticated
      using (customer_user_id = auth.uid())
      with check (
        customer_user_id = auth.uid()
        and status <> 'Completed'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookings'
      and policyname = 'Providers can update their own bookings'
  ) then
    drop policy if exists "Providers can update their own bookings" on public.bookings;
    create policy "Providers can update their own bookings"
      on public.bookings for update to authenticated
      using (
        exists (
          select 1 from public.providers p
          where p.user_id = auth.uid() and bookings.provider_user_id = p.user_id
        )
      )
      with check (
        exists (
          select 1 from public.providers p
          where p.user_id = auth.uid() and bookings.provider_user_id = p.user_id
        )
        and status <> 'Completed'
      );
  end if;
end
$$;

-- ============================================================
-- Column guard: only the ASSIGNED provider (or an admin) may record that
-- the service is complete. A customer cannot set provider_completed_at on
-- their own booking and then self-confirm via confirm_booking_completion().
-- Narrowly scoped to the provider_completed_at column, so it does NOT
-- interfere with any other column update (cancellation, time handling,
-- status transitions, etc.). confirm_booking_completion() does not modify
-- provider_completed_at, so it passes through untouched.
-- ============================================================
create or replace function public.bookings_completion_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.provider_completed_at is distinct from OLD.provider_completed_at
     and NEW.provider_completed_at is not null then
    if not (
      NEW.provider_user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and p.role = 'admin'
      )
    ) then
      raise exception 'only the assigned provider may mark the service complete';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists bookings_completion_guard on public.bookings;
create trigger bookings_completion_guard
  before update on public.bookings
  for each row execute function public.bookings_completion_guard();

-- ============================================================
-- Extend create_booking_notification with the provider_completed event.
-- This is a CREATE OR REPLACE of the existing 2-arg function (defined in
-- 20260911000000). The signature is unchanged; we only add one event to
-- the status-transition list so the customer is notified when the provider
-- marks the service complete (before final customer confirmation).
-- ============================================================
create or replace function public.create_booking_notification(
  p_booking_id bigint,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_customer_user_id uuid;
  v_provider_user_id uuid;
  v_metadata jsonb;
  v_decline_reason text;
  v_admin_user_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return;
  end if;

  v_customer_user_id := v_booking.customer_user_id;
  v_provider_user_id := v_booking.provider_user_id;
  v_decline_reason := v_booking.decline_reason;
  v_metadata := jsonb_build_object('booking_id', p_booking_id);

  if p_event = 'new_booking' then
    if v_customer_user_id is not null then
      insert into public.notifications
        (user_id, type, title, message, is_read, metadata, created_at)
      values (
        v_customer_user_id,
        'booking',
        'Request submitted',
        'Your service request to ' || coalesce(v_booking.provider_name, 'a provider') || ' (' || coalesce(v_booking.service_name, 'a service') || ') was submitted.',
        false,
        v_metadata,
        now()
      );
    end if;

    if v_provider_user_id is not null then
      insert into public.notifications
        (user_id, type, title, message, is_read, metadata, created_at)
      values (
        v_provider_user_id,
        'booking',
        'New booking request',
        'You have a new booking request from ' || coalesce(v_booking.customer_name, 'a customer'),
        false,
        v_metadata,
        now()
      );
    end if;

    -- Notify every authorized admin. Resolved here so the caller cannot
    -- redirect or suppress admin activity notifications.
    for v_admin_user_id in
      select p.user_id from public.profiles p where p.role = 'admin'
    loop
      insert into public.notifications
        (user_id, type, title, message, is_read, metadata, created_at)
      values (
        v_admin_user_id,
        'booking',
        'New service request',
        'A new service request was created. Provider: ' || coalesce(v_booking.provider_name, 'Unknown') || ' • Service: ' || coalesce(v_booking.service_name, 'Unknown'),
        false,
        v_metadata,
        now()
      );
    end loop;

  elsif p_event in ('accepted', 'declined', 'pending', 'provider on the way', 'in progress', 'completed', 'provider_completed') then
    if v_customer_user_id is not null then
      insert into public.notifications
        (user_id, type, title, message, is_read, metadata, created_at)
      values (
        v_customer_user_id,
        'booking',
        'Booking ' || p_event,
        'Your booking with ' || coalesce(v_booking.provider_name, 'provider') || ' has been ' || p_event ||
          case when p_event = 'declined' and v_decline_reason is not null
            then '. Reason: ' || v_decline_reason
            else ''
          end,
        false,
        v_metadata,
        now()
      );
    end if;

    -- Notify every authorized admin. Resolved here so the caller cannot
    -- redirect or suppress admin activity notifications.
    for v_admin_user_id in
      select p.user_id from public.profiles p where p.role = 'admin'
    loop
      insert into public.notifications
        (user_id, type, title, message, is_read, metadata, created_at)
      values (
        v_admin_user_id,
        'booking',
        'Booking ' || p_event,
        'Booking #' || p_booking_id || ' was ' || p_event ||
          case when p_event = 'declined' and v_decline_reason is not null
            then '. Reason: ' || v_decline_reason
            else ''
          end,
        false,
        v_metadata,
        now()
      );
    end loop;
  end if;
end;
$$;

revoke execute on function public.create_booking_notification(bigint, text) from public;
revoke execute on function public.create_booking_notification(bigint, text) from anon;
grant execute on function public.create_booking_notification(bigint, text) to authenticated;