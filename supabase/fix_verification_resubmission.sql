-- Fix provider_verifications permissions for resubmission
-- Run in Supabase SQL Editor after naijafix_final_features.sql.
-- Idempotent: safe to run multiple times.

-- Allow authenticated users to attempt UPDATEs; RLS remains authoritative.
grant update on public.provider_verifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'provider_verifications'
      and policyname = 'Providers can update their own verification'
  ) then
    create policy "Providers can update their own verification"
      on public.provider_verifications
      for update to authenticated
      using (provider_user_id = auth.uid())
      with check (provider_user_id = auth.uid());
  end if;
end
$$;
