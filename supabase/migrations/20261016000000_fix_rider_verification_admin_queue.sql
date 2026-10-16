-- Ewizzy: Fix rider verification admin queue visibility
-- Safe, idempotent migration. Additive only. No existing data modified.
--
-- ROOT CAUSE
--   submit_rider_verification() creates rows in public.riders and
--   public.rider_verifications (status = 'pending') but never updates
--   public.profiles.role to 'rider'. The admin dashboard query filters
--   rider_verifications by profiles.role = 'rider', so new riders never
--   appear in the admin verification queue.
--
--   Additionally, no notification is sent to admins when a rider submits
--   verification, so admins have no way to know a new application exists.
--
-- FIX 1: Update submit_rider_verification() to set profiles.role = 'rider'
--   Only upgrades from 'customer' (the default) or null. Never downgrades
--   from another role. New riders appear in the admin queue immediately.
--
-- FIX 2: Add a trigger that notifies every admin when a new rider
--   verification is submitted. Fan-out happens inside a SECURITY DEFINER
--   function so the client cannot suppress or redirect admin alerts.
--   Mirrors the existing notify_admins_of_new_review() pattern.

-- =====================================================================
-- FIX 1: Update submit_rider_verification() to also set profiles.role
-- =====================================================================
create or replace function public.submit_rider_verification(
  p_full_name text,
  p_phone text,
  p_photo_path text,
  p_operating_area text,
  p_emergency_contact_name text,
  p_emergency_contact_phone text,
  p_id_document_path text
)
returns public.rider_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_operating_area text;
  v_emergency_name text;
  v_emergency_phone text;
  v_id_path text;
  v_row public.rider_verifications%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in to register as a rider' using errcode = '42501';
  end if;

  v_name := nullif(trim(coalesce(p_full_name, '')), '');
  v_operating_area := nullif(trim(coalesce(p_operating_area, '')), '');
  v_emergency_name := nullif(trim(coalesce(p_emergency_contact_name, '')), '');
  v_emergency_phone := nullif(trim(coalesce(p_emergency_contact_phone, '')), '');
  v_id_path := nullif(trim(coalesce(p_id_document_path, '')), '');

  if v_name is null then
    raise exception 'Full name is required' using errcode = '22023';
  end if;

  if v_operating_area is null then
    raise exception 'Operating area is required' using errcode = '22023';
  end if;

  if v_emergency_name is null or v_emergency_phone is null then
    raise exception 'Emergency contact is required' using errcode = '22023';
  end if;

  -- A first submission must include the ID card. A resubmission may omit
  -- it, which keeps the document already on file.
  if v_id_path is null and not exists (
    select 1 from public.rider_verifications v
     where v.rider_user_id = v_uid
       and v.id_document_path is not null
  ) then
    raise exception 'An ID card photo is required for verification' using errcode = '22023';
  end if;

  insert into public.riders (
    user_id,
    full_name,
    phone,
    vehicle_type,
    vehicle_number,
    photo_path,
    operating_area,
    active,
    available,
    created_at,
    updated_at
  ) values (
    v_uid,
    v_name,
    nullif(trim(coalesce(p_phone, '')), ''),
    'motorcycle',
    null,
    nullif(trim(coalesce(p_photo_path, '')), ''),
    v_operating_area,
    true,
    true,
    now(),
    now()
  )
  on conflict (user_id) do update
    set full_name       = excluded.full_name,
        phone           = coalesce(excluded.phone, public.riders.phone),
        vehicle_type    = 'motorcycle',
        photo_path      = coalesce(excluded.photo_path, public.riders.photo_path),
        operating_area  = excluded.operating_area,
        updated_at      = now();

  -- FIX: Ensure the profile role is 'rider' so the admin verification
  -- queue can find this rider. Only upgrade from 'customer' (the default
--  from the auth bootstrap trigger) or null; never downgrade from another
--  role such as 'provider' or 'admin'.
  update public.profiles
    set role = 'rider'
  where user_id = v_uid
    and (role is null or role = 'customer');

  insert into public.rider_verifications as v (
    rider_user_id,
    id_document_path,
    emergency_contact_name,
    emergency_contact_phone,
    status,
    rejection_reason,
    submitted_at,
    resubmitted_at,
    reviewed_at,
    reviewed_by,
    created_at,
    updated_at
  ) values (
    v_uid,
    v_id_path,
    v_emergency_name,
    v_emergency_phone,
    'pending',
    null,
    now(),
    null,
    null,
    null,
    now(),
    now()
  )
  on conflict (rider_user_id) do update
    set id_document_path         = coalesce(excluded.id_document_path, v.id_document_path),
        emergency_contact_name   = excluded.emergency_contact_name,
        emergency_contact_phone  = excluded.emergency_contact_phone,
        status                   = case when v.status = 'approved' then 'approved' else 'pending' end,
        rejection_reason         = case when v.status = 'approved' then v.rejection_reason else null end,
        submitted_at             = case when v.status = 'approved' then v.submitted_at else now() end,
        resubmitted_at           = case when v.status = 'approved' then v.resubmitted_at else now() end,
        reviewed_at              = case when v.status = 'approved' then v.reviewed_at else null end,
        reviewed_by              = case when v.status = 'approved' then v.reviewed_by else null end,
        updated_at               = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.submit_rider_verification(text, text, text, text, text, text, text) from public;
