-- NaijaFix: add support_reports.evidence_path
--
-- Root cause:
--   The ReportForm component uploads an optional evidence file to the private
--   "booking-photos" bucket and then inserts support_reports with
--   evidence_path = <uploaded path>.
--   The support_reports table never had an evidence_path column, so the
--   INSERT failed with:
--     "Could not find the 'evidence_path' column of 'support_reports'
--      in the schema cache"
--
-- Fix:
--   Add a nullable evidence_path text column to public.support_reports.
--   Nullable because evidence is optional. Reuses the existing private
--   "booking-photos" storage pattern already used by ReportForm.
--
-- Safe, idempotent migration. Additive only.
-- No existing rows are modified. No RLS policies are changed.
-- No storage buckets or grants are changed.

alter table if exists public.support_reports
  add column if not exists evidence_path text;