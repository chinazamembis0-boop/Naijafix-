-- Ewizzy: Grant UPDATE on rider_verifications to authenticated role
-- Safe, idempotent migration. Additive only. No existing data modified.
--
-- ROOT CAUSE
--   The original migration (20261004000000_rider_okada_verification.sql)
--   only granted SELECT on public.rider_verifications to authenticated:
--
--       grant select on public.rider_verifications to authenticated;
--
--   Table-level permission is checked BEFORE Row Level Security. Because
--   UPDATE was never granted, even an authenticated admin receives:
--
--       "permission denied for table rider_verifications"
--
--   when the admin Control Center calls
--   supabase.from('rider_verifications').update(...)
--
-- FIX
--   Grant UPDATE on public.rider_verifications to authenticated.
--   This is safe because the existing RLS policy
--   "Admins can review rider verification" restricts UPDATE to
--   profiles.role = 'admin' only, both in the USING clause (read) and
--   the WITH CHECK clause (write). Non-admin users cannot approve,
--   reject, or modify rider verification records through this path.
--
--   The frontend updateRiderVerification() also now checks
--   user.role === 'admin' before calling the update, as defense in depth.

grant update on public.rider_verifications to authenticated;

comment on grant update on public.rider_verifications to authenticated is
  'Allows authenticated users to attempt UPDATE on rider_verifications. RLS policy "Admins can review rider verification" restricts actual writes to profiles.role = ''admin'' only.';
