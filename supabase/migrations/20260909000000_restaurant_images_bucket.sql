-- NaijaFix: Restaurant images storage bucket
-- Idempotent: safe to run multiple times.
-- Preserves existing buckets and data.

-- ============================================================
-- A. Create restaurant-images bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', false)
on conflict (id) do nothing;

-- ============================================================
-- B. Storage RLS policies
-- ============================================================
do $$
begin
  -- Restaurant owners can upload their own images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Restaurant owners can upload their own images'
  ) then
    create policy "Restaurant owners can upload their own images"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'restaurant-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Restaurant owners can manage their own images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Restaurant owners can manage their own images'
  ) then
    create policy "Restaurant owners can manage their own images"
      on storage.objects for all to authenticated
      using (
        bucket_id = 'restaurant-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'restaurant-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Authenticated users can view restaurant images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can view restaurant images'
  ) then
    create policy "Authenticated users can view restaurant images"
      on storage.objects for select to authenticated
      using (bucket_id = 'restaurant-images');
  end if;

  -- Admins can manage all restaurant images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can manage restaurant images'
  ) then
    create policy "Admins can manage restaurant images"
      on storage.objects for all to authenticated
      using (
        bucket_id = 'restaurant-images'
        and exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        bucket_id = 'restaurant-images'
        and exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end
$$;
