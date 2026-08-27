-- Bookings RLS policies
-- Run in Supabase SQL Editor after all existing migrations.
-- Idempotent: safe to run multiple times.

alter table public.bookings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Customers can view their own bookings'
  ) then
    create policy "Customers can view their own bookings"
      on public.bookings
      for select to authenticated
      using (customer_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Customers can update their own bookings'
  ) then
    create policy "Customers can update their own bookings"
      on public.bookings
      for update to authenticated
      using (customer_user_id = auth.uid())
      with check (customer_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Providers can view their bookings'
  ) then
    create policy "Providers can view their bookings"
      on public.bookings
      for select to authenticated
      using (
        exists (
          select 1 from public.providers p
          where p.user_id = auth.uid() and bookings.provider_user_id = p.user_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Providers can update their bookings'
  ) then
    create policy "Providers can update their bookings"
      on public.bookings
      for update to authenticated
      using (
        exists (
          select 1 from public.providers p
          where p.user_id = auth.uid() and bookings.provider_user_id = p.user_id
        )
      )
      with check (
        exists (
          select 1 from public.providers p
          where p.user_id = auth.uid() and bookings.provider_user_id = p.user_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Admins can manage bookings'
  ) then
    create policy "Admins can manage bookings"
      on public.bookings
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Customers can create bookings'
  ) then
    create policy "Customers can create bookings"
      on public.bookings
      for insert to authenticated
      with check (customer_user_id = auth.uid());
  end if;
end
$$;

grant select, insert, update on public.bookings to authenticated;
