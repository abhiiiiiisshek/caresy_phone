-- ============================================================================
-- Caresy — Migration 16: Trips + real-time companion location tracking
-- ----------------------------------------------------------------------------
-- Run AFTER 15_ADMIN_USERS_RPC.sql. Idempotent — safe to re-run.
--
-- Implements the live-tracking blueprint (Supplement: Real-Time Companion
-- Location Tracking). A "trip" is the live-journey view of an in-progress
-- booking: a fine-grained state machine (assigned -> en route -> picked up ->
-- ... -> arrived) plus the plumbing to stream the companion's location to the
-- customer in real time.
--
-- Transport model (see blueprint (b)):
--   * Location pings  -> Supabase Realtime BROADCAST on a private channel
--                        'trip:<trip_id>'. Fire-and-forget, ZERO DB writes per
--                        ping. Secured by RLS on realtime.messages (below).
--   * Trip status     -> this durable public.trips table + Postgres Changes,
--                        because status must be auditable and tamper-proof.
--   * Breadcrumb      -> OPTIONAL throttled inserts into public.trip_locations
--                        for post-trip audit only; auto-purged by pg_cron.
--
-- Adds:
--   1. postgis extension (geography columns for destination / breadcrumb).
--   2. trip_status enum + public.trips (one live trip per booking).
--   3. public.trip_locations (optional throttled breadcrumb) + GiST index.
--   4. RLS on both tables (participants read; only the assigned companion
--      writes; admins read).
--   5. Realtime Authorization policies on realtime.messages for the private
--      'trip:<uuid>' broadcast channel.
--   6. advance_trip_status() RPC — server-authoritative, legal-transition-only
--      state machine, callable only by the assigned companion.
--   7. start_trip_for_booking() RPC — the ONLY way to create a trip; derives
--      customer/companion from the booking so client-supplied ids are never
--      trusted.
--   8. pg_cron 'purge-trip-locations' — deletes breadcrumb rows older than 7d.
--
-- IMPORTANT (dashboard step, cannot be done in SQL): in
-- Dashboard -> Realtime -> Settings, disable "Allow public access" so only
-- private channels are permitted and the realtime.messages policies below are
-- actually enforced.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
-- PostGIS powers the geography(Point,4326) columns (nearest-companion, ETA,
-- distance filters). Lives in the `extensions` schema like the other project
-- extensions. If this errors with a permission error, enable it via
-- Dashboard -> Database -> Extensions -> postgis, then re-run this file.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;


