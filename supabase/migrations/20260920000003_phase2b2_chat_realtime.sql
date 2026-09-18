-- NaijaFix: Enable Supabase Realtime for chat tables
-- Safe, idempotent migration. Additive only.
--
-- The existing supabase_realtime publication currently contains ZERO
-- tables, so the Supabase Realtime subscriptions in the chat UI receive
-- no events. This migration publishes the existing public.messages and
-- public.conversations tables so INSERT events are delivered to
-- subscribed clients.
--
-- Verified before writing this migration:
--   - public.messages exists.
--   - public.conversations exists.
--
-- The existing application code subscribes to postgres_changes INSERT on
-- public.messages (ChatScreen appends new messages live; ConversationList
-- refreshes the conversation list preview). public.conversations is added
-- as well so future conversation-level changes can be delivered without
-- another migration, and so the conversation list's updated_at ordering
-- reflects new activity.
--
-- Guarded with IF NOT EXISTS so the migration is safe to re-run: if a
-- table is already published, the ALTER is skipped rather than erroring.
-- No RLS policies, existing data, application code, or other tables are
-- modified.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END
$$;