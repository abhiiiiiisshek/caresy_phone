-- ============================================================================
-- 37_STAMP_COMPANION_PREFLIGHT.sql — Fix broken companion Accept (CARESY-7)
-- ---------------------------------------------------------------------------
-- CARESY-7 (620e937) added apps/companion/src/app/page.tsx:698-708 `accept()`
-- which calls supabase.rpc('stamp_companion_on_booking', {p_booking, p_companion})
-- unconditionally. The ONLY function by that name is
-- public.stamp_companion_on_booking() in 30_LAUNCH_FIXES.sql:67 — zero args,
-- RETURNS TRIGGER, only usable as a trigger. PostgREST cannot expose a
-- trigger function as an RPC, so EVERY Accept fails with "could not find
-- function in schema cache" before the status UPDATE even runs — blocks all
-- job acceptance.
--
-- Fix: add a second overload (UUID, UUID) -> VOID as a real RPC pre-flight
-- check. Postgres resolves overloads by arg count/types, so both coexist.
-- This overload verifies the driving-licence gate (transport_mode =
-- CUSTOMER_VEHICLE requires companion_may_drive) so the UI gets a friendly
-- "cannot drive" message instead of the raw guard_drive_assignment() trigger
-- exception. No app-code change needed — page.tsx:702 now resolves.
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

-- A second overload, distinct from the zero-arg trigger function of the same
-- name in 30_LAUNCH_FIXES.sql (Postgres resolves by argument count/types, so
-- both coexist safely). This one is a real RPC: a pre-flight check the
-- companion portal calls before attempting to accept a job, so a driving-
-- licence rejection surfaces as a friendly message instead of the raw
-- guard_drive_assignment() trigger exception.
CREATE OR REPLACE FUNCTION public.stamp_companion_on_booking(p_booking UUID, p_companion UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
    IF p_companion IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the companion themselves may run this check';
    END IF;

    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.transport_mode = 'CUSTOMER_VEHICLE' AND NOT companion_may_drive(p_companion) THEN
        RAISE EXCEPTION 'cannot drive: licence not verified';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_companion_on_booking(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stamp_companion_on_booking(UUID, UUID) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'stamp_companion_on_booking' AND pronargs = 2
    ), 'stamp_companion_on_booking(uuid,uuid) preflight overload must exist';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'stamp_companion_on_booking' AND pronargs = 0
    ), 'the original zero-arg trigger function must still exist — this migration adds an overload, it does not replace it';
END $check$;