-- ----------------------------------------------------------------------------
-- 2. Trip status state machine + trips table
-- ----------------------------------------------------------------------------
-- Finer-grained than booking_status_enum on purpose: the customer's live map
-- stepper needs each leg of the journey, whereas the booking lifecycle only
-- tracks PENDING/ACCEPTED/IN_PROGRESS/COMPLETED. The two run in parallel; the
-- booking stays the source of truth for who is assigned.
DO $$ BEGIN
    CREATE TYPE trip_status AS ENUM (
        'assigned',          -- Companion Assigned
        'en_route_pickup',   -- En Route to Pickup
        'picked_up',         -- Picked Up
        'en_route_hospital', -- En Route to Hospital
        'arrived',           -- Arrived at destination
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.trips (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id        UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    companion_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status            trip_status NOT NULL DEFAULT 'assigned',
    destination       extensions.geography(Point, 4326),   -- hospital / drop-off
    last_lat          DOUBLE PRECISION,
    last_lng          DOUBLE PRECISION,
    last_location_at  TIMESTAMPTZ,
    eta_seconds       INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,
    -- One live trip per booking. Lets start_trip_for_booking() be idempotent
    -- and prevents duplicate channels for the same job.
    CONSTRAINT trips_booking_unique UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_trips_customer  ON public.trips(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_trips_companion ON public.trips(companion_user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status    ON public.trips(status)
    WHERE status NOT IN ('completed', 'cancelled');


-- ----------------------------------------------------------------------------
-- 3. Optional persisted breadcrumb (throttled), audit/safety only
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_locations (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id           UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    companion_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location          extensions.geography(Point, 4326) NOT NULL,
    recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_locations_trip
    ON public.trip_locations(trip_id, recorded_at DESC);
-- Spatial index for proximity queries.
CREATE INDEX IF NOT EXISTS idx_trip_locations_geo
    ON public.trip_locations USING gist (location);


-- ----------------------------------------------------------------------------
-- 4. Row Level Security on the trip tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

-- Customer, the assigned companion, or an admin can read the trip.
DROP POLICY IF EXISTS "Trip participants can read" ON public.trips;
CREATE POLICY "Trip participants can read"
    ON public.trips FOR SELECT TO authenticated
    USING (
        customer_user_id = auth.uid()
        OR companion_user_id = auth.uid()
        OR is_admin()
    );

-- ONLY the assigned companion can update status/location (anti-spoofing). No
-- INSERT policy exists on purpose: trips are created solely through
-- start_trip_for_booking() (a SECURITY DEFINER RPC), so a client can never
-- forge a trip with someone else's ids.
DROP POLICY IF EXISTS "Only assigned companion updates trip" ON public.trips;
CREATE POLICY "Only assigned companion updates trip"
    ON public.trips FOR UPDATE TO authenticated
    USING (companion_user_id = auth.uid())
    WITH CHECK (companion_user_id = auth.uid());

-- Breadcrumb inserts only by the assigned companion, and only on a live trip.
DROP POLICY IF EXISTS "Companion inserts own breadcrumb" ON public.trip_locations;
CREATE POLICY "Companion inserts own breadcrumb"
    ON public.trip_locations FOR INSERT TO authenticated
    WITH CHECK (
        companion_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_id
              AND t.companion_user_id = auth.uid()
              AND t.status NOT IN ('completed', 'cancelled')
        )
    );

-- Participants (and admins) read the breadcrumb trail.
DROP POLICY IF EXISTS "Participants read breadcrumb" ON public.trip_locations;
CREATE POLICY "Participants read breadcrumb"
    ON public.trip_locations FOR SELECT TO authenticated
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_id
              AND (t.customer_user_id = auth.uid() OR t.companion_user_id = auth.uid())
        )
    );

-- Keep updated_at fresh (reuses trigger_set_timestamp() from the base schema).
DROP TRIGGER IF EXISTS set_timestamp_trips ON public.trips;
CREATE TRIGGER set_timestamp_trips
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- ----------------------------------------------------------------------------
-- 5. Realtime Authorization for the private 'trip:<uuid>' broadcast channel
-- ----------------------------------------------------------------------------
-- Enforced by RLS on realtime.messages, evaluated once at channel join. The
-- channel topic is 'trip:<trip_id>'; realtime.topic() returns it inside the
-- policy and split_part(...,':',2) pulls out the trip uuid.
--
-- These policies only take effect once "Allow public access" is DISABLED in
-- Dashboard -> Realtime -> Settings (see header note).

-- READ (subscribe / receive broadcast) — customer, companion, or admin on THIS trip.
DROP POLICY IF EXISTS "Trip participants can receive broadcast" ON realtime.messages;
CREATE POLICY "Trip participants can receive broadcast"
    ON realtime.messages FOR SELECT TO authenticated
    USING (
        realtime.messages.extension = 'broadcast'
        AND EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = (split_part(realtime.topic(), ':', 2))::uuid
              AND (
                    t.customer_user_id = auth.uid()
                 OR t.companion_user_id = auth.uid()
                 OR is_admin()
              )
        )
    );

-- WRITE (send location broadcast) — ONLY the assigned companion, on a live trip.
DROP POLICY IF EXISTS "Only companion can broadcast location" ON realtime.messages;
CREATE POLICY "Only companion can broadcast location"
    ON realtime.messages FOR INSERT TO authenticated
    WITH CHECK (
        realtime.messages.extension = 'broadcast'
        AND EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = (split_part(realtime.topic(), ':', 2))::uuid
              AND t.companion_user_id = auth.uid()
              AND t.status NOT IN ('completed', 'cancelled')
        )
    );


