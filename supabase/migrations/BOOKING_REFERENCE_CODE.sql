-- Caresy: Real, unique booking reference codes
--
-- Replaces the old client-side "CRS-" + first 8 chars of the UUID display
-- (which could theoretically collide at scale) with a proper database-generated,
-- uniqueness-enforced reference code stored directly on the row.
-- Idempotent: safe to re-run.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reference_code TEXT;

-- Generates a short human-friendly code, e.g. CRS-7K3PQR.
-- Excludes ambiguous characters (0/O, 1/I) and retries on collision.
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
BEGIN
  LOOP
    code := 'CRS-';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE reference_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL THEN
    NEW.reference_code := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_reference_trigger ON bookings;
CREATE TRIGGER set_booking_reference_trigger
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE PROCEDURE set_booking_reference();

-- Backfill any existing rows created before this migration.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM bookings WHERE reference_code IS NULL LOOP
    UPDATE bookings SET reference_code = generate_booking_reference() WHERE id = r.id;
  END LOOP;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_reference_code_unique UNIQUE (reference_code);
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE bookings ALTER COLUMN reference_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_reference_code ON bookings(reference_code);
