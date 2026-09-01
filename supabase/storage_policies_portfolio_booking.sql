-- NaijaFix: Storage policies for provider-portfolio and booking-photos
-- Idempotent: safe to run multiple times.
-- Does not modify existing data, buckets, or policies.
-- Run in Supabase SQL Editor.

-- ============================================================
-- A. provider-portfolio
-- ============================================================
do $$
begin
  -- Providers can manage (insert/update/delete/select) their own portfolio files
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Providers can manage their own portfolio files'
  ) then
    create policy "Providers can manage their own portfolio files"
      on storage.objects for all to authenticated
      using (
        bucket_id = 'provider-portfolio'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'provider-portfolio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Any authenticated user can view portfolio images (marketplace)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can view portfolio images'
  ) then
    create policy "Authenticated users can view portfolio images"
      on storage.objects for select to authenticated
      using (bucket_id = 'provider-portfolio');
  end if;
end
$$;

-- ============================================================
-- B. booking-photos
-- ============================================================
do $$
begin
  -- Authenticated users can upload booking photos to their own folder
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload booking photos'
  ) then
    create policy "Authenticated users can upload booking photos"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'booking-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Booking participants (customer or provider) can view booking photos
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Booking participants can view booking photos'
  ) then
    create policy "Booking participants can view booking photos"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'booking-photos'
        and exists (
          select 1 from public.booking_photos bp
          where bp.file_path = storage.foldername(name) || '/' || storage.filename(name)
            and exists (
              select 1 from public.bookings b
              where b.id = bp.booking_id
                and (b.customer_user_id = auth.uid() or b.provider_user_id = auth.uid())
            )
        )
      );
  end if;
end
$$;
