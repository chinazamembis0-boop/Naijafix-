-- Booking notification helper
-- Run in Supabase SQL Editor after naijafix_final_features.sql.
-- Idempotent: safe to run multiple times.

create or replace function create_booking_notification(
  p_booking_id bigint,
  p_event text
)
returns void
language plpgsql
security definer
as $$
declare
  v_booking record;
  v_provider_user_id uuid;
  v_customer_user_id uuid;
  v_title text;
  v_message text;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return;
  end if;

  v_customer_user_id := v_booking.customer_user_id;

  if p_event = 'new_booking' and v_booking.provider_user_id is not null then
    insert into public.notifications (user_id, type, title, message, is_read, created_at)
    values (
      v_booking.provider_user_id,
      'booking',
      'New booking request',
      'You have a new booking request from ' || coalesce(v_booking.customer_name, 'a customer'),
      false,
      now()
    );
  elsif p_event in ('accepted', 'declined', 'pending', 'provider on the way', 'in progress', 'completed') and v_customer_user_id is not null then
    insert into public.notifications (user_id, type, title, message, is_read, created_at)
    values (
      v_customer_user_id,
      'booking',
      'Booking ' || p_event,
      'Your booking with ' || coalesce(v_booking.provider_name, 'provider') || ' has been ' || p_event,
      false,
      now()
    );
  end if;
end;
$$;
