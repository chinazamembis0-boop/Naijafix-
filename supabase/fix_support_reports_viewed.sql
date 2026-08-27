-- Support reports admin read state
-- Run in Supabase SQL Editor after existing migrations.
-- Idempotent: safe to run multiple times.

alter table public.support_reports
  add column if not exists viewed_by_admin boolean not null default false;

-- Update existing reports to mark them as viewed (optional, for existing data)
-- update public.support_reports set viewed_by_admin = true where status != 'open';
