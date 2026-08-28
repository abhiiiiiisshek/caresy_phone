-- ============================================================================
-- 42_ADMIN_SAVE_INTENT.sql — Fix admin_save_booking_edit NULL-meaning bug
-- ---------------------------------------------------------------------------
-- Migration 41's wrapper inferred intent by comparing client-supplied
-- "current" values against the database:
--   IF p_new_companion IS DISTINCT FROM v_current_companion THEN reassign
-- But the client sends p_new_companion = edit.companionId || null on EVERY
-- save. An empty string (PENDING at load time) becomes NULL, which IS
-- distinct from a real companion that self-accepted after load, so a
-- status-only save silently unassigns the companion and notifies them
-- "reassigned to another companion" when they now have nobody.
--
-- NULL meant "unchanged" to the old client and "remove them" to
-- reassign_booking — the bug lives in the seam.
--
-- Fix forward (do not edit 41 — applied to production):
--   - DROP the 4-arg overload — CREATE OR REPLACE with a new signature would
--     leave both overloads live and the old broken one still callable.
--   - Take explicit intent flags. Act only when the flag is true; NULL then
--     means "unassign" only when the operator actually asked.
--   - Take FOR UPDATE before reading, closing the race reopened in 41
--     (migration 40 closed this class).
--   - Keep delegating to the existing RPCs — do not reimplement their logic.
--
-- Human must apply: psql / Supabase SQL editor -> run this file.
-- Do NOT apply via automation — hand to account holder.
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_save_booking_edit(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.admin_save_booking_edit(
    p_booking uuid,
    p_status text,
    p_new_companion uuid,
    p_reason text,
    p_change_status boolean,
    p_change_companion boolean
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admin may save booking edits';
    END IF;

    -- Lock the row before deciding intent — closes the race that 40 fixed
    -- and 41 reopened one level up.
    PERFORM 1 FROM bookings WHERE id = p_booking AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF p_change_status THEN
        PERFORM public.admin_override_booking_status(
            p_booking,
            p_status::booking_status_enum,
            p_reason
        );
    END IF;

    IF p_change_companion THEN
        PERFORM public.reassign_booking(p_booking, p_new_companion, p_reason);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_booking_edit(UUID, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_booking_edit(UUID, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'admin_save_booking_edit' AND pronargs = 6
    ), 'admin_save_booking_edit (6-arg) must exist';
    ASSERT NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'admin_save_booking_edit' AND pronargs = 4
    ), 'old 4-arg admin_save_booking_edit must be dropped';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'admin_override_booking_status' AND pronargs = 3
    ), 'dependency admin_override_booking_status must exist';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'reassign_booking' AND pronargs = 3
    ), 'dependency reassign_booking must exist';
END $check$;