-- ----------------------------------------------------------------------------
-- 6. start_trip_for_booking() — the only way to create a trip
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so it can INSERT past RLS, but it derives customer_user_id
-- and companion_user_id FROM THE BOOKING, never from client input. Only the
-- booking's assigned companion (or an admin) may start its trip. Idempotent:
-- returns the existing trip id if one already exists for the booking.
CREATE OR REPLACE FUNCTION public.start_trip_for_booking(p_booking UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_customer   UUID;
    v_companion  UUID;
    v_dest_id    UUID;
    v_dest_lat   NUMERIC;
    v_dest_lng   NUMERIC;
    v_dest_geog  extensions.geography(Point, 4326);
    v_trip_id    UUID;
BEGIN
    SELECT b.customer_user_id, b.companion_user_id, b.destination_location_id
      INTO v_customer, v_companion, v_dest_id
      FROM public.bookings b
     WHERE b.id = p_booking
       AND b.deleted_at IS NULL;

    IF v_customer IS NULL THEN
        RAISE EXCEPTION 'booking not found';
    END IF;

    IF v_companion IS NULL THEN
        RAISE EXCEPTION 'booking has no assigned companion';
    END IF;

    -- Only the assigned companion or an admin may start the trip.
    IF NOT (v_companion = auth.uid() OR is_admin()) THEN
        RAISE EXCEPTION 'not authorized to start this trip';
    END IF;

    -- Idempotent: hand back the existing trip if already started.
    SELECT id INTO v_trip_id FROM public.trips WHERE booking_id = p_booking;
    IF v_trip_id IS NOT NULL THEN
        RETURN v_trip_id;
    END IF;

    -- Best-effort destination geography from the saved location's lat/lng.
    IF v_dest_id IS NOT NULL THEN
        SELECT latitude, longitude INTO v_dest_lat, v_dest_lng
          FROM public.locations WHERE id = v_dest_id;
        IF v_dest_lat IS NOT NULL AND v_dest_lng IS NOT NULL THEN
            v_dest_geog := extensions.ST_SetSRID(
                extensions.ST_MakePoint(v_dest_lng, v_dest_lat), 4326
            )::extensions.geography;
        END IF;
    END IF;

    INSERT INTO public.trips (booking_id, customer_user_id, companion_user_id, destination)
    VALUES (p_booking, v_customer, v_companion, v_dest_geog)
    RETURNING id INTO v_trip_id;

    RETURN v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_trip_for_booking(UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 7. advance_trip_status() — server-authoritative state machine
-- ----------------------------------------------------------------------------
-- Only the assigned companion may advance, only along a legal path, and never
-- out of a terminal state. Raises on any violation so the client sees an error
-- rather than a silent no-op.
CREATE OR REPLACE FUNCTION public.advance_trip_status(p_trip UUID, p_next trip_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current trip_status;
    v_owner   UUID;
    v_legal   BOOLEAN;
BEGIN
    SELECT status, companion_user_id INTO v_current, v_owner
      FROM public.trips WHERE id = p_trip
      FOR UPDATE;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'trip not found';
    END IF;

    IF v_owner <> auth.uid() THEN
        RAISE EXCEPTION 'not authorized to advance this trip';
    END IF;

    IF v_current IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'trip is already %', v_current;
    END IF;

    -- Legal transitions: forward along the journey, plus cancel from any
    -- non-terminal state.
    v_legal := (
        p_next = 'cancelled'
        OR (v_current = 'assigned'          AND p_next = 'en_route_pickup')
        OR (v_current = 'en_route_pickup'   AND p_next = 'picked_up')
        OR (v_current = 'picked_up'         AND p_next = 'en_route_hospital')
        OR (v_current = 'en_route_hospital' AND p_next = 'arrived')
        OR (v_current = 'arrived'           AND p_next = 'completed')
    );

    IF NOT v_legal THEN
        RAISE EXCEPTION 'illegal transition % -> %', v_current, p_next;
    END IF;

    UPDATE public.trips
       SET status       = p_next,
           updated_at   = NOW(),
           completed_at = CASE WHEN p_next = 'completed' THEN NOW() ELSE completed_at END
     WHERE id = p_trip;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_trip_status(UUID, trip_status) TO authenticated;


-- ----------------------------------------------------------------------------
-- 8. Cleanup — purge old breadcrumb rows (health-adjacent PII, keep minimal)
-- ----------------------------------------------------------------------------
-- Ephemeral Broadcast pings never touch these tables and self-expire in
-- realtime.messages within ~72h, so only the optional breadcrumb needs a purge.
CREATE OR REPLACE FUNCTION public.purge_trip_locations()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INT;
BEGIN
    DELETE FROM public.trip_locations
     WHERE recorded_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

-- Re-scheduling with the same job name errors in pg_cron, so unschedule first
-- to keep this file idempotent (matches migration 14's pattern).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-trip-locations') THEN
        PERFORM cron.unschedule('purge-trip-locations');
    END IF;
END $$;

SELECT cron.schedule(
    'purge-trip-locations',
    '0 3 * * *',                       -- daily at 03:00 UTC
    $$ SELECT public.purge_trip_locations(); $$
);

-- Verify:
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'purge-trip-locations';
