-- =====================================================================
-- Ewizzy Okada passenger rides
-- Migration 20261019000000
-- Additive only. Idempotent. No existing tables modified.
-- =====================================================================

-- A. Riders opt-in to passenger rides separately from parcel deliveries.
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS accepts_okada BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.riders.accepts_okada IS
  'True when this motorcycle/Okada rider is opted in to passenger rides. Separate from parcel dispatch eligibility.';

-- B. okada_rides table: passenger trips, NOT parcel deliveries.
CREATE TABLE IF NOT EXISTS public.okada_rides (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_user_id UUID NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_area TEXT NOT NULL,
  pickup_latitude NUMERIC(10, 7),
  pickup_longitude NUMERIC(10, 7),
  destination_address TEXT NOT NULL,
  destination_area TEXT NOT NULL,
  destination_latitude NUMERIC(10, 7),
  destination_longitude NUMERIC(10, 7),
  fare_estimate NUMERIC NOT NULL CHECK (fare_estimate > 0 AND fare_estimate <= 99999999.99 AND fare_estimate = trunc(fare_estimate, 2)),
  fare_confirmed NUMERIC CHECK (fare_confirmed IS NULL OR (fare_confirmed > 0 AND fare_confirmed <= 99999999.99 AND fare_confirmed = trunc(fare_confirmed, 2))),
  rider_id BIGINT REFERENCES public.riders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'searching_for_rider', 'accepted',
      'arriving', 'picked_up', 'in_progress', 'completed',
      'cancelled', 'no_rider_found'
    )),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.okada_rides IS
  'Ewizzy Okada passenger rides. A motorcycle rider transports a passenger from pickup to destination. Separate from parcel dispatch bookings.';

