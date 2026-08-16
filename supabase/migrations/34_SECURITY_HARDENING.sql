-- ============================================================================
-- Caresy — Migration 34: Security hardening
-- ----------------------------------------------------------------------------
-- Run AFTER 33_PHONE_SIGNIN.sql. Idempotent — safe to re-run.
--
-- Two gaps found in audit:
--   1. is_admin() and guard_companion_privileged_fields() are SECURITY DEFINER
--      without a pinned search_path. Every other privileged function in this
--      schema sets SET search_path = public specifically to stop a caller-set
--      search_path from shadowing a table/function the DEFINER body references
--      unqualified. is_admin() does exactly that (`admin_users`, unqualified)
--      and gates nearly every RLS policy in the schema — it's the one function
--      this matters most for.
--   2. trips has row-level RLS ("the assigned companion updates trip") but no
--      column guard. bookings got the DEFINER-function-plus-trigger treatment
--      after a real incident (a customer's own session could PATCH status to
--      COMPLETED — see 31_CUSTOMER_ACTIONS). trips never did: a companion's own
--      session can set status/eta_seconds/completed_at directly, bypassing
--      advance_trip_status()'s legal-transition checks entirely.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Pin search_path on is_admin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      lower(u.email) IN (SELECT email FROM admin_users)
      OR u.email LIKE '%@caresy.co',
      FALSE
    )
    FROM auth.users u
    WHERE u.id = auth.uid()
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Pin search_path on guard_companion_privileged_fields()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_companion_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF is_admin() THEN
        RETURN NEW;   -- admins may set anything
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.approval_status  := 'PENDING_REVIEW';
        NEW.rejection_reason := NULL;
        NEW.reviewed_by      := NULL;
        NEW.reviewed_at      := NULL;
        NEW.rating           := NULL;
        NEW.total_jobs       := 0;
        NEW.can_drive        := FALSE;
        NEW.drive_verified_by := NULL;
        NEW.drive_verified_at := NULL;
        RETURN NEW;
    END IF;

    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
       AND NOT (OLD.approval_status = 'REJECTED' AND NEW.approval_status = 'PENDING_REVIEW')
    THEN
        RAISE EXCEPTION 'Only an admin can change a companion''s approval status';
    END IF;

    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.rating      IS DISTINCT FROM OLD.rating
       OR NEW.total_jobs  IS DISTINCT FROM OLD.total_jobs
    THEN
        RAISE EXCEPTION 'Only an admin can change review or reputation fields';
    END IF;

    IF NEW.can_drive         IS DISTINCT FROM OLD.can_drive
       OR NEW.drive_verified_by IS DISTINCT FROM OLD.drive_verified_by
       OR NEW.drive_verified_at IS DISTINCT FROM OLD.drive_verified_at
    THEN
        RAISE EXCEPTION 'Only an admin can verify a driving licence';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. trips column guard — mirrors guard_customer_booking_columns (31)
-- ----------------------------------------------------------------------------
-- The companion's own client still writes last_lat/last_lng/last_location_at
-- directly (LocationShare.tsx, throttled every ~12s) — that raw-update path is
-- intentional and stays open. status/eta_seconds/completed_at, and who the
-- trip belongs to, only change through advance_trip_status() / start_trip_for_
-- booking(), which is where the legal-transition checks actually live.
CREATE OR REPLACE FUNCTION public.guard_trip_status_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF current_setting('caresy.trip_advance', true) = 'on'
       OR is_admin()
       OR auth.uid() IS NULL   -- service role / cron, already trusted
    THEN
        RETURN NEW;
    END IF;

    IF NEW.status            IS DISTINCT FROM OLD.status
       OR NEW.eta_seconds       IS DISTINCT FROM OLD.eta_seconds
       OR NEW.completed_at      IS DISTINCT FROM OLD.completed_at
       OR NEW.destination       IS DISTINCT FROM OLD.destination
       OR NEW.booking_id        IS DISTINCT FROM OLD.booking_id
       OR NEW.customer_user_id  IS DISTINCT FROM OLD.customer_user_id
       OR NEW.companion_user_id IS DISTINCT FROM OLD.companion_user_id
    THEN
        RAISE EXCEPTION 'Use advance_trip_status() to change trip status';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_trip_status ON public.trips;
CREATE TRIGGER trg_guard_trip_status
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION guard_trip_status_columns();

-- advance_trip_status() is the one place allowed to move status/completed_at;
-- flag the transaction so the trigger above lets its own UPDATE through.
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

    PERFORM set_config('caresy.trip_advance', 'on', true);  -- true = transaction-local
    UPDATE public.trips
       SET status       = p_next,
           updated_at   = NOW(),
           completed_at = CASE WHEN p_next = 'completed' THEN NOW() ELSE completed_at END
     WHERE id = p_trip;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_trip_status(UUID, trip_status) TO authenticated;

-- ---------------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ASSERT (SELECT prosecdef FROM pg_proc WHERE proname = 'is_admin' LIMIT 1),
        'is_admin must stay SECURITY DEFINER';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc p
        WHERE p.proname = 'is_admin'
          AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
    ), 'is_admin must have a pinned search_path';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc p
        WHERE p.proname = 'guard_companion_privileged_fields'
          AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
    ), 'guard_companion_privileged_fields must have a pinned search_path';
    ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guard_trip_status'),
        'the trip status guard trigger must exist';
END $$;
