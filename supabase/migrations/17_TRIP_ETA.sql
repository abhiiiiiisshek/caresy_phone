-- ============================================================================
-- Caresy — Migration 17: Trip destination lookup for ETA
-- ----------------------------------------------------------------------------
-- Run AFTER 16_TRIPS_AND_LIVE_TRACKING.sql. Idempotent — safe to re-run.
--
-- Supports the `trip-eta` Edge Function (supabase/functions/trip-eta), which
-- calls the Google Routes API server-side to estimate arrival time. The origin
-- (companion's current position) is supplied by the customer client from the
-- last Broadcast ping — but the DESTINATION must be authoritative, so this RPC
-- returns it from the server, gated to trip participants only.
--
-- Returns the destination as plain lat/lng, extracted from trips.destination
-- (a geography(Point,4326)); falls back to the booking's destination location
-- coordinates when the trip has no destination geometry set.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_trip_destination(p_trip UUID)
RETURNS TABLE (dest_lat DOUBLE PRECISION, dest_lng DOUBLE PRECISION)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_authorized BOOLEAN;
    v_dest       extensions.geography(Point, 4326);
    v_booking    UUID;
BEGIN
    SELECT
        (t.customer_user_id = auth.uid() OR t.companion_user_id = auth.uid() OR is_admin()),
        t.destination,
        t.booking_id
      INTO v_authorized, v_dest, v_booking
      FROM public.trips t
     WHERE t.id = p_trip;

    IF v_authorized IS NULL THEN
        RAISE EXCEPTION 'trip not found';
    END IF;
    IF NOT v_authorized THEN
        RAISE EXCEPTION 'not authorized to view this trip';
    END IF;

    -- Preferred: the destination point stored on the trip.
    IF v_dest IS NOT NULL THEN
        dest_lat := extensions.ST_Y(v_dest::extensions.geometry);
        dest_lng := extensions.ST_X(v_dest::extensions.geometry);
        RETURN NEXT;
        RETURN;
    END IF;

    -- Fallback: the booking's saved destination location coordinates.
    SELECT l.latitude, l.longitude
      INTO dest_lat, dest_lng
      FROM public.bookings b
      JOIN public.locations l ON l.id = b.destination_location_id
     WHERE b.id = v_booking;

    IF dest_lat IS NOT NULL AND dest_lng IS NOT NULL THEN
        RETURN NEXT;
    END IF;
    -- No destination known: return no rows (caller treats ETA as unavailable).
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_destination(UUID) TO authenticated;
