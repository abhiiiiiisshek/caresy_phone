-- ============================================================================
-- 47_TRACKING_TRIP_STATE.sql — give the tracking page the trip, not just a dot
-- ----------------------------------------------------------------------------
-- get_shared_tracking (22_PUBLIC_TRACKING) returns the companion's last known
-- position but says nothing about the trip it belongs to. Two consequences:
--
--   1. No trip id, so a signed-in customer cannot join the private Broadcast
--      channel that carries live pings. The topic is 'trip:<trip_id>' and the
--      RLS on realtime.messages (16_TRIPS_AND_LIVE_TRACKING) resolves it by
--      casting that segment to a trips.id. Both clients were guessing with the
--      share token, which is a different uuid — every subscribe and every send
--      on that topic was denied, silently, and the 10s poll was quietly doing
--      all of the work.
--   2. No trip status, so the stepper had to infer the journey from the booking
--      row: one coarse IN_PROGRESS covering pickup, travel and arrival, plus a
--      "we have coordinates, so they must have left" guess. advance_trip_status
--      already records the real thing.
--
-- This adds trip_id and trip_status to the reader. Nothing else about it moves:
-- the same narrow column list, the same length guard on the token, the same
-- refusal to touch service_metadata beyond the companion object.
--
-- Handing trip_id to a link-holder is safe. It is not a capability — the
-- Broadcast policies are TO authenticated and still require the caller to be
-- the trip's customer, companion, or an admin, so an anonymous viewer holding
-- the id gets exactly what they had before: the poll.
--
-- RETURNS TABLE changes shape, so this drops and recreates rather than
-- CREATE OR REPLACE. Idempotent: safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_shared_tracking(TEXT);

-- public.trips needs PostGIS and was a separate decision (see 22's header). It
-- is applied, but keep the same conditional shape so this file stays runnable
-- against a database where it is not.
DO $$
DECLARE
  trip_cols TEXT := 'NULL::UUID, NULL::TEXT, NULL::DOUBLE PRECISION, NULL::DOUBLE PRECISION, NULL::TIMESTAMPTZ';
  trip_join TEXT := '';
BEGIN
  IF to_regclass('public.trips') IS NOT NULL THEN
    trip_cols := 't.id, t.status::TEXT, t.last_lat, t.last_lng, t.last_location_at';
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
      trip_id              UUID,
      trip_status          TEXT,
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
