-- ============================================================================
-- 38_BOOKING_STATE_MACHINE.sql — DB-level booking state machine
-- ---------------------------------------------------------------------------
-- The booking lifecycle (DRAFT/PENDING/ASSIGNED/ACCEPTED/IN_PROGRESS/
-- COMPLETED/CANCELLED/EXPIRED) had no DB-level enforcement. Two legitimate
-- write paths could set any status to any other:
--   1. Admin ops board plain UPDATE (apps/admin/src/app/ops/page.tsx:182-186)
--      — RLS "Users and admins can update bookings" has USING but no WITH CHECK.
--   2. Companion's own UPDATE on assigned job ("Assigned companion updates own
--      job" 13_LIFECYCLE.sql:160-164) has no status predicate.
-- Either path could reach COMPLETED without complete_booking() (leaving
-- payment_status=UNBILLED forever, billed_minutes/final_amount_paise NULL),
-- jump PENDING->COMPLETED, or un-cancel/un-expire.
--
-- This migration codifies current intent (derived from existing RPCs) as a
-- BEFORE UPDATE trigger, plus an audited admin escape hatch RPC.
-- Companion reassignment (companion_user_id column swap) gets its own RPC
-- in 39_BOOKING_REASSIGNMENT.sql — do not conflate.
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_booking_transition(
    p_old booking_status_enum, p_new booking_status_enum
) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_old = p_new OR (p_old, p_new) IN (
        ('DRAFT','PENDING'), ('DRAFT','CANCELLED'),
        ('PENDING','ACCEPTED'), ('PENDING','ASSIGNED'), ('PENDING','CANCELLED'), ('PENDING','EXPIRED'),
        ('ASSIGNED','ACCEPTED'), ('ASSIGNED','CANCELLED'),
        ('ACCEPTED','IN_PROGRESS'), ('ACCEPTED','CANCELLED'),
        ('IN_PROGRESS','COMPLETED')
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_booking_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF current_setting('caresy.admin_override', true) = 'on' THEN
            RETURN NEW;  -- reason is required by admin_override_booking_status(), enforced there
        END IF;

        IF NOT is_valid_booking_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION 'Illegal booking status transition: % -> %', OLD.status, NEW.status;
        END IF;

        -- COMPLETED must only be reached through complete_booking(), which computes
        -- the bill. Closes the "COMPLETED with UNBILLED forever" gap.
        IF NEW.status = 'COMPLETED' AND current_setting('caresy.billing', true) IS DISTINCT FROM 'on' THEN
            RAISE EXCEPTION 'Use complete_booking() to complete a visit';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_transition ON bookings;
CREATE TRIGGER trg_enforce_booking_transition
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION enforce_booking_transition();

CREATE OR REPLACE FUNCTION public.admin_override_booking_status(
    p_booking UUID, p_status booking_status_enum, p_reason TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Admin only';
    END IF;
    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A reason is required for a manual status override';
    END IF;

    PERFORM set_config('caresy.admin_override', 'on', true);
    IF p_status = 'COMPLETED' THEN
        PERFORM set_config('caresy.billing', 'on', true);  -- admin override may also reach COMPLETED
    END IF;

    UPDATE bookings SET
        status = p_status,
        service_metadata = COALESCE(service_metadata, '{}'::jsonb)
            || jsonb_build_object('adminOverrideAt', NOW(), 'adminOverrideBy', auth.uid(), 'adminOverrideReason', p_reason)
    WHERE id = p_booking AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_booking_status(UUID, booking_status_enum, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_override_booking_status(UUID, booking_status_enum, TEXT) TO authenticated;

DO $check$
BEGIN
    ASSERT is_valid_booking_transition('PENDING','ACCEPTED'), 'PENDING->ACCEPTED must stay legal';
    ASSERT is_valid_booking_transition('IN_PROGRESS','COMPLETED'), 'IN_PROGRESS->COMPLETED must stay legal';
    ASSERT NOT is_valid_booking_transition('PENDING','COMPLETED'), 'PENDING->COMPLETED must be rejected';
    ASSERT NOT is_valid_booking_transition('COMPLETED','PENDING'), 'terminal states must not be reversible';
    ASSERT NOT is_valid_booking_transition('CANCELLED','ACCEPTED'), 'CANCELLED must be terminal';
    ASSERT is_valid_booking_transition('ACCEPTED','ACCEPTED'), 'same-status no-op writes must stay legal';
END $check$;
