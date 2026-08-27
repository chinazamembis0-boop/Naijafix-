-- NaijaFix maps and scheduling extensions
-- Run in Supabase SQL Editor after marketplace_extensions.sql.
-- Idempotent: safe to run multiple times.

-- ============================================================
-- A. Maps: provider coordinates
-- ============================================================
alter table public.providers
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

create index if not exists idx_providers_location
  on public.providers (latitude, longitude);

-- ============================================================
-- B. Booking scheduling: preferred time
-- ============================================================
alter table public.bookings
  add column if not exists preferred_time text,
  add column if not exists proposed_time text,
  add column if not exists time_accepted boolean,
  add column if not exists scheduled_at timestamptz;

create index if not exists idx_bookings_customer
  on public.bookings (customer_user_id, created_at desc);

create index if not exists idx_bookings_provider_name
  on public.bookings (provider_name, created_at desc);

create index if not exists idx_bookings_provider_user_id
  on public.bookings (provider_user_id, created_at desc);
