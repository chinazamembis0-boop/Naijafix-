-- Add emergency flag to bookings
-- Run in Supabase SQL Editor after all existing migrations.
-- Idempotent: safe to run multiple times.

alter table public.bookings
  add column if not exists emergency boolean not null default false;
