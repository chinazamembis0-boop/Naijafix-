-- Ewizzy: released dispatch bookings must be visible to eligible riders
-- ---------------------------------------------------------------
-- Safe, idempotent migration. Additive only. No tables, columns,
-- triggers, other functions or other policies are modified.
--
-- ROOT CAUSE
--   Migration 20261016000004 added the 'released' status: when a rider
--   who has already accepted a booking releases it, the row keeps its
--   customer ownership but rider_id is cleared and status becomes
--   'released'. Migration 20261016000005 then extended
--   claim_dispatch_booking() to accept 'released' as a claimable source
--   status.
--
--   The RLS policy "Riders can view available dispatch bookings" was
--   written before either migration and still restricts visibility to
--   'pending' and 'searching_for_rider':
--       status in ('pending', 'searching_for_rider')
--   A released booking therefore matches no row under that policy, so an
--   eligible rider can never see it on the dashboard -- even though the
--   claim RPC (SECURITY DEFINER) can still claim it. The booking is
--   effectively stranded in the available pool.
--
-- FIX
--   Drop and recreate the existing policy, preserving its name, role,
--   operation, and every authorization condition byte-for-byte. The only
--   change is adding 'released' to the status list in USING:
--       status in ('pending', 'searching_for_rider', 'released')
--
--   The rider_id IS NULL restriction, the verified/active/online rider
--   check, the `for select to authenticated` grant, and the policy name
--   are all unchanged. No other policy is touched.
--
-- Guarded with drop ... if exists + create policy so the migration is
-- safe to re-run. NOT applied to the live database without explicit
-- approval.

drop policy if exists "Riders can view available dispatch bookings" on public.dispatch_bookings;

create policy "Riders can view available dispatch bookings"
  on public.dispatch_bookings
  for select to authenticated
  using (
    status in ('pending', 'searching_for_rider', 'released')
    and rider_id is null
    and exists (
      select 1 from public.riders r
      join public.rider_verifications rv on rv.rider_user_id = r.user_id
      where r.user_id = auth.uid()
        and r.active = true
        and r.available = true
        and rv.status = 'approved'
    )
  );

comment on policy "Riders can view available dispatch bookings" on public.dispatch_bookings is
  'Riders can see unassigned dispatch bookings that are open for claiming: pending, searching_for_rider, or released. Requires an active, online, approved rider.';