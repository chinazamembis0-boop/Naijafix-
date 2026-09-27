-- NaijaFix: Allow admins to access booking-photos for support report evidence
-- Root cause:
--   Support report evidence is uploaded to the private "booking-photos" bucket.
--   The existing SELECT policy requires a matching booking_photos row AND the
--   current user to be a booking participant (customer or provider).
--   Support reports have NO booking_photos row, and admins are not booking
--   participants, so createSignedUrl() fails silently due to storage RLS.
--
-- Fix:
--   Add a storage SELECT policy allowing admins to read any object in the
--   booking-photos bucket. This enables getSignedStorageUrl() to succeed for
--   admins viewing support report evidence.
--   The bucket remains private; only admins gain access via this policy.
--   No changes to existing booking participant policies.
--
-- Safe, idempotent migration. Additive only.

do $$
begin
  -- Admin SELECT access to booking-photos bucket
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can view all booking photos'
  ) then
    create policy "Admins can view all booking photos"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'booking-photos'
        and exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end
$$;