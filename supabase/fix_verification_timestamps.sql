-- Add resubmitted_at timestamp to provider_verifications
-- Run in Supabase SQL Editor after naijafix_final_features.sql.
-- Idempotent: safe to run multiple times.

alter table public.provider_verifications
  add column if not exists resubmitted_at timestamptz;
