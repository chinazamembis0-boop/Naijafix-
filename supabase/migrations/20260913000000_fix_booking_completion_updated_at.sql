-- NaijaFix Fix: Correct confirm_booking_completion() to remove
-- reference to bookings.updated_at, which does not exist on the
-- bookings table (confirmed: no migration in the codebase adds it).
--
-- This is a CREATE OR REPLACE of the function defined in
-- 20260912000000_phase2a_booking_lifecycle.sql. The ONLY change is
-- removing `updated_at = now()` from the UPDATE statement. All other
-- behavior and ALL security protections are identical to Phase 2A.
--
-- Security protections preserved exactly as in Phase 2A:
--   - SECURITY DEFINER
--   - SET search_path = ''
--   - customer ownership check using auth.uid()
--   - provider_completed_at IS NOT NULL requirement
--   - cannot confirm another customer's booking
--   - cannot confirm before provider completion
--   - idempotent/concurrency-safe row-count logic
--   - exactly one provider confirmation notification for the actual transition
--   - EXECUTE revoked from public and anon
--   - EXECUTE granted to authenticated
--
-- All RLS protections from Phase 2A (WITH CHECK on customer/provider
-- update policies, bookings_completion_guard trigger) are untouched.

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
         completed_at = now()
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
