-- NaijaFix Phase 2B-1: Atomic Customer Review Submission
--
-- This migration creates public.submit_customer_review() which atomically
-- inserts a review AND marks the booking as reviewed in a single
-- transaction. Either both succeed or both roll back.
--
-- This replaces the two-step flow:
--   reviews.insert() + mark_booking_reviewed()
-- which could leave an inconsistent state: review exists + reviewed = false.
--
-- No applied migrations are modified. All changes are additive.

create or replace function public.submit_customer_review(
  p_booking_id bigint,
  p_rating integer,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_review_id bigint;
  v_provider_user_id uuid;
begin
  -- Validate inputs
  if p_booking_id is null then
    raise exception 'booking_id is required';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  -- Verify booking exists and get owner/provider
  select * into v_booking
    from public.bookings b
   where b.id = p_booking_id;

  if not found then
    raise exception 'booking not found';
  end if;

  -- Only the owning customer may submit a review
  if v_booking.customer_user_id is null or v_booking.customer_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  -- Only completed bookings can be reviewed
  if lower(v_booking.status) <> 'completed' then
    raise exception 'booking is not completed';
  end if;

  -- Idempotency: if already reviewed, return existing review info
  if v_booking.reviewed then
    select r.id, r.provider_user_id
      into v_review_id, v_provider_user_id
      from public.reviews r
     where r.booking_id = p_booking_id;

    return jsonb_build_object(
      'success', false,
      'already_reviewed', true,
      'review_id', v_review_id,
      'message', 'You have already reviewed this booking.'
    );
  end if;

  -- Get the provider user ID for the notification
  v_provider_user_id := v_booking.provider_user_id;

  -- Insert the review (unique constraint on booking_id prevents duplicates)
  insert into public.reviews (
    booking_id,
    customer_user_id,
    provider_user_id,
    rating,
    comment
  ) values (
    p_booking_id,
    auth.uid(),
    v_provider_user_id,
    p_rating,
    trim(p_comment)
  )
  returning id into v_review_id;

  -- Mark the booking as reviewed (same transaction)
  update public.bookings b
     set reviewed = true
   where b.id = p_booking_id;

  return jsonb_build_object(
    'success', true,
    'already_reviewed', false,
    'review_id', v_review_id,
    'provider_user_id', v_provider_user_id,
    'message', 'Review submitted successfully.'
  );
end;
$$;

-- Restricted EXECUTE: authenticated only. Function body enforces ownership.
revoke execute on function public.submit_customer_review(bigint, integer, text) from public;
revoke execute on function public.submit_customer_review(bigint, integer, text) from anon;
grant execute on function public.submit_customer_review(bigint, integer, text) to authenticated;
