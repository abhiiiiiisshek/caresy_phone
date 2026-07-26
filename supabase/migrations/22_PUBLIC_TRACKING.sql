-- Caresy: share-a-link live tracking, no account required
--
-- Family members receive a tracking link over WhatsApp. Forcing them to sign up
-- (and to *be* the booking owner) made the share button useless. This adds an
-- unguessable per-booking token and one narrow SECURITY DEFINER reader.
--
-- Why a separate token instead of reference_code: the code is 6 chars from a
-- 32-char alphabet (~1e9) and is spoken aloud on support calls and pasted into
-- chats. It identifies a booking; it must not also authorise reading its live
-- location. share_token is 122 random bits and only ever appears in the URL.
--
-- Why an RPC instead of an anon RLS policy on bookings: RLS is row-level, so a
-- token-holder would get every column — service_metadata carries customerEmail,
-- customerPhone, doctor and careNeeds. The function returns the tracking fields
-- only, and bookings keeps its owner-only policies untouched.
--
-- Idempotent: safe to re-run.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS share_token TEXT;

UPDATE bookings SET share_token = gen_random_uuid()::text WHERE share_token IS NULL;

ALTER TABLE bookings ALTER COLUMN share_token SET DEFAULT gen_random_uuid()::text;
ALTER TABLE bookings ALTER COLUMN share_token SET NOT NULL;

-- UNIQUE also gives the lookup index the function needs.
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_share_token_unique UNIQUE (share_token);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reader for the tracking page. Anyone holding the link sees this booking's
-- status and the companion's last position — nothing else, and nothing about
-- any other booking.
--
-- public.trips (migration 16) may not be applied yet; it needs PostGIS and is a
-- separate decision. Without it the status timeline still works and the position
-- columns come back NULL, which the page already renders as "no GPS ping yet".
-- ponytail: re-run this file after applying 16 to pick the live position up.
DO $$
DECLARE
  trip_cols TEXT := 'NULL::DOUBLE PRECISION, NULL::DOUBLE PRECISION, NULL::TIMESTAMPTZ';
  trip_join TEXT := '';
BEGIN
  IF to_regclass('public.trips') IS NOT NULL THEN
    trip_cols := 't.last_lat, t.last_lng, t.last_location_at';
    -- trips has UNIQUE (booking_id), so this stays one row.
    trip_join := 'LEFT JOIN trips t ON t.booking_id = b.id'
              || ' AND t.status NOT IN (''completed'', ''cancelled'')';
  END IF;

  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.get_shared_tracking(p_token TEXT)
    RETURNS TABLE (
      reference_code       TEXT,
      status               TEXT,
      scheduled_start_time TIMESTAMPTZ,
      created_at           TIMESTAMPTZ,
      pickup_title         TEXT,
      companion            JSONB,
      last_lat             DOUBLE PRECISION,
      last_lng             DOUBLE PRECISION,
      last_location_at     TIMESTAMPTZ
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $body$
      SELECT
        b.reference_code,
        b.status::TEXT,
        b.scheduled_start_time,
        b.created_at,
        l.title,
        -- Only the companion object. The rest of service_metadata is customer PII.
        b.service_metadata -> 'companion',
        %s
      FROM bookings b
      LEFT JOIN locations l ON l.id = b.pickup_location_id
      %s
      -- Length guard so a NULL or empty token can never fall through to a match.
      WHERE length(coalesce(p_token, '')) >= 32
        AND b.share_token = p_token
        AND b.deleted_at IS NULL
      LIMIT 1;
    $body$;
  $f$, trip_cols, trip_join);
END $$;

REVOKE ALL ON FUNCTION public.get_shared_tracking(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_tracking(TEXT) TO anon, authenticated;
