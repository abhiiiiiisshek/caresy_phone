-- ============================================================================
-- 48_TRIP_ETA_TARGET.sql — the ETA a family is actually waiting on
-- ----------------------------------------------------------------------------
-- get_trip_destination (17_TRIP_ETA) answers "how long until the companion
-- reaches the hospital". It has never returned a row: it reads
-- bookings.destination_location_id, and no surface has ever written that column
-- — not either website booking flow, not the mobile one, not the admin board.
-- trips.destination is therefore always NULL and trip-eta has correctly reported
-- eta_seconds: null since the day it was deployed.
--
-- That is a data-modelling gap and this migration does not close it. A hospital
-- companion booking keeps the hospital name and the meeting point in ONE
-- locations row (title vs address_line_1), so there is no second row to point a
-- destination at, and lib/hospitals.ts is a hand-kept name+area list with no
-- coordinates to build one from.
--
-- But the ETA that matters before pickup was never the hospital. A family
-- watching the map wants "how far away is my companion, from ME", and that
-- target does exist: the pickup coordinates, which the booking forms now write
-- on every booking. After pickup the companion is with the patient and an ETA
-- stops being the question.
--
-- So: one RPC that returns the right target for the trip's current stage, and
-- says which one it picked. The hospital branch is kept and will start
-- returning rows for free on the day something writes a destination.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_trip_eta_target(p_trip UUID)
RETURNS TABLE (
    target   TEXT,                -- 'pickup' | 'destination'
    dest_lat DOUBLE PRECISION,
    dest_lng DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_authorized BOOLEAN;
    v_status     trip_status;
    v_dest       extensions.geography(Point, 4326);
    v_booking    UUID;
BEGIN
    -- Same participant gate as get_trip_destination: a trip's geography is only
    -- ever revealed to its customer, its companion, or an admin.
    SELECT
        (t.customer_user_id = auth.uid() OR t.companion_user_id = auth.uid() OR is_admin()),
        t.status,
        t.destination,
        t.booking_id
      INTO v_authorized, v_status, v_dest, v_booking
      FROM public.trips t
     WHERE t.id = p_trip;

    IF v_authorized IS NULL THEN
        RAISE EXCEPTION 'trip not found';
    END IF;
    IF NOT v_authorized THEN
        RAISE EXCEPTION 'not authorized to view this trip';
    END IF;

    -- Before the patient is picked up, the companion is travelling to the
    -- customer, so the customer's own meeting point is the target.
    IF v_status IN ('assigned', 'en_route_pickup') THEN
        target := 'pickup';
        SELECT l.latitude, l.longitude
          INTO dest_lat, dest_lng
          FROM public.bookings b
          JOIN public.locations l ON l.id = b.pickup_location_id
         WHERE b.id = v_booking;

        IF dest_lat IS NOT NULL AND dest_lng IS NOT NULL THEN
            RETURN NEXT;
        END IF;
        -- The customer never shared a pin. No ETA, and no guess from a pincode.
        RETURN;
    END IF;

    -- After pickup the question becomes the hospital. Returns nothing until
    -- something writes a destination; see the header.
    target := 'destination';

    IF v_dest IS NOT NULL THEN
        dest_lat := extensions.ST_Y(v_dest::extensions.geometry);
        dest_lng := extensions.ST_X(v_dest::extensions.geometry);
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT l.latitude, l.longitude
      INTO dest_lat, dest_lng
      FROM public.bookings b
      JOIN public.locations l ON l.id = b.destination_location_id
     WHERE b.id = v_booking;

    IF dest_lat IS NOT NULL AND dest_lng IS NOT NULL THEN
        RETURN NEXT;
    END IF;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.get_trip_eta_target(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trip_eta_target(UUID) TO authenticated;