revoke execute on function public.submit_rider_verification(text, text, text, text, text, text, text) from anon;
grant execute on function public.submit_rider_verification(text, text, text, text, text, text, text) to authenticated;

comment on function public.submit_rider_verification is
  'Registers or updates an Ewizzy motorcycle/Okada rider and their single ID card submission. Sets profiles.role = ''rider'' so the admin verification queue can find the rider. Always writes vehicle_type = ''motorcycle'' and a server-decided verification status.';

-- =====================================================================
-- FIX 2: Notify admins when a new rider verification is submitted
-- =====================================================================
create or replace function public.notify_admins_of_new_rider_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_user_id uuid;
  v_rider_name text;
begin
  -- Defensive: only act on genuinely new pending submissions.
  if NEW.status <> 'pending' then
    return NEW;
  end if;

  select nullif(trim(p.full_name), '') into v_rider_name
    from public.profiles p
   where p.user_id = NEW.rider_user_id;

  for v_admin_user_id in
    select p.user_id
      from public.profiles p
     where p.role = 'admin'
       and p.user_id is not null
  loop
    insert into public.notifications
      (user_id, type, title, message, is_read, metadata, created_at)
    values (
      v_admin_user_id,
      'rider_verification',
      'New rider verification',
      coalesce(v_rider_name, 'A rider')
        || ' has submitted a motorcycle/Okada rider verification application pending your review.',
      false,
      jsonb_build_object(
        'verification_id', NEW.id,
        'rider_user_id', NEW.rider_user_id,
        'rider_name', v_rider_name,
        'status', NEW.status,
        'submitted_at', NEW.submitted_at
      ),
      now()
    );
  end loop;

  return NEW;
end;
$$;

revoke execute on function public.notify_admins_of_new_rider_verification() from public;
revoke execute on function public.notify_admins_of_new_rider_verification() from anon;
revoke execute on function public.notify_admins_of_new_rider_verification() from authenticated;

-- Attach the trigger to public.rider_verifications (idempotent).
drop trigger if exists trg_notify_admins_of_new_rider_verification on public.rider_verifications;

create trigger trg_notify_admins_of_new_rider_verification
  after insert on public.rider_verifications
  for each row
  execute function public.notify_admins_of_new_rider_verification();

-- Ensure notifications are in the realtime publication (already covered by
-- 20260920000008_notifications_realtime.sql, guarded here for safety).
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
