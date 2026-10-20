-- PREPARED (NOT APPLIED): duplicate-account prevention uniqueness groundwork.
-- Apply only after reconciliation of existing conflicts (see report).
-- Normalization uses a simple E.164-ish canonical form (digits only with leading +).
-- Full country-code validation should be done in app/edge function before storage.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_unique
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_profile_phone()
RETURNS trigger AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    NEW.phone_e164 := '+' || regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  ELSE
    NEW.phone_e164 := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_profile_phone ON public.profiles;
CREATE TRIGGER trg_normalize_profile_phone
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_phone();
