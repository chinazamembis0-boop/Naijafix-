-- Provider RLS and unique constraint migration
-- Safe to run multiple times. Does not delete or modify existing provider data.

-- 1. Check for duplicate user_id values before creating the unique index.
-- If duplicates exist, this block will raise an exception and stop execution
-- so you can investigate and resolve them manually.
do $$
begin
  if exists (
    select 1
    from public.providers
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate providers.user_id values detected. Resolve duplicates before creating the unique index.';
  end if;
end
$$;

-- 2. Create unique index on providers.user_id
create unique index if not exists providers_user_id_key
  on public.providers (user_id);

-- 3. Enable RLS
alter table public.providers enable row level security;

-- 4. Providers can manage their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'providers'
      and policyname = 'Providers can manage their own profile'
  ) then
    create policy "Providers can manage their own profile"
      on public.providers
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end
$$;

-- 5. Anyone can view provider profiles (marketplace)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'providers'
      and policyname = 'Anyone can view provider profiles'
  ) then
    create policy "Anyone can view provider profiles"
      on public.providers
      for select to authenticated
      using (true);
  end if;
end
$$;

-- 6. Admins can manage all providers
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'providers'
      and policyname = 'Admins can manage all providers'
  ) then
    create policy "Admins can manage all providers"
      on public.providers
      for all to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end
$$;

-- 7. Grants (RLS remains authoritative)
grant select, insert, update, delete on public.providers to authenticated;
