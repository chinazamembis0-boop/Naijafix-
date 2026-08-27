-- Fix support_reports permissions for authenticated admins.
-- This migration is idempotent and does not weaken RLS.
-- Run in Supabase SQL Editor after naijafix_final_features.sql.

grant select, insert on public.support_reports to authenticated;
grant select, update on public.support_reports to authenticated;
