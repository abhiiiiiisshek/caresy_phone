-- ============================================================================
-- 39_BOOKING_REASSIGNMENT.sql — Reassignment as first-class RPC
-- ---------------------------------------------------------------------------
-- Today, reassigning a companion is a bare companion_user_id column swap with
-- two consequences nothing handles: (a) old companion is never notified they
-- lost the job, and (b) if booking is already IN_PROGRESS, new companion
-- inherits old companion's actual_start_time, so complete_booking() later
-- bills/credits them for time they didn't work.
--
-- This RPC makes reassignment explicit: resets actual_start_time when
-- IN_PROGRESS (new companion's clock starts now, not split-bill), writes
-- service_metadata reassignment stamp, and enqueues notifications for both
-- old and new companions. Idempotent when p_new_companion equals current.
-- Status guard: only PENDING/ASSIGNED/ACCEPTED/IN_PROGRESS may be reassigned.
--
-- Uses caresy.admin_override session var to pass enforce_booking_transition
-- without bypassing its COMPLETED/billing checks (reassignment never sets
-- status to COMPLETED, so billing var not needed).
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reassign_booking(
    p_booking UUID, p_new_companion UUID, p_reason TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admin may reassign a booking';
    END IF;

    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.status NOT IN ('PENDING','ASSIGNED','ACCEPTED','IN_PROGRESS') THEN
        RAISE EXCEPTION 'Cannot reassign a % booking', v_booking.status;
    END IF;

    IF v_booking.companion_user_id IS NOT DISTINCT FROM p_new_companion THEN
        RETURN;  -- idempotent no-op
    END IF;

    PERFORM set_config('caresy.admin_override', 'on', true);
    UPDATE bookings SET
        companion_user_id = p_new_companion,
        -- The new companion's clock starts now — do not bill/credit them for the
        -- outgoing companion's time. Product decision: reset, not split-bill.
        actual_start_time = CASE WHEN v_booking.status = 'IN_PROGRESS' THEN NOW() ELSE actual_start_time END,
        service_metadata = COALESCE(service_metadata, '{}'::jsonb) || jsonb_build_object(
            'reassignedAt', NOW(), 'reassignedFrom', v_booking.companion_user_id, 'reassignReason', p_reason
        )
    WHERE id = p_booking;

    IF v_booking.companion_user_id IS NOT NULL THEN
        INSERT INTO notifications (booking_id, recipient_role, recipient_user_id, event, title, body)
        VALUES (p_booking, 'COMPANION', v_booking.companion_user_id, 'BOOKING_REASSIGNED',
                'Visit reassigned',
                'This visit has been reassigned to another companion.' ||
                CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END);
    END IF;

    IF p_new_companion IS NOT NULL THEN
        INSERT INTO notifications (booking_id, recipient_role, recipient_user_id, event, title, body)
        VALUES (p_booking, 'COMPANION', p_new_companion, 'BOOKING_ASSIGNED_TO_YOU',
                'New visit assigned', 'A visit has been assigned to you.');
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_booking(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_booking(UUID, UUID, TEXT) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'reassign_booking' AND pronargs = 3
    ), 'reassign_booking must exist';
END $check$;
