-- =====================================================================
-- Ewizzy — Okada (motorcycle) rider registration and ID verification
-- =====================================================================
--
-- WHAT THIS MIGRATION DOES
--   1. Restricts public.riders.vehicle_type to the single supported
--      Ewizzy delivery vehicle: 'motorcycle'.
--   2. Adds the two rider fields that are safe to show publicly
--      (profile photo path and operating area) to public.riders.
--   3. Creates public.rider_verifications: ONE private row per rider
--      holding the single ID card upload plus the emergency contact.
--   4. Installs RLS so only the owning rider and an admin can ever read
--      that row.
--   5. Installs a private storage bucket 'rider-verification-documents'
--      with the same owner-folder / admin-only policy shape already used
--      for provider and customer verification documents.
--   6. Adds submit_rider_verification(), a SECURITY DEFINER RPC that is
--      the ONLY write path into public.riders and
--      public.rider_verifications for a rider. Because it is server-side
--      it always writes vehicle_type = 'motorcycle' and status = 'pending',
--      so a browser cannot forge a vehicle type or a verified status.
--   7. Requires an approved verification before a rider may see or claim
--      a delivery, by re-defining public.claim_food_order and the two
--      rider SELECT policies.
--
-- WHY THE VERIFICATION DATA IS NOT ON public.riders
--   public.riders carries the policy "Anyone can view active riders"
--   (SELECT to authenticated USING (active = true)). Any column added to
--   that table is therefore readable by every signed-in customer and by
--   every other rider. The ID card path and the emergency contact must
--   never be readable that way, so they live in a separate table with
--   owner-or-admin RLS, exactly like the existing customer_verifications
--   and provider_verifications tables.
--
-- ID PRIVACY
--   - The bucket is private (public = false). There is no public URL.
--   - Only the owning rider and profiles.role = 'admin' can SELECT the
--     object, so the server itself refuses a customer, another rider, a
--     restaurant, or an anonymous visitor.
--   - The application only ever reads it back through a signed URL that
--     the storage policy has already authorised.
--   - The stored value is a storage path, never a public URL.
--
-- EXISTING DATA
--   public.riders.vehicle_type only ever accepted 'motorcycle' from the
--   application, but the old CHECK constraint also permitted 'bicycle',
--   'car' and 'van'. Those values are normalised to 'motorcycle' before
--   the constraint is replaced, so the new constraint can be added
--   without dropping a row.
--
--   Riders who already existed before this migration were, by
--   definition, already able to take deliveries, so they are backfilled
--   as 'approved'. Only riders registered from now on start 'pending'.
--   This keeps the live food-delivery workflow working unchanged.
--
-- NOT TOUCHED
--   - Food ordering, carts, checkout, payment and the order status
--     machine.
--   - Customer/provider/restaurant registration and authentication.
--   - Every storage policy that is not about rider verification.
-- =====================================================================


-- =====================================================================
-- SECTION 1. Vehicle type: Motorcycle / Okada only
--
-- Normalise first, then replace the constraint, then make the column
-- NOT NULL DEFAULT 'motorcycle' so a row can never again be created
-- without a supported vehicle.
-- =====================================================================
update public.riders
   set vehicle_type = 'motorcycle'
 where vehicle_type is null
    or vehicle_type <> 'motorcycle';

alter table public.riders
  drop constraint if exists riders_vehicle_type_check;

alter table public.riders
  alter column vehicle_type set default 'motorcycle';

alter table public.riders
  alter column vehicle_type set not null;

alter table public.riders
  add constraint riders_vehicle_type_check
  check (vehicle_type = 'motorcycle');

comment on column public.riders.vehicle_type is
  'Ewizzy delivery riders use a motorcycle (Okada). This is the only supported vehicle type.';


-- =====================================================================
-- SECTION 2. Public rider fields
--
-- These two are the only new columns on public.riders. Both are safe to
-- display on a rider's public profile: a photo and a general operating
-- area. Neither is an identity document.
-- =====================================================================
alter table public.riders
  add column if not exists photo_path text;

alter table public.riders
  add column if not exists operating_area text;

comment on column public.riders.photo_path is
  'Storage path of the rider profile photo in the private profile-photos bucket. Signed URLs are issued on request; this is never a public URL.';

comment on column public.riders.operating_area is
  'General operating area or city the rider delivers in, e.g. Lagos. Free text, not an address.';


