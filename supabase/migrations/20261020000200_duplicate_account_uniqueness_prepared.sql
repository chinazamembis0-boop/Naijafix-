-- PREPARED (NOT APPLIED): duplicate-account prevention uniqueness groundwork.
-- Apply only after reconciliation of existing conflicts (see report).
-- 1) Normalized phone column on profiles.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text;

-- 2) Case-insensitive unique email index (nullable-safe).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

-- 3) Unique normalized phone index (nullable-safe).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_unique
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- 4) Normalization trigger (basic; full E.164 validation should be done in app/edge function).
CREATE OR REPLACE FUNCTION public.normalize_profile_phone()
RETURNS trigger AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone_e164 := regexp_replace(NEW.phone, '[^0-9+]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_profile_phone ON public.profiles;
CREATE TRIGGER trg_normalize_profile_phone
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_phone();
