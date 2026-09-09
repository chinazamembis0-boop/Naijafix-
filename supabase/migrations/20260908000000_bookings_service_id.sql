-- NaijaFix: Add service_id to bookings for referential integrity
-- Idempotent: safe to run multiple times.
-- Preserves existing data. Does not modify service_name values.

-- ============================================================
-- Phase 1: Add nullable service_id column + index
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_id bigint;

CREATE INDEX IF NOT EXISTS idx_bookings_service_id
  ON public.bookings (service_id);

-- ============================================================
-- Phase 2: Backfill historical bookings
-- ============================================================

-- Step 1: Match exact service_name = public.services.name
UPDATE public.bookings b
SET service_id = s.id
FROM public.services s
WHERE b.service_name = s.name
  AND b.service_id IS NULL;

-- Step 2: Explicit historical exception
-- service_name 'Barbing' (misspelling) maps to services.id = 81 ('Barbering')
-- Do NOT change service_name — preserve the historical value
UPDATE public.bookings
SET service_id = 81
WHERE service_name = 'Barbing'
  AND service_id IS NULL;

-- ============================================================
-- Phase 3: Add FK constraint (safe: column is nullable, NULL allowed)
-- ============================================================
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS fk_bookings_service_id;

ALTER TABLE public.bookings
  ADD CONSTRAINT fk_bookings_service_id
  FOREIGN KEY (service_id)
  REFERENCES public.services(id)
  ON DELETE RESTRICT;