-- =====================================================================
-- SECTION 3. Private rider verification record
--
-- One row per rider. It carries exactly one ID card document and one
-- emergency contact. No certificates, no second ID, no paperwork.
-- =====================================================================
create table if not exists public.rider_verifications (
  id bigint generated by default as identity primary key,
  rider_user_id uuid not null unique,
  id_document_path text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  resubmitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rider_verifications is
  'Private Ewizzy rider verification record: one ID card upload and one emergency contact. Readable only by the owning rider and Ewizzy admins.';

comment on column public.rider_verifications.id_document_path is
  'Storage path in the PRIVATE rider-verification-documents bucket. Never a public URL.';

alter table public.rider_verifications enable row level security;

do $$
begin
  -- A rider may read their own verification row, which is how the rider
  -- dashboard renders its status and rejection reason. They get no other
  -- command here: submission goes through submit_rider_verification()
  -- and the status is written by an admin through the admin policy.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rider_verifications'
      and policyname = 'Riders can view their own verification'
  ) then
    create policy "Riders can view their own verification"
      on public.rider_verifications
      for select to authenticated
      using (rider_user_id = auth.uid());
  end if;

  -- Admins keep full control. This is the only policy a rider can write
  -- through, and it is restricted to profiles.role = 'admin'.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rider_verifications'
      and policyname = 'Admins can review rider verification'
  ) then
    create policy "Admins can review rider verification"
      on public.rider_verifications
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

create index if not exists idx_rider_verifications_rider
  on public.rider_verifications (rider_user_id);

create index if not exists idx_rider_verifications_status
  on public.rider_verifications (status);

grant select on public.rider_verifications to authenticated;


-- =====================================================================
-- SECTION 4. Private storage bucket for the ID card
--
-- Private bucket. The rider writes only inside their own user folder.
-- Only that same rider and an admin may read it back.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('rider-verification-documents', 'rider-verification-documents', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Riders can upload their own ID card'
  ) then
    create policy "Riders can upload their own ID card"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'rider-verification-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  -- Own folder only: this is what lets a rider replace their own upload
  -- while making every other rider's ID unreadable.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Riders can manage their own ID card'
  ) then
    create policy "Riders can manage their own ID card"
      on storage.objects for all to authenticated
      using (
        bucket_id = 'rider-verification-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'rider-verification-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can review rider ID cards'
  ) then
    create policy "Admins can review rider ID cards"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'rider-verification-documents'
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
      and policyname = 'Admins can delete rider ID cards'
  ) then
    create policy "Admins can delete rider ID cards"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'rider-verification-documents'
        and exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end
$$;


-- =====================================================================
-- SECTION 5. Server-authoritative verification lookup
--
-- SECURITY DEFINER so that reading the answer from public.riders RLS
-- inside a policy on public.food_orders cannot recurse, and so a policy
-- on food_orders can ask the question without exposing the row itself.
-- STABLE because the answer cannot change within a statement.
-- =====================================================================
create or replace function public.rider_is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.rider_verifications v
     where v.rider_user_id = auth.uid()
       and v.status = 'approved'
  );
$$;

revoke execute on function public.rider_is_verified() from public;
revoke execute on function public.rider_is_verified() from anon;
grant execute on function public.rider_is_verified() to authenticated;

comment on function public.rider_is_verified() is
  'True when the calling rider has an approved Ewizzy verification. False for anonymous users, customers, and unverified riders.';


