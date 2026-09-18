-- NaijaFix: Enable Supabase Realtime for the notifications table
-- Safe, idempotent migration. Additive only.
--
-- The notifications table was NOT present in the supabase_realtime
-- publication, so new notifications never reached subscribed clients in
-- real time. Users had to refresh or scroll to see new alerts.
--
-- Guarded with IF NOT EXISTS so the migration is safe to re-run.
-- No RLS policies, grants, tables, or columns are modified.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;