-- Add provider_user_id to bookings if missing
-- Run in Supabase SQL Editor after all existing migrations.
-- Idempotent: safe to run multiple times.

alter table public.bookings
  add column if not exists provider_user_id uuid;

create index if not exists idx_bookings_provider_user_id
  on public.bookings (provider_user_id);