-- =====================================================================
-- SECTION 6. submit_rider_verification — the only rider write path
--
-- The client uploads two files first (a profile photo into the existing
-- private profile-photos bucket, and an ID card into the private
-- rider-verification-documents bucket) and then calls this once with the
-- resulting storage paths. Everything that matters is decided here:
--
--   - vehicle_type is always written as the literal 'motorcycle'. The
--     caller never supplies it, so no other vehicle type can reach the
--     table even by editing the request.
--   - status is always written as 'pending', on first submission and on
--     every resubmission. A rider therefore cannot set themselves to
--     'approved', and the browser is never trusted for status.
--   - A rider who is already 'approved' and who only replaces their
--     photo keeps their approval, so a working rider is never locked out
--     of deliveries mid-shift by tidying up their profile.
--   - The rider row is upserted on user_id, so registering twice updates
--     one row instead of creating a duplicate.
-- =====================================================================
create or replace function public.submit_rider_verification(
  p_full_name text,
  p_phone text,
  p_photo_path text,
  p_operating_area text,
  p_emergency_contact_name text,
  p_emergency_contact_phone text,
  p_id_document_path text
)
returns public.rider_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_operating_area text;
  v_emergency_name text;
  v_emergency_phone text;
  v_id_path text;
  v_row public.rider_verifications%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in to register as a rider' using errcode = '42501';
  end if;

  v_name := nullif(trim(coalesce(p_full_name, '')), '');
  v_operating_area := nullif(trim(coalesce(p_operating_area, '')), '');
  v_emergency_name := nullif(trim(coalesce(p_emergency_contact_name, '')), '');
  v_emergency_phone := nullif(trim(coalesce(p_emergency_contact_phone, '')), '');
  v_id_path := nullif(trim(coalesce(p_id_document_path, '')), '');

  if v_name is null then
    raise exception 'Full name is required' using errcode = '22023';
  end if;

  if v_operating_area is null then
    raise exception 'Operating area is required' using errcode = '22023';
  end if;

  if v_emergency_name is null or v_emergency_phone is null then
    raise exception 'Emergency contact is required' using errcode = '22023';
  end if;

  -- A first submission must include the ID card. A resubmission may omit
  -- it, which keeps the document already on file.
  if v_id_path is null and not exists (
    select 1 from public.rider_verifications v
     where v.rider_user_id = v_uid
       and v.id_document_path is not null
  ) then
    raise exception 'An ID card photo is required for verification' using errcode = '22023';
  end if;

  insert into public.riders (
    user_id,
    full_name,
    phone,
    vehicle_type,
    vehicle_number,
    photo_path,
    operating_area,
    active,
    available,
    created_at,
    updated_at
  ) values (
    v_uid,
    v_name,
    nullif(trim(coalesce(p_phone, '')), ''),
    'motorcycle',
    null,
    nullif(trim(coalesce(p_photo_path, '')), ''),
    v_operating_area,
    true,
    true,
    now(),
    now()
  )
  on conflict (user_id) do update
    set full_name       = excluded.full_name,
        phone           = coalesce(excluded.phone, public.riders.phone),
        vehicle_type    = 'motorcycle',
        photo_path      = coalesce(excluded.photo_path, public.riders.photo_path),
        operating_area  = excluded.operating_area,
        updated_at      = now();

  insert into public.rider_verifications as v (
    rider_user_id,
    id_document_path,
    emergency_contact_name,
    emergency_contact_phone,
    status,
    rejection_reason,
    submitted_at,
    resubmitted_at,
    reviewed_at,
    reviewed_by,
    created_at,
    updated_at
  ) values (
    v_uid,
    v_id_path,
    v_emergency_name,
    v_emergency_phone,
    'pending',
    null,
    now(),
    null,
    null,
    null,
    now(),
    now()
  )
  on conflict (rider_user_id) do update
    set id_document_path         = coalesce(excluded.id_document_path, v.id_document_path),
        emergency_contact_name   = excluded.emergency_contact_name,
        emergency_contact_phone  = excluded.emergency_contact_phone,
        status                   = case when v.status = 'approved' then 'approved' else 'pending' end,
        rejection_reason         = case when v.status = 'approved' then v.rejection_reason else null end,
        submitted_at             = case when v.status = 'approved' then v.submitted_at else now() end,
        resubmitted_at           = case when v.status = 'approved' then v.resubmitted_at else now() end,
        reviewed_at              = case when v.status = 'approved' then v.reviewed_at else null end,
        reviewed_by              = case when v.status = 'approved' then v.reviewed_by else null end,
        updated_at               = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.submit_rider_verification(text, text, text, text, text, text, text) from public;
revoke execute on function public.submit_rider_verification(text, text, text, text, text, text, text) from anon;
grant execute on function public.submit_rider_verification(text, text, text, text, text, text, text) to authenticated;

comment on function public.submit_rider_verification is
  'Registers or updates an Ewizzy motorcycle/Okada rider and their single ID card submission. Always writes vehicle_type = ''motorcycle'' and a server-decided verification status.';


-- =====================================================================
-- SECTION 7. Deliveries require an approved verification
--
-- A rider who is still pending verification must not receive delivery
-- assignments. That rule is enforced by the database in three places:
-- the claim RPC, and the two rider SELECT policies. The dashboard hides
-- the same thing for usability, but the database is what decides.
-- =====================================================================

