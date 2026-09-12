-- NaijaFix Phase 2B-1: Review Enforcement & Trust Signals
--
-- This migration:
-- 1. Tightens the reviews INSERT RLS policy to verify booking completion and ownership
-- 2. Creates mark_booking_reviewed() SECURITY DEFINER function
-- 3. Creates update_review_provider_response() SECURITY DEFINER function
--
-- No applied migrations are modified. All changes are additive.

-- ============================================================
-- 1. Tighten reviews INSERT policy: customer must own the
--    booking AND booking must be Completed.
-- ============================================================
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reviews'
      and policyname = 'Customers can insert their own reviews'
  ) then
    drop policy if exists "Customers can insert their own reviews" on public.reviews;
  end if;

  create policy "Customers can insert their own reviews"
    on public.reviews for insert to authenticated
    with check (
      customer_user_id = auth.uid()
      and exists (
        select 1 from public.bookings b
        where b.id = booking_id
          and b.customer_user_id = auth.uid()
          and lower(b.status) = 'completed'
      )
    );
end
$$;

-- ============================================================
-- 2. mark_booking_reviewed: privileged bookkeeping function.
--    Sets bookings.reviewed = true after a review is inserted.
--    Runs as SECURITY DEFINER so the caller cannot bypass
--    ownership/completion checks via RLS.
-- ============================================================
create or replace function public.mark_booking_reviewed(p_booking_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
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

  -- Only the owning customer may mark reviewed.
  if v_booking.customer_user_id is null or v_booking.customer_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  -- Only completed bookings can be marked reviewed.
  if lower(v_booking.status) <> 'completed' then
    raise exception 'booking is not completed';
  end if;

  -- Idempotent: already reviewed? Nothing to do.
  if v_booking.reviewed then
    return;
  end if;

  update public.bookings b
     set reviewed = true
   where b.id = p_booking_id;
end;
$$;

-- Restricted EXECUTE: authenticated only. Function body enforces ownership.
revoke execute on function public.mark_booking_reviewed(bigint) from public;
revoke execute on function public.mark_booking_reviewed(bigint) from anon;
grant execute on function public.mark_booking_reviewed(bigint) to authenticated;

-- ============================================================
-- 3. update_review_provider_response: providers respond to
--    their own booking reviews. Updates only provider_response
--    and responded_at. Empty responses rejected.
-- ============================================================
create or replace function public.update_review_provider_response(p_review_id bigint, p_provider_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews%rowtype;
begin
  if p_review_id is null then
    raise exception 'review_id is required';
  end if;

  if p_provider_response is null or trim(p_provider_response) = '' then
    raise exception 'provider_response is required';
  end if;

  select * into v_review
    from public.reviews r
   where r.id = p_review_id;

  if not found then
    raise exception 'review not found';
  end if;

  -- Only the booking's provider may respond.
  if v_review.provider_user_id is null or v_review.provider_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.reviews r
     set provider_response = trim(p_provider_response),
         responded_at = now()
   where r.id = p_review_id;
end;
$$;

-- Restricted EXECUTE: authenticated only. Function body enforces ownership.
revoke execute on function public.update_review_provider_response(bigint, text) from public;
revoke execute on function public.update_review_provider_response(bigint, text) from anon;
grant execute on function public.update_review_provider_response(bigint, text) to authenticated;
