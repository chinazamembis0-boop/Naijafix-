-- NaijaFix: Add UPDATE policies for chat tables
-- Safe, idempotent migration. Additive only.
--
-- The existing chat schema (supabase/chat_schema.sql) creates SELECT and
-- INSERT policies on public.messages and public.conversations, but no
-- UPDATE policies. The application performs two UPDATE operations that
-- are therefore silently blocked by RLS:
--
--   1. ChatScreen marks received messages as read:
--        update public.messages set is_read = true
--        where conversation_id = <id>
--          and sender_user_id <> auth.uid()
--
--   2. sendMessage bumps the conversation's updated_at:
--        update public.conversations set updated_at = now()
--        where id = <id>
--
-- This migration adds the minimum UPDATE policies required so those
-- operations succeed for the conversation participants. No existing
-- SELECT/INSERT policies are modified, no tables or columns are changed,
-- and no data is migrated.

-- A. Participants can mark messages in their conversations as read.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Participants can mark messages in their conversations as read'
  ) then
    create policy "Participants can mark messages in their conversations as read"
      on public.messages
      for update to authenticated
      using (
        exists (
          select 1 from public.conversations c
          where c.id = messages.conversation_id
            and (c.customer_user_id = auth.uid() or c.provider_user_id = auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.conversations c
          where c.id = messages.conversation_id
            and (c.customer_user_id = auth.uid() or c.provider_user_id = auth.uid())
        )
      );
  end if;
end
$$;

-- B. Participants can update their own conversations (e.g. bump updated_at).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'Participants can update their own conversations'
  ) then
    create policy "Participants can update their own conversations"
      on public.conversations
      for update to authenticated
      using (customer_user_id = auth.uid() or provider_user_id = auth.uid())
      with check (customer_user_id = auth.uid() or provider_user_id = auth.uid());
  end if;
end
$$;