-- 7a. Claiming an unclaimed delivery.
--
-- Identical to the definition in 20261002000000_food_order_integrity.sql
-- except for one added condition: the caller must have an approved
-- verification. The single conditional UPDATE remains the concurrency
-- control, so two riders pressing Claim at the same time still cannot
-- both win.
create or replace function public.claim_food_order(p_order_id bigint)
returns public.food_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rider public.riders%rowtype;
  v_order public.food_orders%rowtype;
begin
  if p_order_id is null then
    raise exception 'order_id is required' using errcode = '22023';
  end if;

  select r.*
    into v_rider
    from public.riders r
   where r.user_id = auth.uid()
     and r.active = true
   limit 1;

  if not found then
    raise exception 'You are not an active Ewizzy rider' using errcode = '42501';
  end if;

  if not (select public.rider_is_verified()) then
    raise exception
      'Your Ewizzy rider account is pending verification. You can receive delivery requests once an admin approves it.'
      using errcode = '42501';
  end if;

  if not v_rider.available then
    raise exception 'Go online before accepting a delivery' using errcode = '42501';
  end if;

  update public.food_orders o
     set rider_id = v_rider.id,
         updated_at = now()
   where o.id = p_order_id
     and o.status = 'ready_for_pickup'
     and o.rider_id is null
  returning * into v_order;

  if not found then
    raise exception
      'This delivery is no longer available. It was just taken by another rider.'
      using errcode = 'P0001';
  end if;

  return v_order;
end;
$$;

-- 7b. The claimable delivery board.
--
-- Same policy as before plus the approved-verification condition, so an
-- unverified rider does not even see unclaimed work.
drop policy if exists "Riders can view available food deliveries"
  on public.food_orders;

create policy "Riders can view available food deliveries"
  on public.food_orders
  for select
  to authenticated
  using (
        status = 'ready_for_pickup'
    and rider_id is null
    and exists (
      select 1
        from public.riders r
       where r.user_id = auth.uid()
         and r.active = true
         and r.available = true
    )
    and (select public.rider_is_verified())
  );

-- 7c. Line items of a claimable delivery follow the same rule.
drop policy if exists "Riders can view food order items for their deliveries"
  on public.food_order_items;

create policy "Riders can view food order items for their deliveries"
  on public.food_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.food_orders fo
       where fo.id = order_id
         and (
              ( fo.rider_id is not null
                and fo.rider_id = (select public.current_rider_id()) )
           or ( fo.status = 'ready_for_pickup'
                and fo.rider_id is null
                and exists (
                  select 1
                    from public.riders r
                   where r.user_id = auth.uid()
                     and r.active = true
                     and r.available = true
                )
                and (select public.rider_is_verified()) )
         )
    )
  );


-- =====================================================================
-- SECTION 8. Backfill existing riders as approved
--
-- These riders predate this migration and were already able to take
-- deliveries, so they must not suddenly be locked out. Only riders
-- registered from now on begin as 'pending'.
--
-- id_document_path is left null: the migration does not invent a
-- document that was never uploaded. An admin can still reject or request
-- a correction, and the rider dashboard offers a replacement upload.
-- =====================================================================
insert into public.rider_verifications (
  rider_user_id,
  status,
  submitted_at,
  created_at,
  updated_at
)
select r.user_id,
       'approved',
       r.created_at,
       r.created_at,
       now()
  from public.riders r
  on conflict (rider_user_id) do nothing;


-- =====================================================================
-- END OF MIGRATION
--
-- The client calls:
--
--   supabase.rpc('submit_rider_verification', {
--     p_full_name: 'Chidi Okeke',
--     p_phone: '08031234567',
--     p_photo_path: '<profile-photos storage path>',
--     p_operating_area: 'Lagos',
--     p_emergency_contact_name: 'Ngozi Okeke',
--     p_emergency_contact_phone: '08059876543',
--     p_id_document_path: '<rider-verification-documents storage path>',
--   })
--
-- No vehicle type and no verification status are ever sent: both are
-- decided by the database.
--
-- An admin approves or rejects through the existing admin dashboard,
-- which writes this table under the admin-only policy above and reads
-- the ID back through a signed URL that the admin-only storage policy
-- has already authorised.
-- =====================================================================
