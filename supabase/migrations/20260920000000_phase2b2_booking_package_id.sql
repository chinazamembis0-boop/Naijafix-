-- NaijaFix Phase 2B-2: Persist selected service package on bookings
-- Safe, idempotent migration. Additive only. No existing data modified.

-- Add package_id to bookings (nullable for backward compatibility)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_id bigint;

-- FK with RESTRICT: prevent deletion of packages referenced by bookings.
-- PostgreSQL does not support IF NOT EXISTS on ADD CONSTRAINT, so we use
-- a DO block that checks pg_constraint for the constraint name first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_bookings_package_id'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT fk_bookings_package_id
      FOREIGN KEY (package_id) REFERENCES public.service_packages(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

-- Index for query performance on package-based lookups
CREATE INDEX IF NOT EXISTS idx_bookings_package_id
  ON public.bookings (package_id);
