-- NaijaFix: Public read access for services
-- Unauthenticated users must be able to view services on the home page.
-- Run in Supabase SQL Editor after existing services RLS migration.
-- Idempotent: safe to run multiple times.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'services'
      and policyname = 'Public can view active services'
  ) then
    create policy "Public can view active services"
      on public.services
      for select to public
      using (active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'services'
      and policyname = 'Public can view active services via anon'
  ) then
    create policy "Public can view active services via anon"
      on public.services
      for select to anon
      using (active = true);
  end if;
end
$$;

grant select on public.services to anon;
