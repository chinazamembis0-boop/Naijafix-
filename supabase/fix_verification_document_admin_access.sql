-- Fix verification document admin access
-- Idempotent: creates missing admin SELECT policies only.
-- Does not make buckets public, delete policies, delete documents, or delete verification records.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can review customer ID documents'
  ) then
    create policy "Admins can review customer ID documents"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'customer-verification-documents'
        and exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can review verification files'
  ) then
    create policy "Admins can review verification files"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'provider-verification-documents'
        and exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end
$$;
