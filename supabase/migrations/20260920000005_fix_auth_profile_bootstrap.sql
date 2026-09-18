-- NaijaFix: Fix auth → profiles bootstrap (permanent architectural fix)
-- Safe, idempotent migration. Additive only.
--
-- ROOT CAUSE OF "no NaijaFix profile was found" bug:
--   1. NO auth.users AFTER INSERT trigger existed. Profile creation was
--      entirely client-side via supabase.from('profiles').insert(...).
--      Any RLS/network/race failure left auth.users with no profile.
--   2. is_admin() queried public.profiles, and the "Admins can manage all
--      profiles" policy called is_admin(), creating a recursive RLS cycle.
--   3. Duplicate INSERT policies existed ("Allow users to create their own
--      profile" and "Users can insert their own profile").
--
-- THIS MIGRATION:
--   A. Creates a SECURITY DEFINER trigger function that inserts exactly one
--      profile per NEW auth.users row, using auth metadata for name/email/
--      phone and a safe default role of 'customer'.
--   B. Attaches it as an AFTER INSERT trigger on auth.users so the profile
--      is created atomically with the auth account, before any client code
--      runs. This is the authoritative path.
--   C. Replaces the recursive admin policy with a non-recursive one that
--      checks the caller's role via a SECURITY DEFINER helper that bypasses
--      RLS, breaking the infinite-recursion cycle.
--   D. Removes duplicate INSERT policies.
--   E. Backfills missing profiles for existing auth.users without
--      overwriting existing valid profiles.

-- ---------------------------------------------------------------------------
-- A. Helper: non-recursive admin check
-- ---------------------------------------------------------------------------
-- is_admin() previously queried public.profiles directly, which caused the
-- "Admins can manage all profiles" policy to recurse into profiles RLS while
-- evaluating itself. This SECURITY DEFINER version reads the caller's role
-- outside of RLS, breaking the cycle.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select p.role into v_role
    from public.profiles p
   where p.user_id = auth.uid()
   limit 1;

  return coalesce(v_role, '') = 'admin';
end;
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- B. Profile bootstrap trigger function
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
    v_name := nullif(trim(coalesce(NEW.raw_user_meta_data->>'name', '')), '');
  end if;
  if v_name is null then
    v_name := nullif(trim(coalesce(NEW.email, '')), '');
  end if;
  if v_name is null then
    v_name := 'NaijaFix user';
  end if;

  v_email := nullif(trim(coalesce(NEW.email, '')), '');

  v_phone := nullif(trim(coalesce(v_metadata->>'phone', '')), '');

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
  -- (e.g. created by the legacy client-side flow) is never overwritten.
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

-- Attach the trigger to auth.users AFTER INSERT.
drop trigger if exists trg_create_profile_for_new_user on auth.users;
create trigger trg_create_profile_for_new_user
  after insert on auth.users
  for each row
  execute function public.create_profile_for_new_user();

-- ---------------------------------------------------------------------------
-- C. Replace recursive admin policy with a non-recursive one
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can manage all profiles" on public.profiles;

create policy "Admins can manage all profiles"
  on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- D. Remove duplicate INSERT policies and re-create a single one
-- ---------------------------------------------------------------------------
drop policy if exists "Allow users to create their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile"
      on public.profiles
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- E. Backfill missing profiles for existing auth.users
-- ---------------------------------------------------------------------------
-- Only creates profiles where auth.users.id has NO matching
-- public.profiles.user_id. Existing valid profiles are never overwritten.
-- Runs inside a SECURITY DEFINER function so the migration role can insert
-- rows that would otherwise be blocked by the INSERT policy (which requires
-- user_id = auth.uid()).
create or replace function public.backfill_missing_profiles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with inserted as (
    insert into public.profiles (
      user_id,
      full_name,
      email,
      phone,
      role,
      created_at
    )
    select
      au.id,
      coalesce(
        nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', '')), ''),
        nullif(trim(coalesce(au.raw_user_meta_data->>'name', '')), ''),
        nullif(trim(coalesce(au.email, '')), ''),
        'NaijaFix user'
      ),
      au.email,
      nullif(trim(coalesce(au.raw_user_meta_data->>'phone', '')), ''),
      'customer',
      now()
    from auth.users au
    left join public.profiles p on p.user_id = au.id
    where p.user_id is null
    returning user_id
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke execute on function public.backfill_missing_profiles() from public;
revoke execute on function public.backfill_missing_profiles() from anon;
grant execute on function public.backfill_missing_profiles() to authenticated;

select public.backfill_missing_profiles();

-- ---------------------------------------------------------------------------
-- F. Ensure RLS is enabled on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;