-- NaijaFix: customer saved location for provider discovery
--
-- Adds nullable customer location fields to public.profiles so a logged-in
-- customer can save a reusable address + coordinates.
--
-- Additive and idempotent. No existing profile columns are modified.
-- No data is deleted.
--
-- RLS note: existing policies already cover the whole row, so no new
-- policies are required:
--   "Users can view their own profile"   SELECT ... auth.uid() = user_id
--   "Users can update their own profile" UPDATE ... auth.uid() = user_id
-- Those ownership-only policies apply to the new columns automatically.
-- No recursive policy is introduced.

alter table if exists public.profiles
  add column if not exists location text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_updated_at timestamptz;