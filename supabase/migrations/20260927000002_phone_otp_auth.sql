-- Ewizzy: phone (SMS OTP) authentication support
-- Safe, idempotent, additive only.
--
-- WHY THIS MIGRATION IS NEEDED
--   The existing auth -> profiles bootstrap (see
--   20260920000005_fix_auth_profile_bootstrap.sql) already creates one profile
--   row per auth.users row, so phone accounts need no new table and no new
--   profile system. Two things have to change for a PHONE-ONLY account:
--
--   1. profiles.email must be nullable.
--      A phone-authenticated Supabase user has no email at all (we do not
--      invent placeholder addresses). If the column is currently NOT NULL,
--      every phone sign-up would fail when the trigger inserts the profile.
--      `drop not null` is a no-op when the column is already nullable, so this
--      is safe either way. No data is changed and no rows are deleted.
--
--   2. The bootstrap trigger must fall back to auth.users.phone.
--      It currently reads the phone number only from signup metadata
--      (raw_user_meta_data->>'phone'). Supabase stores the verified number in
--      the auth.users.phone column, so that is the authoritative value for
--      phone accounts. Only a fallback is added; the metadata value still wins,
--      so existing behaviour for email accounts is unchanged.
--
-- WHAT THIS MIGRATION DOES NOT DO
--   - No new table, no new column, no duplicate profiles.
--   - No RLS policy is created, dropped or weakened. The existing
--     non-recursive "Admins can manage all profiles" policy and the
--     self-only select/update/insert policies are left exactly as they are, so
--     the previous "infinite recursion detected in policy for relation
--     profiles" failure cannot be reintroduced.
--   - providers / riders / bookings / payments are untouched.

-- ---------------------------------------------------------------------------
-- 1. Phone-only accounts have no email address
-- ---------------------------------------------------------------------------
alter table public.profiles alter column email drop not null;

-- ---------------------------------------------------------------------------
-- 2. Bootstrap trigger: prefer auth.users.phone over signup metadata
-- ---------------------------------------------------------------------------
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_name text;
  v_email text;
  v_phone text;
  v_metadata jsonb;
begin
  -- Read signup metadata from auth.users.raw_user_meta_data when present.
  v_metadata := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);

  v_name := nullif(trim(coalesce(v_metadata->>'full_name', '')), '');
  if v_name is null then
    v_name := nullif(trim(coalesce(v_metadata->>'name', '')), '');
  end if;
  if v_name is null then
    v_name := nullif(trim(coalesce(NEW.email, '')), '');
  end if;
  if v_name is null then
    v_name := 'Ewizzy user';
  end if;

  v_email := nullif(trim(coalesce(NEW.email, '')), '');

  -- Phone accounts carry no email, so v_email stays NULL and the client reads
  -- the authenticated user's phone instead of a fabricated address.
  v_phone := coalesce(
    nullif(trim(coalesce(v_metadata->>'phone', '')), ''),
    nullif(trim(coalesce(NEW.phone, '')), '')
  );

  -- Role: only 'admin' is honored from metadata when it is already an admin
  -- in an existing profile (prevents self-escalation). Everything else
  -- defaults to 'customer'. Provider role is handled by the existing
  -- provider-signup flow which inserts its own providers row separately.
  if exists (
    select 1 from public.profiles p
    where p.user_id = NEW.id and p.role = 'admin'
  ) then
    v_role := 'admin';
  else
    v_role := 'customer';
  end if;

  -- Idempotent insert: ON CONFLICT DO NOTHING means a pre-existing profile
  -- is never overwritten.
  insert into public.profiles (
    user_id,
    full_name,
    email,
    phone,
    role,
    created_at
  ) values (
    NEW.id,
    v_name,
    v_email,
    v_phone,
    v_role,
    now()
  )
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;

-- The trigger itself is unchanged and stays attached to auth.users:
--   drop trigger if exists trg_create_profile_for_new_user on auth.users;
--   create trigger trg_create_profile_for_new_user
--     after insert on auth.users
--     for each row
--     execute function public.create_profile_for_new_user();
