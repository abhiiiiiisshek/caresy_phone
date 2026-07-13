-- ============================================================================
-- Caresy — Migration 18: Link the booking lifecycle to trips
-- ----------------------------------------------------------------------------
-- Run AFTER 17_TRIP_ETA.sql. Idempotent — safe to re-run.
--
-- Makes trips appear (and close out) automatically from the booking state
-- machine, so no client has to create them:
--
--   * When a booking with an assigned companion enters ACCEPTED or IN_PROGRESS,
--     ensure a trip exists for it (derives customer/companion/destination from
--     the booking — client ids are never trusted).
--   * When a booking becomes CANCELLED / EXPIRED, cancel any live trip (stops
--     location sharing immediately via the Realtime write policy).
--   * When a booking becomes COMPLETED, complete any live trip.
--
-- Also adds get_active_trip_for_user() so an app can route straight to the
-- caller's current trip instead of needing a trip id typed in.
--
-- The existing UNIQUE(booking_id) on trips keeps creation idempotent, and
-- start_trip_for_booking() (migration 16) remains as an explicit manual path.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Trigger: keep trips in lockstep with the booking lifecycle
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_trip_for_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_dest_lat  NUMERIC;
    v_dest_lng  NUMERIC;
    v_dest_geog extensions.geography(Point, 4326);
BEGIN
    -- Terminal booking states close out any live trip.
    IF NEW.status IN ('CANCELLED', 'EXPIRED') THEN
        UPDATE public.trips
           SET status = 'cancelled', updated_at = NOW()
         WHERE booking_id = NEW.id
           AND status NOT IN ('completed', 'cancelled');
        RETURN NEW;
    END IF;

    IF NEW.status = 'COMPLETED' THEN
        UPDATE public.trips
           SET status = 'completed',
               completed_at = COALESCE(completed_at, NOW()),
               updated_at = NOW()
         WHERE booking_id = NEW.id
           AND status NOT IN ('completed', 'cancelled');
        RETURN NEW;
    END IF;

    -- Active states with a companion assigned: make sure a trip exists.
    IF NEW.companion_user_id IS NOT NULL
       AND NEW.status IN ('ACCEPTED', 'IN_PROGRESS') THEN

        IF NEW.destination_location_id IS NOT NULL THEN
            SELECT latitude, longitude INTO v_dest_lat, v_dest_lng
              FROM public.locations WHERE id = NEW.destination_location_id;
            IF v_dest_lat IS NOT NULL AND v_dest_lng IS NOT NULL THEN
                v_dest_geog := extensions.ST_SetSRID(
                    extensions.ST_MakePoint(v_dest_lng, v_dest_lat), 4326
                )::extensions.geography;
            END IF;
        END IF;

        INSERT INTO public.trips (booking_id, customer_user_id, companion_user_id, destination)
        VALUES (NEW.id, NEW.customer_user_id, NEW.companion_user_id, v_dest_geog)
        ON CONFLICT (booking_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_trip_for_booking ON public.bookings;
CREATE TRIGGER trg_ensure_trip_for_booking
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE public.ensure_trip_for_booking();


-- ----------------------------------------------------------------------------
-- 2. Helper: the caller's current (non-terminal) trip, if any
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER so RLS on trips applies — a caller only ever sees a trip
-- they participate in. Returns the most recent live trip's id, or NULL.
CREATE OR REPLACE FUNCTION public.get_active_trip_for_user()
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT id
      FROM public.trips
     WHERE (customer_user_id = auth.uid() OR companion_user_id = auth.uid())
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC
     LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_trip_for_user() TO authenticated;
