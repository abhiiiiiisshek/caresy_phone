-- ============================================================================
-- 41_ADMIN_COMBINED_SAVE.sql — One transaction for status + companion edits
-- ---------------------------------------------------------------------------
-- The admin dispatch board lets an operator change a booking's milestone
-- status and reassign its companion in one card save. Those were two
-- separate supabase.rpc() round-trips (admin_override_booking_status +
-- reassign_booking). If the first succeeds and the second fails, the booking
-- is left half-saved — status moved, companion not — with no clear outcome
-- for the operator. The DB correctly rejects the bad half, but the UX is
-- broken.
--
-- This wraps both in one SECURITY DEFINER RPC so either both apply or
-- neither does. It delegates to the existing RPCs rather than reimplementing
-- them, so state-machine validation, reason audit, IN_PROGRESS clock reset
-- and dual notifications keep working exactly as before. A Postgres function
-- body is already one transaction.
--
-- Handles three real cases: status only, companion only, both. Guarded by
-- the same is_admin() check the other admin RPCs use.
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_save_booking_edit(
    p_booking uuid,
    p_status text,
    p_new_companion uuid,
    p_reason text
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_current_status text;
    v_current_companion uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admin may save booking edits';
    END IF;

    SELECT status::text, companion_user_id
      INTO v_current_status, v_current_companion
      FROM bookings WHERE id = p_booking AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- Status change requested and different from current.
    IF p_status IS NOT NULL AND p_status <> '' AND p_status IS DISTINCT FROM v_current_status THEN
        PERFORM public.admin_override_booking_status(
            p_booking,
            p_status::booking_status_enum,
            p_reason
        );
    END IF;

    IF p_new_companion IS DISTINCT FROM v_current_companion THEN
        PERFORM public.reassign_booking(p_booking, p_new_companion, p_reason);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_booking_edit(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_booking_edit(UUID, TEXT, UUID, TEXT) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'admin_save_booking_edit' AND pronargs = 4
    ), 'admin_save_booking_edit must exist';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'admin_override_booking_status' AND pronargs = 3
    ), 'dependency admin_override_booking_status must exist';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'reassign_booking' AND pronargs = 3
    ), 'dependency reassign_booking must exist';
END $check$;
