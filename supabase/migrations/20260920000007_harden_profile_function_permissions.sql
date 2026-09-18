-- NaijaFix: Harden backfill and trigger function EXECUTE permissions
-- Safe, idempotent migration. Additive only.
--
-- public.backfill_missing_profiles() is an administrative backfill helper
-- that can insert profile rows for users other than the caller. It must
-- NOT be directly executable by ordinary authenticated users.
--
-- public.create_profile_for_new_user() is trigger-only. It is invoked by
-- the auth.users AFTER INSERT trigger, never directly by clients, so its
-- authenticated EXECUTE grant is unnecessary and is removed.
--
-- public.is_admin() MUST retain authenticated EXECUTE because the profiles
-- RLS policy ("Admins can manage all profiles") evaluates it for every
-- authenticated request. It is NOT revoked here.

-- 1. backfill_missing_profiles() — revoke from authenticated
revoke execute on function public.backfill_missing_profiles() from authenticated;

-- 2. create_profile_for_new_user() — revoke from authenticated (trigger-only)
revoke execute on function public.create_profile_for_new_user() from authenticated;

-- 3. is_admin() — intentionally left granted to authenticated (RLS dependency)

-- 4. Ensure RLS remains enabled on profiles
alter table public.profiles enable row level security;