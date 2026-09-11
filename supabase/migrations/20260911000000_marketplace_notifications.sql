-- NaijaFix: marketplace notification flow
-- Safe, idempotent migration. No destructive operations. No existing data
-- modified. Extends the EXISTING notifications system rather than creating a
-- duplicate one.
--
-- Adds a nullable metadata column so notifications can carry a booking_id
-- link. Nullable + default null means existing rows are untouched and the
-- column is future-compatible.

alter table public.notifications
  add column if not exists metadata jsonb;

-- Backfill default for any future inserts (existing rows stay NULL).
alter table public.notifications
  alter column metadata set default null;

-- ============================================================
-- Booking notification helper (extended).
-- Extends the EXISTING create_booking_notification RPC rather than
-- replacing it. Adds customer confirmation on request creation and
-- admin activity notifications for every booking event.
--
-- Attribution/security:
--   - security definer: bypasses the authenticated INSERT policy so a
--     normal customer cannot forge notifications for other users.
--   - Admin recipients are resolved INSIDE this function from
--     public.profiles (role = 'admin'). The caller never supplies admin
--     ids, so a customer cannot redirect or suppress admin notifications.
--   - All other recipient ids come from the booking row itself; no
--     user-controlled value is trusted as a recipient.
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
  v_admin_user_id uuid;
  v_title text;
  v_message text;
  v_metadata jsonb;
  v_decline_reason text;
  v_cursor refcursor;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return;
  end if;

  v_customer_user_id := v_booking.customer_user_id;
  v_provider_user_id := v_booking.provider_user_id;
  v_decline_reason := v_booking.decline_reason;
  v_metadata := jsonb_build_object('booking_id', p_booking_id);

  -- NEW BOOKING
  --   Customer: confirmation their request was submitted.
  --   Provider: (existing behaviour) new booking request.
  --   Admin: activity notification (no private customer data beyond what
  --     the admin already has access to via the bookings table).
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
    open v_cursor as
      select p.user_id from public.profiles p where p.role = 'admin';
    loop
      fetch next from v_cursor into v_admin_user_id;
      exit when not found;
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
    close v_cursor;

  -- STATUS TRANSITIONS (accepted / declined / etc.)
  --   Customer: (existing behaviour) status update.
  --   Admin: activity notification. Decline reason is included only when
  --     the bookings row actually carries one.
  elsif p_event in ('accepted', 'declined', 'pending', 'provider on the way', 'in progress', 'completed') then
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

    open v_cursor as
      select p.user_id from public.profiles p where p.role = 'admin';
    loop
      fetch next from v_cursor into v_admin_user_id;
      exit when not found;
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
    close v_cursor;
  end if;
end;
$$;

-- Preserve the same restricted EXECUTE policy as the original function.
-- Authenticated-only. The function is security definer, so the caller
-- cannot forge recipient ids, but EXECUTE must still be restricted.
revoke execute on function public.create_booking_notification(bigint, text) from public;
revoke execute on function public.create_booking_notification(bigint, text) from anon;
grant execute on function public.create_booking_notification(bigint, text) to authenticated;