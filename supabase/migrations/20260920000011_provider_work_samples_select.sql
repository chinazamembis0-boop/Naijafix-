-- NaijaFix: allow authenticated users to view provider work-sample files
--
-- Root cause:
--   provider_work_samples is intentionally public profile content. Its table
--   RLS already allows every authenticated user to SELECT rows
--   ("Authenticated users can view provider work samples" -> using (true)).
--
--   However, the matching Storage policy only granted the OWNING provider
--   access:
--     "Providers can manage their own work sample files"
--     ALL ... (bucket_id = 'provider-work-samples'
--              AND storage.foldername(name)[1] = auth.uid())
--
--   Because the bucket is PRIVATE, Supabase requires storage.objects SELECT
--   access for createSignedUrl() to succeed. A customer viewing a provider
--   profile therefore got a signed-URL error, the catch block set
--   signedUrl = '', and the work sample did not render.
--
-- Fix:
--   Add the narrowest SELECT policy that matches the table's existing access
--   model: authenticated users may read objects in the provider-work-samples
--   bucket. This is scoped to ONE bucket, ONE operation (SELECT), and ONE
--   role (authenticated). It is NOT a public bucket and NOT USING (true) on
--   storage.objects as a whole.
--
-- Safe and idempotent. No existing policies are dropped or weakened.
-- No data is modified. No other buckets are affected.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can view provider work samples'
  ) then
    create policy "Authenticated users can view provider work samples"
      on storage.objects
      for select to authenticated
      using (bucket_id = 'provider-work-samples');
  end if;
end
$$;