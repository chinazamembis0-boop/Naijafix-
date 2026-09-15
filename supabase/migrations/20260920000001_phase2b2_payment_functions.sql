-- NaijaFix Phase 2B-2: Payment flow backend
-- Safe, idempotent migration. Additive only. No existing data modified.

-- ============================================================
-- A. create_payment_for_booking(p_booking_id bigint)
-- Creates an unpaid payment row for an accepted booking.
-- Amount is derived from service_packages.price via booking.package_id.
-- Never accepts amount/currency/status/customer/provider from client.
-- ============================================================
create or replace function public.create_payment_for_booking(p_booking_id bigint)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking       public.bookings%rowtype;
  v_package       public.service_packages%rowtype;
  v_existing      public.payments;
  v_result        public.payments;
begin
  -- A. Authenticate caller
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  -- B. Load booking and verify customer ownership
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found';
  end if;
  if v_booking.customer_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  -- C. Verify payment-eligible booking status
  if lower(coalesce(v_booking.status, '')) not in ('accepted', 'provider on the way', 'in progress', 'completed') then
    raise exception 'booking is not eligible for payment';
  end if;

  -- D. Verify package_id exists and belongs to booking provider
  if v_booking.package_id is null then
    raise exception 'no package selected';
  end if;
  select * into v_package from public.service_packages where id = v_booking.package_id;
  if not found then
    raise exception 'package not found';
  end if;
  if v_package.provider_user_id <> v_booking.provider_user_id then
    raise exception 'invalid package';
  end if;
  if v_package.price <= 0 then
    raise exception 'invalid package price';
  end if;

  -- E. Return existing unpaid/pending payment if one exists (idempotent)
  select * into v_existing from public.payments
    where booking_id = p_booking_id
      and status in ('unpaid', 'pending')
    order by created_at desc
    limit 1;
  if found then
    return v_existing;
  end if;

  -- F. Create unpaid payment with trusted amount from service_packages
  insert into public.payments (
    booking_id,
    customer_user_id,
    provider_user_id,
    amount,
    currency,
    metadata
  ) values (
    p_booking_id,
    auth.uid(),
    v_booking.provider_user_id,
    v_package.price,
    'NGN',
    jsonb_build_object('created_by', 'create_payment_for_booking')
  ) returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.create_payment_for_booking(bigint) to authenticated;
revoke execute on function public.create_payment_for_booking(bigint) from public;
revoke execute on function public.create_payment_for_booking(bigint) from anon;

-- ============================================================
-- B. Corrected initiate_payment(p_booking_id bigint, p_idempotency_key text)
-- Requires authenticated user and valid idempotency key.
-- Transitions unpaid payment to pending (assigns idempotency key).
-- Handles legacy pending payments with NULL idempotency key safely.
-- Never overwrites an existing non-null idempotency key.
-- Never inserts a second active payment.
-- Never accepts client-supplied amount.
-- ============================================================
create or replace function public.initiate_payment(
  p_booking_id bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking       public.bookings%rowtype;
  v_existing      public.payments;
  v_pending       public.payments;
  v_payment       public.payments;
begin
  -- A. Authenticate caller
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  -- A1. Validate idempotency key
  if p_idempotency_key is null or trim(p_idempotency_key) = '' then
    raise exception 'idempotency key required';
  end if;

  -- B. Load booking and verify customer ownership
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found';
  end if;
  if v_booking.customer_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  -- C. Verify payment-eligible booking status
  if lower(coalesce(v_booking.status, '')) not in ('accepted', 'provider on the way', 'in progress', 'completed') then
    raise exception 'booking is not eligible for payment';
  end if;

  -- D. Check existing payment by idempotency_key (must belong to authorized booking/customer)
  select * into v_existing from public.payments
    where idempotency_key = p_idempotency_key
      and booking_id = p_booking_id
      and customer_user_id = auth.uid();
  if found then
    return jsonb_build_object(
      'success', true,
      'payment_id', v_existing.id,
      'status', v_existing.status,
      'idempotent', true
    );
  end if;

  -- E. Check existing pending payment for this authorized customer/booking
  select * into v_pending from public.payments
    where booking_id = p_booking_id
      and status = 'pending'
      and customer_user_id = auth.uid();
  if found then
    if v_pending.idempotency_key is null then
      update public.payments set
        idempotency_key = p_idempotency_key,
        updated_at = now()
      where id = v_pending.id;
      return jsonb_build_object(
        'success', true,
        'payment_id', v_pending.id,
        'status', 'pending',
        'idempotent', true
      );
    elsif v_pending.idempotency_key = p_idempotency_key then
      return jsonb_build_object(
        'success', true,
        'payment_id', v_pending.id,
        'status', v_pending.status,
        'idempotent', true
      );
    else
      raise exception 'payment already has a different idempotency key';
    end if;
  end if;

  -- F. Find unpaid payment and transition to pending
  select * into v_payment from public.payments
    where booking_id = p_booking_id
      and status = 'unpaid'
      and customer_user_id = auth.uid();
  if not found then
    raise exception 'no unpaid payment found; create payment first';
  end if;

  update public.payments set
    status = 'pending',
    idempotency_key = p_idempotency_key,
    updated_at = now()
  where id = v_payment.id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'status', 'pending',
    'idempotent', false
  );
end;
$$;

grant execute on function public.initiate_payment(bigint, text) to authenticated;
revoke execute on function public.initiate_payment(bigint, text) from public;
revoke execute on function public.initiate_payment(bigint, text) from anon;

-- ============================================================
-- C. Active payment partial unique index
-- Enforces at most one unpaid/pending payment per booking.
-- Preflight: verify no duplicate active payments exist before creating.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_per_booking
  ON public.payments (booking_id)
  WHERE status IN ('unpaid', 'pending');
