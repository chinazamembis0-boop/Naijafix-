-- Add booking decline and cancel reason columns
-- Run in Supabase SQL Editor after all existing migrations.
-- Idempotent: safe to run multiple times.

alter table public.bookings
  add column if not exists decline_reason text,
  add column if not exists cancel_reason text;