ALTER TABLE public.okada_rides ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_okada_rides_customer
  ON public.okada_rides (customer_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_okada_rides_rider
  ON public.okada_rides (rider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_okada_rides_available
  ON public.okada_rides (status, created_at)
  WHERE status IN ('pending', 'searching_for_rider') AND rider_id IS NULL;

-- C. Status transition predicate. Forward-only, one step at a time.
CREATE OR REPLACE FUNCTION public.okada_ride_transition_allowed(
  p_old_status TEXT,
  p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  IF p_old_status IS NULL OR p_new_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_old_status = p_new_status THEN
    RETURN TRUE;
  END IF;

  RETURN (p_old_status, p_new_status) IN (
    ('pending', 'searching_for_rider'),
    ('pending', 'accepted'),
    ('pending', 'cancelled'),
    ('pending', 'no_rider_found'),
    ('searching_for_rider', 'accepted'),
    ('searching_for_rider', 'cancelled'),
    ('searching_for_rider', 'no_rider_found'),
    ('accepted', 'arriving'),
    ('accepted', 'cancelled'),
    ('arriving', 'picked_up'),
    ('picked_up', 'in_progress'),
    ('in_progress', 'completed')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.okada_ride_transition_allowed(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.okada_ride_transition_allowed(TEXT, TEXT) FROM ANON;

COMMENT ON FUNCTION public.okada_ride_transition_allowed(TEXT, TEXT) IS
  'Returns TRUE when an Okada ride may transition from p_old_status to p_new_status. Forward-only, one step at a time. Terminal states are dead ends.';

-- D. BEFORE INSERT guard. Forces caller ownership, zeros lifecycle timestamps.
CREATE OR REPLACE FUNCTION public.okada_rides_guard_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to book an Okada ride' USING ERRCODE = '42501';
  END IF;

  IF NEW.customer_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You may only create an Okada ride for yourself' USING ERRCODE = '42501';
  END IF;

  NEW.rider_id := NULL;
  NEW.status := 'pending';
  NEW.accepted_at := NULL;
  NEW.arrived_at := NULL;
  NEW.picked_up_at := NULL;
  NEW.completed_at := NULL;
  NEW.cancelled_at := NULL;
  NEW.cancelled_by := NULL;
  NEW.cancel_reason := NULL;
  NEW.fare_confirmed := NULL;
  NEW.updated_at := NOW();
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS okada_rides_guard_insert ON public.okada_rides;
CREATE TRIGGER okada_rides_guard_insert
  BEFORE INSERT ON public.okada_rides
  FOR EACH ROW
  EXECUTE FUNCTION public.okada_rides_guard_insert();

-- E. BEFORE UPDATE guard. Three-role protection: admin, customer, assigned rider.
CREATE OR REPLACE FUNCTION public.okada_rides_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_is_customer BOOLEAN := FALSE;
  v_is_assigned_rider BOOLEAN := FALSE;
  v_rider_id BIGINT := public.current_rider_id();
  v_is_claim BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = v_uid AND p.role = 'admin'
  ) THEN
    v_is_admin := TRUE;
  END IF;

  IF OLD.customer_user_id = v_uid THEN
    v_is_customer := TRUE;
  END IF;

  IF NOT v_is_admin
     AND OLD.rider_id IS NOT NULL
     AND OLD.rider_id = v_rider_id THEN
    v_is_assigned_rider := TRUE;
  END IF;

  -- Claim recognition. Self-authorizing: a pure customer has v_rider_id NULL,
  -- so new.rider_id = v_rider_id can only be true when the caller is the
  -- rider that is claiming this unassigned ride.
  IF OLD.rider_id IS NULL
     AND NEW.rider_id = v_rider_id
     AND NEW.rider_id IS NOT NULL
     AND NEW.status = 'accepted'
     AND OLD.status IN ('pending', 'searching_for_rider') THEN
    v_is_claim := TRUE;
  END IF;

  IF v_is_claim THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.riders r
      WHERE r.user_id = v_uid
        AND r.active = true
        AND r.available = true
        AND r.accepts_okada = true
    ) OR NOT (SELECT public.rider_is_verified()) THEN
      RAISE EXCEPTION 'Rider is not eligible to claim this Okada ride' USING ERRCODE = '42501';
    END IF;

    IF NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
       OR NEW.passenger_name IS DISTINCT FROM OLD.passenger_name
       OR NEW.passenger_phone IS DISTINCT FROM OLD.passenger_phone
       OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
       OR NEW.pickup_area IS DISTINCT FROM OLD.pickup_area
       OR NEW.pickup_latitude IS DISTINCT FROM OLD.pickup_latitude
       OR NEW.pickup_longitude IS DISTINCT FROM OLD.pickup_longitude
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
       OR NEW.destination_area IS DISTINCT FROM OLD.destination_area
       OR NEW.destination_latitude IS DISTINCT FROM OLD.destination_latitude
       OR NEW.destination_longitude IS DISTINCT FROM OLD.destination_longitude
       OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
       OR NEW.fare_estimate IS DISTINCT FROM OLD.fare_estimate
       OR NEW.fare_confirmed IS DISTINCT FROM OLD.fare_confirmed
       OR (NEW.accepted_at IS DISTINCT FROM OLD.accepted_at AND NOT (OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL))
       OR NEW.arrived_at IS DISTINCT FROM OLD.arrived_at
       OR NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason
       OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Claim may only assign rider and lifecycle fields' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Customer field protection: customers may only cancel their own unassigned
  -- ride. A legitimate rider claim is exempt, exactly as in the parcel
  -- dispatch guard. The status column is deliberately NOT in this list: a
  -- legitimate cancellation changes status, and the status transition guard
  -- below plus the "only customer or assigned rider may cancel" rule are
  -- what constrain it.
  IF v_is_customer AND NOT v_is_admin AND NOT v_is_claim THEN
    IF NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
       OR NEW.passenger_name IS DISTINCT FROM OLD.passenger_name
       OR NEW.passenger_phone IS DISTINCT FROM OLD.passenger_phone
       OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
       OR NEW.pickup_area IS DISTINCT FROM OLD.pickup_area
       OR NEW.pickup_latitude IS DISTINCT FROM OLD.pickup_latitude
       OR NEW.pickup_longitude IS DISTINCT FROM OLD.pickup_longitude
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
       OR NEW.destination_area IS DISTINCT FROM OLD.destination_area
       OR NEW.destination_latitude IS DISTINCT FROM OLD.destination_latitude
       OR NEW.destination_longitude IS DISTINCT FROM OLD.destination_longitude
       OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
       OR NEW.fare_estimate IS DISTINCT FROM OLD.fare_estimate
       OR NEW.fare_confirmed IS DISTINCT FROM OLD.fare_confirmed
       OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.arrived_at IS DISTINCT FROM OLD.arrived_at
       OR NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR (NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason AND NOT (NEW.status = 'cancelled' AND OLD.status IN ('pending', 'searching_for_rider', 'accepted')))
       OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
      RAISE EXCEPTION
        'Customers may only cancel an Okada ride; no other fields may change'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Assigned rider field protection: riders may only change status (and the
  -- fare they confirm). Every other column is protected, so a rider cannot
  -- tamper with the trip details, the customer's estimate, the ownership or
  -- the audit fields. The status column is deliberately NOT in this list
  -- because a rider's whole job is to advance it; the transition guard
  -- below is what restricts which moves are legal.
  IF v_is_assigned_rider AND NOT v_is_admin THEN
    IF NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
       OR NEW.passenger_name IS DISTINCT FROM OLD.passenger_name
       OR NEW.passenger_phone IS DISTINCT FROM OLD.passenger_phone
       OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
       OR NEW.pickup_area IS DISTINCT FROM OLD.pickup_area
       OR NEW.pickup_latitude IS DISTINCT FROM OLD.pickup_latitude
       OR NEW.pickup_longitude IS DISTINCT FROM OLD.pickup_longitude
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
       OR NEW.destination_area IS DISTINCT FROM OLD.destination_area
       OR NEW.destination_latitude IS DISTINCT FROM OLD.destination_latitude
       OR NEW.destination_longitude IS DISTINCT FROM OLD.destination_longitude
       OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
       OR NEW.fare_estimate IS DISTINCT FROM OLD.fare_estimate
       OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.arrived_at IS DISTINCT FROM OLD.arrived_at
       OR NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR (NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason AND NOT (NEW.status = 'cancelled' AND OLD.status IN ('pending', 'searching_for_rider', 'accepted')))
       OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
      RAISE EXCEPTION
        'Riders may only change the status of an Okada ride'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Status transition guard.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.okada_ride_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Illegal Okada ride status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'cancelled' THEN
      IF v_is_customer AND NOT v_is_admin THEN
        IF OLD.rider_id IS NOT NULL OR OLD.status NOT IN ('pending', 'searching_for_rider') THEN
          RAISE EXCEPTION 'Customers may only cancel their own unassigned pending or searching rides'
            USING ERRCODE = '42501';
        END IF;
      END IF;
      IF v_is_assigned_rider AND NOT v_is_admin THEN
        IF OLD.status NOT IN ('accepted') THEN
          RAISE EXCEPTION 'Assigned riders may only cancel before pickup'
            USING ERRCODE = '42501';
        END IF;
      END IF;
      IF NOT (v_is_admin OR v_is_customer OR v_is_assigned_rider) THEN
        RAISE EXCEPTION 'Only the customer, assigned rider, or admin may cancel an Okada ride'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- Server-managed lifecycle timestamps.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' AND OLD.accepted_at IS NULL THEN
      NEW.accepted_at := NOW();
    END IF;
    IF NEW.status = 'arriving' AND OLD.arrived_at IS NULL THEN
      NEW.arrived_at := NOW();
    END IF;
    IF NEW.status = 'picked_up' AND OLD.picked_up_at IS NULL THEN
      NEW.picked_up_at := NOW();
    END IF;
    IF NEW.status = 'completed' AND OLD.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    IF NEW.status = 'cancelled' THEN
      NEW.cancelled_at := NOW();
      NEW.cancelled_by := v_uid;
    ELSE
      NEW.cancelled_at := OLD.cancelled_at;
      NEW.cancelled_by := OLD.cancelled_by;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS okada_rides_guard_update ON public.okada_rides;
CREATE TRIGGER okada_rides_guard_update
  BEFORE UPDATE ON public.okada_rides
  FOR EACH ROW
  EXECUTE FUNCTION public.okada_rides_guard_update();

-- F. RLS policies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Customers can view their own okada rides'
  ) THEN
    CREATE POLICY "Customers can view their own okada rides"
      ON public.okada_rides
      FOR SELECT TO authenticated
      USING (customer_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Customers can create their own okada rides'
  ) THEN
    CREATE POLICY "Customers can create their own okada rides"
      ON public.okada_rides
      FOR INSERT TO authenticated
      WITH CHECK (customer_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Customers can cancel their own unassigned okada rides'
  ) THEN
    CREATE POLICY "Customers can cancel their own unassigned okada rides"
      ON public.okada_rides
      FOR UPDATE TO authenticated
      USING (
        customer_user_id = auth.uid()
        AND status IN ('pending', 'searching_for_rider')
        AND rider_id IS NULL
      )
      WITH CHECK (
        customer_user_id = auth.uid()
        AND status = 'cancelled'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Riders can view available okada rides'
  ) THEN
    CREATE POLICY "Riders can view available okada rides"
      ON public.okada_rides
      FOR SELECT TO authenticated
      USING (
        status IN ('pending', 'searching_for_rider')
        AND rider_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.riders r
          WHERE r.user_id = auth.uid()
            AND r.active = true
            AND r.available = true
            AND r.accepts_okada = true
            AND (SELECT public.rider_is_verified())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Riders can view their own okada rides'
  ) THEN
    CREATE POLICY "Riders can view their own okada rides"
      ON public.okada_rides
      FOR SELECT TO authenticated
      USING (
        rider_id IS NOT NULL
        AND rider_id = (SELECT public.current_rider_id())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Riders can update their own okada rides'
  ) THEN
    CREATE POLICY "Riders can update their own okada rides"
      ON public.okada_rides
      FOR UPDATE TO authenticated
      USING (
        rider_id IS NOT NULL
        AND rider_id = (SELECT public.current_rider_id())
        AND status NOT IN ('completed', 'cancelled', 'no_rider_found')
      )
      WITH CHECK (
        rider_id IS NOT NULL
        AND rider_id = (SELECT public.current_rider_id())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'okada_rides'
      AND policyname = 'Admins can manage all okada rides'
  ) THEN
    CREATE POLICY "Admins can manage all okada rides"
      ON public.okada_rides
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE ON public.okada_rides TO authenticated;

-- G. create_okada_ride: the only customer write path for a new ride.
CREATE OR REPLACE FUNCTION public.create_okada_ride(
  p_passenger_name TEXT,
  p_passenger_phone TEXT,
  p_pickup_address TEXT,
  p_pickup_area TEXT,
  p_destination_address TEXT,
  p_destination_area TEXT,
  p_fare_estimate NUMERIC
)
RETURNS public.okada_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_phone TEXT;
  v_pickup_address TEXT;
  v_pickup_area TEXT;
  v_destination_address TEXT;
  v_destination_area TEXT;
  v_fare NUMERIC;
  v_ride public.okada_rides%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to book an Okada ride' USING ERRCODE = '42501';
  END IF;

  v_name := NULLIF(TRIM(COALESCE(p_passenger_name, '')), '');
  v_phone := NULLIF(TRIM(COALESCE(p_passenger_phone, '')), '');
  v_pickup_address := NULLIF(TRIM(COALESCE(p_pickup_address, '')), '');
  v_pickup_area := NULLIF(TRIM(COALESCE(p_pickup_area, '')), '');
  v_destination_address := NULLIF(TRIM(COALESCE(p_destination_address, '')), '');
  v_destination_area := NULLIF(TRIM(COALESCE(p_destination_area, '')), '');

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Passenger name is required' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Passenger phone is required' USING ERRCODE = '22023';
  END IF;
  IF v_pickup_address IS NULL OR v_pickup_area IS NULL THEN
    RAISE EXCEPTION 'Pickup address and area are required' USING ERRCODE = '22023';
  END IF;
  IF v_destination_address IS NULL OR v_destination_area IS NULL THEN
    RAISE EXCEPTION 'Destination address and area are required' USING ERRCODE = '22023';
  END IF;

  v_fare := COALESCE(p_fare_estimate, 0);
  IF v_fare <= 0 OR v_fare > 99999999.99 OR v_fare <> trunc(v_fare, 2) THEN
    RAISE EXCEPTION 'Enter a valid fare estimate greater than zero' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.okada_rides (
    customer_user_id,
    passenger_name,
    passenger_phone,
    pickup_address,
    pickup_area,
    destination_address,
    destination_area,
    fare_estimate,
    status
  ) VALUES (
    v_uid,
    v_name,
    v_phone,
    v_pickup_address,
    v_pickup_area,
    v_destination_address,
    v_destination_area,
    v_fare,
    'pending'
  )
  RETURNING * INTO v_ride;

  RETURN v_ride;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_okada_ride(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_okada_ride(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM ANON;
GRANT EXECUTE ON FUNCTION public.create_okada_ride(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

COMMENT ON FUNCTION public.create_okada_ride(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) IS
  'Creates an Okada passenger ride request for the signed-in customer. The fare is the customer-entered estimate; no amount is invented by the server.';

-- H. claim_okada_ride: concurrency-safe rider acceptance.
CREATE OR REPLACE FUNCTION public.claim_okada_ride(p_ride_id BIGINT)
RETURNS public.okada_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rider public.riders%ROWTYPE;
  v_ride public.okada_rides%ROWTYPE;
BEGIN
  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'ride_id is required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT r.*
    INTO v_rider
    FROM public.riders r
   WHERE r.user_id = auth.uid()
     AND r.active = true
     AND r.accepts_okada = true
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not an Ewizzy rider opted in to passenger rides' USING ERRCODE = '42501';
  END IF;

  IF NOT (SELECT public.rider_is_verified()) THEN
    RAISE EXCEPTION 'Your Ewizzy rider account is pending verification' USING ERRCODE = '42501';
  END IF;

  IF NOT v_rider.available THEN
    RAISE EXCEPTION 'Go online before accepting a ride' USING ERRCODE = '42501';
  END IF;

  -- Atomic conditional claim. Exactly one concurrent caller can win: the
  -- rider_id IS NULL guard and the eligible status list are both part of
  -- the same UPDATE, so a second rider matches no row and gets P0001.
  UPDATE public.okada_rides o
     SET rider_id = v_rider.id,
         status = 'accepted',
         accepted_at = NOW(),
         updated_at = NOW()
   WHERE o.id = p_ride_id
     AND o.status IN ('pending', 'searching_for_rider')
     AND o.rider_id IS NULL
  RETURNING * INTO v_ride;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This ride is no longer available. It was just taken by another rider.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_ride;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_okada_ride(BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_okada_ride(BIGINT) FROM ANON;
GRANT EXECUTE ON FUNCTION public.claim_okada_ride(BIGINT) TO authenticated;

COMMENT ON FUNCTION public.claim_okada_ride(BIGINT) IS
  'Atomically assigns an unclaimed pending/searching Okada ride to the current opted-in, verified, online rider.';

-- I. update_okada_ride_status: rider advances the ride.
CREATE OR REPLACE FUNCTION public.update_okada_ride_status(
  p_ride_id BIGINT,
  p_new_status TEXT,
  p_fare_confirmed NUMERIC
)
RETURNS public.okada_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rider_id BIGINT := public.current_rider_id();
  v_ride public.okada_rides%ROWTYPE;
  v_new_status TEXT;
  v_fare NUMERIC;
BEGIN
  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'ride_id is required' USING ERRCODE = '22023';
  END IF;

  v_new_status := NULLIF(TRIM(COALESCE(p_new_status, '')), '');
  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'A new status is required' USING ERRCODE = '22023';
  END IF;

  SELECT o.*
    INTO v_ride
    FROM public.okada_rides o
   WHERE o.id = p_ride_id
     AND o.rider_id = v_rider_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not the rider assigned to this ride' USING ERRCODE = '42501';
  END IF;

  -- Only the forward, rider-driven statuses may be set through this RPC.
  -- Terminal states (completed, cancelled, no_rider_found) and the
  -- assignment statuses are handled elsewhere.
  IF v_new_status NOT IN ('arriving', 'picked_up', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Unsupported ride status: %', v_new_status USING ERRCODE = '22023';
  END IF;

  IF NOT public.okada_ride_transition_allowed(v_ride.status, v_new_status) THEN
    RAISE EXCEPTION 'Illegal Okada ride status transition: % -> %', v_ride.status, v_new_status
      USING ERRCODE = '22023';
  END IF;

  IF p_fare_confirmed IS NOT NULL AND (p_fare_confirmed <= 0 OR p_fare_confirmed > 99999999.99 OR p_fare_confirmed <> trunc(p_fare_confirmed, 2)) THEN
    RAISE EXCEPTION 'Fare confirmed must be a positive amount with at most two decimal places' USING ERRCODE = '22023';
  END IF;

  v_fare := NULLIF(COALESCE(p_fare_confirmed, 0), 0);

  UPDATE public.okada_rides o
     SET status = v_new_status,
         fare_confirmed = COALESCE(o.fare_confirmed, v_fare)
   WHERE o.id = p_ride_id
     AND o.rider_id = v_rider_id
  RETURNING * INTO v_ride;

  RETURN v_ride;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_okada_ride_status(BIGINT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_okada_ride_status(BIGINT, TEXT, NUMERIC) FROM ANON;
GRANT EXECUTE ON FUNCTION public.update_okada_ride_status(BIGINT, TEXT, NUMERIC) TO authenticated;

COMMENT ON FUNCTION public.update_okada_ride_status(BIGINT, TEXT, NUMERIC) IS
  'Advances an Okada ride through arriving -> picked_up -> in_progress -> completed. Only the assigned rider may call it.';

-- J. cancel_okada_ride: customer or assigned rider cancellation.
CREATE OR REPLACE FUNCTION public.cancel_okada_ride(
  p_ride_id BIGINT,
  p_reason TEXT
)
RETURNS public.okada_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rider_id BIGINT := public.current_rider_id();
  v_ride public.okada_rides%ROWTYPE;
  v_reason TEXT;
BEGIN
  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'ride_id is required' USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(TRIM(COALESCE(p_reason, '')), '');

  SELECT o.*
    INTO v_ride
    FROM public.okada_rides o
   WHERE o.id = p_ride_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This ride could not be found' USING ERRCODE = '42501';
  END IF;

  IF v_ride.customer_user_id <> v_uid AND v_ride.rider_id IS DISTINCT FROM v_rider_id THEN
    RAISE EXCEPTION 'Only the customer or the assigned rider may cancel this ride' USING ERRCODE = '42501';
  END IF;

  IF v_ride.customer_user_id = v_uid THEN
    IF v_ride.rider_id IS NOT NULL OR v_ride.status NOT IN ('pending', 'searching_for_rider') THEN
      RAISE EXCEPTION 'Customers may only cancel their own unassigned pending or searching rides' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_ride.rider_id IS NOT DISTINCT FROM v_rider_id AND v_rider_id IS NOT NULL THEN
    IF v_ride.status NOT IN ('accepted') THEN
      RAISE EXCEPTION 'Assigned riders may only cancel before pickup' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_ride.status IN ('completed', 'cancelled', 'no_rider_found') THEN
    RAISE EXCEPTION 'This ride can no longer be cancelled' USING ERRCODE = '22023';
  END IF;

  IF NOT public.okada_ride_transition_allowed(v_ride.status, 'cancelled') THEN
    RAISE EXCEPTION 'This ride can no longer be cancelled' USING ERRCODE = '22023';
  END IF;

  UPDATE public.okada_rides o
     SET status = 'cancelled',
         cancel_reason = v_reason
   WHERE o.id = p_ride_id
  RETURNING * INTO v_ride;

  RETURN v_ride;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_okada_ride(BIGINT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_okada_ride(BIGINT, TEXT) FROM ANON;
GRANT EXECUTE ON FUNCTION public.cancel_okada_ride(BIGINT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.cancel_okada_ride(BIGINT, TEXT) IS
  'Cancels an Okada ride. Only the customer who booked it or the assigned rider may cancel, and only before it is completed.';

-- K. notify_okada_admins: admin notifications for Okada rides.
-- A DEDICATED function. The dispatch notification function
-- (dispatch_admin_notify) reads public.dispatch_bookings and must not be
-- reused here, because an Okada ride has a different table, a different
-- status vocabulary, and different display fields.
CREATE OR REPLACE FUNCTION public.notify_okada_admins(
  p_ride_id BIGINT,
  p_event TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ride public.okada_rides%ROWTYPE;
  v_customer_name TEXT;
  v_rider_name TEXT;
  v_admin_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  IF p_ride_id IS NULL OR p_event IS NULL THEN
    RETURN;
  END IF;

  SELECT o.*
    INTO v_ride
    FROM public.okada_rides o
   WHERE o.id = p_ride_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT NULLIF(TRIM(p.full_name), '') INTO v_customer_name
    FROM public.profiles p
   WHERE p.user_id = v_ride.customer_user_id;

  SELECT NULLIF(TRIM(p.full_name), '') INTO v_rider_name
    FROM public.profiles p
   WHERE p.user_id = (
     SELECT r.user_id FROM public.riders r WHERE r.id = v_ride.rider_id LIMIT 1
   );

  v_metadata := JSONB_BUILD_OBJECT(
    'ride_id', v_ride.id,
    'event', p_event,
    'status', v_ride.status,
    'customer_user_id', v_ride.customer_user_id,
    'rider_id', v_ride.rider_id
  );

  IF p_event = 'requested' THEN
    v_title := 'New Okada ride requested';
    v_message := 'Okada ride #' || v_ride.id || ' was requested by ' ||
      COALESCE(v_customer_name, 'a customer') || ' from ' ||
      COALESCE(v_ride.pickup_area, 'an unknown pickup') || ' to ' ||
      COALESCE(v_ride.destination_area, 'an unknown destination') || '.';
  ELSIF p_event = 'accepted' THEN
    v_title := 'Okada ride accepted';
    v_message := 'Okada ride #' || v_ride.id || ' was accepted by ' ||
      COALESCE(v_rider_name, 'a rider') || '.';
  ELSIF p_event = 'arriving' THEN
    v_title := 'Okada rider arriving';
    v_message := 'The rider for Okada ride #' || v_ride.id || ' is on the way to the pickup.';
  ELSIF p_event = 'picked_up' THEN
    v_title := 'Okada passenger picked up';
    v_message := 'The passenger for Okada ride #' || v_ride.id || ' has been picked up.';
  ELSIF p_event = 'completed' THEN
    v_title := 'Okada ride completed';
    v_message := 'Okada ride #' || v_ride.id || ' was completed.';
  ELSIF p_event = 'cancelled' THEN
    v_title := 'Okada ride cancelled';
    v_message := 'Okada ride #' || v_ride.id || ' was cancelled.';
  ELSE
    RETURN;
  END IF;

  FOR v_admin_user_id IN
    SELECT p.user_id FROM public.profiles p WHERE p.role = 'admin' AND p.user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, is_read, metadata, created_at
    ) VALUES (
      v_admin_user_id,
      'okada',
      v_title,
      v_message,
      FALSE,
      v_metadata,
      NOW()
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_okada_admins(BIGINT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_okada_admins(BIGINT, TEXT) FROM ANON;
REVOKE EXECUTE ON FUNCTION public.notify_okada_admins(BIGINT, TEXT) FROM authenticated;

COMMENT ON FUNCTION public.notify_okada_admins(BIGINT, TEXT) IS
  'Inserts one admin notification per Ewizzy admin for an Okada ride event. Called only by the okada_rides_admin_notify trigger.';

-- L. okada_rides_admin_notify: trigger that classifies Okada ride events.
CREATE OR REPLACE FUNCTION public.okada_rides_admin_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_okada_admins(NEW.id, 'requested');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' AND OLD.rider_id IS NULL AND NEW.rider_id IS NOT NULL THEN
      PERFORM public.notify_okada_admins(NEW.id, 'accepted');
    ELSIF NEW.status = 'arriving' THEN
      PERFORM public.notify_okada_admins(NEW.id, 'arriving');
    ELSIF NEW.status = 'picked_up' THEN
      PERFORM public.notify_okada_admins(NEW.id, 'picked_up');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.notify_okada_admins(NEW.id, 'completed');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_okada_admins(NEW.id, 'cancelled');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.okada_rides_admin_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.okada_rides_admin_notify() FROM ANON;
REVOKE EXECUTE ON FUNCTION public.okada_rides_admin_notify() FROM authenticated;

COMMENT ON FUNCTION public.okada_rides_admin_notify() IS
  'Trigger function that classifies Okada ride status changes and calls notify_okada_admins().';

DROP TRIGGER IF EXISTS okada_rides_admin_notify ON public.okada_rides;
CREATE TRIGGER okada_rides_admin_notify
  AFTER INSERT OR UPDATE ON public.okada_rides
  FOR EACH ROW
  EXECUTE FUNCTION public.okada_rides_admin_notify();

-- M. Realtime: publish okada_rides so the customer and rider dashboards
-- receive live status changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'okada_rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.okada_rides;
  END IF;
END
$$;
