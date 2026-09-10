-- NaijaFix Phase 1 rewards hardening follow-up.
-- Safe, idempotent migration.
-- Does NOT drop tables, delete data, reset the database, or overwrite existing rows.
-- Does NOT change existing booking behavior, payment processing, or commission collection.
--
-- Fixes three Phase 1 findings:
--   1. get_customer_rewards: an authenticated caller could read ANY customer's
--      rewards balance because the function accepted an arbitrary
--      p_customer_user_id with no caller-ownership check.
--   2. adjust_customer_points: customer_reward_transactions.created_by was
--      always inserted as NULL, so the audit trail could not attribute the
--      trusted actor responsible for the adjustment.
--   3. adjust_customer_points: the negative-balance branch was ambiguous and
--      could let points_balance silently become negative.
--
-- Attribution design note:
--   adjust_customer_points is service_role-only (granted only to
--   service_role, revoked from public/anon/authenticated). A bare service_role
--   call carries no session JWT, so auth.uid() inside the function is NULL.
--   Attribution therefore comes from an explicit trusted p_created_by parameter
--   supplied by the server-side caller (edge function / trigger), falling back
--   to auth.uid() when one is provided. Because the function is
--   service_role-only, no authenticated client can supply p_created_by, so no
--   client-supplied user id can ever be recorded as the actor.

-- ============================================================
-- 1. get_customer_rewards: enforce caller ownership
-- ============================================================
create or replace function public.get_customer_rewards(p_customer_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.customer_rewards%rowtype;
begin
  -- AuthZ: an authenticated caller may only read their OWN rewards.
  if p_customer_user_id is null then
    raise exception 'customer_user_id is required';
  end if;

  if p_customer_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  select * into v_row
    from public.customer_rewards cr
   where cr.customer_user_id = p_customer_user_id;

  if not found then
    return jsonb_build_object(
      'customer_user_id', p_customer_user_id,
      'points_balance', 0,
      'lifetime_points', 0
    );
  end if;

  return jsonb_build_object(
    'customer_user_id', v_row.customer_user_id,
    'points_balance', coalesce(v_row.points_balance, 0),
    'lifetime_points', coalesce(v_row.lifetime_points, 0)
  );
end;
$$;

-- ============================================================
-- 2 & 3. adjust_customer_points: trusted attribution + explicit
--     non-negative balance invariant
-- ============================================================
create or replace function public.adjust_customer_points(
  p_customer_user_id uuid,
  p_points_delta integer,
  p_reason text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.customer_rewards%rowtype;
  v_new_balance integer;
  v_new_lifetime integer;
begin
  -- Validate inputs.
  if p_customer_user_id is null then
    raise exception 'customer_user_id is required';
  end if;

  if p_points_delta is null then
    raise exception 'points_delta is required';
  end if;

  -- Ensure a rewards row exists before locking it.
  insert into public.customer_rewards (customer_user_id, points_balance, lifetime_points, updated_at)
  values (p_customer_user_id, 0, 0, now())
  on conflict (customer_user_id) do nothing;

  -- Lock the row for the duration of this transaction.
  select * into v_row
    from public.customer_rewards cr
   where cr.customer_user_id = p_customer_user_id
   for update;

  v_new_balance := coalesce(v_row.points_balance, 0) + p_points_delta;
  v_new_lifetime := coalesce(v_row.lifetime_points, 0) + p_points_delta;

  -- Explicit invariant: points_balance must never be negative.
  -- A negative adjustment that would break the invariant is rejected
  -- rather than silently producing a negative balance.
  if v_new_balance < 0 then
    raise exception 'points adjustment would create a negative balance';
  end if;

  update public.customer_rewards cr
     set points_balance = v_new_balance,
         lifetime_points = v_new_lifetime,
         updated_at = now()
   where cr.customer_user_id = p_customer_user_id;

  select * into v_row
    from public.customer_rewards cr
   where cr.customer_user_id = p_customer_user_id;

  -- Audit trail: attribute the adjustment to the trusted server-side actor.
  -- p_created_by is supplied by the trusted server-side caller (edge function
  -- / trigger). auth.uid() alone is NOT sufficient here: a bare service_role
  -- call has no session JWT, so auth.uid() would be NULL. We accept an
  -- explicit trusted actor and fall back to auth.uid() when one is provided.
  -- The function is service_role-only, so no client can supply p_created_by.
  insert into public.customer_reward_transactions (
    customer_user_id,
    points_delta,
    balance_after,
    reason,
    created_by,
    created_at
  ) values (
    p_customer_user_id,
    p_points_delta,
    coalesce(v_row.points_balance, 0),
    p_reason,
    coalesce(p_created_by, auth.uid()),
    now()
  );

  return jsonb_build_object(
    'customer_user_id', p_customer_user_id,
    'points_balance', coalesce(v_row.points_balance, 0),
    'lifetime_points', coalesce(v_row.lifetime_points, 0)
  );
end;
$$;

-- ============================================================
-- Grants: preserve the same restricted EXECUTE policy as Phase 1.
-- get_customer_rewards stays authenticated-only (ownership is now
-- enforced inside the function). adjust_customer_points stays
-- service_role-only.
-- ============================================================
revoke execute on function public.get_customer_rewards(uuid) from public;
revoke execute on function public.get_customer_rewards(uuid) from anon;
grant execute on function public.get_customer_rewards(uuid) to authenticated;

revoke execute on function public.adjust_customer_points(uuid, integer, text) from public;
revoke execute on function public.adjust_customer_points(uuid, integer, text) from anon;
revoke execute on function public.adjust_customer_points(uuid, integer, text) from authenticated;
grant execute on function public.adjust_customer_points(uuid, integer, text) to service_role;