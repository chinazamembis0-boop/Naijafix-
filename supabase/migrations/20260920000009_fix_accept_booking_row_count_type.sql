-- NaijaFix: Fix boolean/integer type mismatch in accept_booking
-- Root cause:
--   public.accept_booking declared `v_confirmed boolean := false;`
--   then assigned it with `GET DIAGNOSTICS v_confirmed = row_count;`
--   and compared it with `IF v_confirmed > 0 then`.
--   row_count is integer, so the comparison `boolean > integer` raised:
--     "operator does not exist: boolean > integer"
--   This is the same class of bug previously fixed in confirm_booking_completion.
--
-- Fix:
--   Change the declared type of v_confirmed from boolean to bigint (integer),
--   which is the correct type for GET DIAGNOSTICS ROW_COUNT.
--   The comparison `IF v_confirmed > 0 then` then works as intended.
--
-- Safe, idempotent migration. Additive only.
-- No RLS policies, grants, tables, or columns are modified.
-- SECURITY DEFINER, SET search_path = '', provider authorization,
-- ownership/assignment checks, Pending-status requirement, FOR UPDATE
-- SKIP LOCKED, atomic transition, and notification behavior are all preserved.
-- EXECUTE grants are preserved exactly as before.

create or replace function public.accept_booking(
  p_booking_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking        public.bookings%rowtype;
  v_provider_id    uuid;
  v_is_provider    boolean := false;
  v_confirmed      bigint := 0;
begin
  if p_booking_id is null then
    raise exception 'booking_id is required';
  end if;

  -- Validate the caller is a real provider.
  select p.user_id into v_provider_id
    from public.providers p
   where p.user_id = auth.uid();

  if not found then
    raise exception 'forbidden: only registered providers may accept bookings';
  end if;

  -- Lock the booking row for this transaction so concurrent accept
  -- attempts serialize. SKIP LOCKED lets later transactions move on
  -- instead of blocking forever.
  select * into v_booking
    from public.bookings b
   where b.id = p_booking_id
   for update skip locked;

  if not found then
    raise exception 'booking not found';
  end if;

  -- Only the assigned provider may accept.
  if v_booking.provider_user_id is null or v_booking.provider_user_id <> auth.uid() then
    raise exception 'forbidden: this booking is not assigned to you';
  end if;

  -- Only Pending bookings can be accepted.
  if lower(coalesce(v_booking.status, '')) <> 'pending' then
    return jsonb_build_object(
      'success', true,
      'booking_id', p_booking_id,
      'accepted', false,
      'status', v_booking.status,
      'message', 'booking is no longer pending'
    );
  end if;

  -- Perform the atomic transition.
  update public.bookings b
     set status = 'Accepted'
   where b.id = p_booking_id
     and b.provider_user_id = auth.uid()
     and lower(coalesce(b.status, '')) = 'pending'
   returning * into v_booking;

  get diagnostics v_confirmed = row_count;

  if v_confirmed > 0 then
    -- Notify the customer that their booking was accepted.
    perform public.create_booking_notification(p_booking_id, 'accepted');

    return jsonb_build_object(
      'success', true,
      'booking_id', p_booking_id,
      'accepted', true,
      'status', 'Accepted',
      'message', 'booking accepted'
    );
  else
    -- Re-read the current status so the caller gets accurate feedback.
    select * into v_booking
      from public.bookings b
     where b.id = p_booking_id;

    return jsonb_build_object(
      'success', true,
      'booking_id', p_booking_id,
      'accepted', false,
      'status', v_booking.status,
      'message', 'another provider accepted this booking first'
    );
  end if;
end;
$$;

-- Restricted EXECUTE: authenticated only. Function body enforces
-- provider authorization.
revoke execute on function public.accept_booking(bigint) from public;
revoke execute on function public.accept_booking(bigint) from anon;
grant execute on function public.accept_booking(bigint) to authenticated;