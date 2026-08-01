-- ============================================================================
-- 31. The customer's own two verbs: cancel and reschedule
-- ============================================================================
-- Until now `my-bookings` had a Reschedule button and a Cancel button that both
-- closed the sheet and told the customer to message support. Every plan change
-- for every visit arrived as a WhatsApp message a human had to act on.
--
-- Two SECURITY DEFINER RPCs, plus the guard that makes them the *only* way a
-- customer changes a visit — `Users and admins can update bookings` has a USING
-- clause and no WITH CHECK, so today a customer's own browser can PATCH their
-- booking to COMPLETED, or unassign the companion. Money columns were already
-- locked (26_BILLING); the schedule and the status were not.

-- ---------------------------------------------------------------------------
-- 1. cancel_booking — before anyone has set out
-- ---------------------------------------------------------------------------
-- Allowed up to and including ASSIGNED/ACCEPTED. Once the companion has tapped
-- Start there is real time on the clock and a bill to settle, so that one goes
-- through support on purpose.
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v bookings%ROWTYPE;
    v_reason TEXT := COALESCE(NULLIF(TRIM(p_reason), ''), 'No reason given');
BEGIN
    SELECT * INTO v FROM bookings WHERE id = p_booking AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v.customer_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the customer who booked this visit may cancel it';
    END IF;

    IF v.status = 'CANCELLED' THEN
        RETURN;   -- idempotent: a double tap on a flaky connection is not an error
    END IF;

    IF v.status NOT IN ('DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED') THEN
        RAISE EXCEPTION 'This visit has already started. Please contact support to cancel.';
    END IF;

    PERFORM set_config('caresy.customer_action', 'on', true);  -- true = transaction-local
    UPDATE bookings
       SET status = 'CANCELLED',
           service_metadata = COALESCE(service_metadata, '{}'::JSONB) || JSONB_BUILD_OBJECT(
               'cancelledAt',  NOW(),
               'cancelledBy',  CASE WHEN v.customer_user_id = auth.uid() THEN 'CUSTOMER' ELSE 'ADMIN' END,
               'cancelReason', v_reason)
     WHERE id = p_booking;

    -- The status trigger already tells the customer. The companion who blocked
    -- out their afternoon for this is the one who must not find out by turning
    -- up at the hospital.
    IF v.companion_user_id IS NOT NULL THEN
        INSERT INTO notifications (booking_id, recipient_role, recipient_user_id, event, title, body)
        VALUES (p_booking, 'COMPANION', v.companion_user_id, 'BOOKING_CANCELLED',
                'Cancelled: ' || COALESCE(v.reference_code, 'visit'),
                'The customer cancelled this visit. Reason: ' || v_reason);
    END IF;

    -- Ops keeps a companion free and a slot open by hearing about it too.
    INSERT INTO notifications (booking_id, recipient_role, event, title, body)
    VALUES (p_booking, 'ADMIN', 'BOOKING_CANCELLED',
            'Cancelled ' || COALESCE(v.reference_code, ''),
            'Customer cancelled. Reason: ' || v_reason);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. reschedule_booking — same visit, different hour
-- ---------------------------------------------------------------------------
-- The lead window mirrors MIN_LEAD_MINUTES in packages/utils/src/slots.ts: ops
-- has to find a companion, brief them, and get them to a hospital. The client
-- filters the slot list by the same rule; this is what makes it true.
--
-- expires_at is recomputed here because the trigger that sets it only fires on
-- INSERT — a rescheduled booking would otherwise keep the old visit's deadline
-- and be swept to EXPIRED days before the new one.
CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking UUID, p_start TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v    bookings%ROWTYPE;
    lead INT := get_setting_int('min_lead_minutes', 60);
    mins INT := get_setting_int('instant_expiry_minutes', 30);
    hrs  INT := get_setting_int('scheduled_flag_hours', 2);
BEGIN
    SELECT * INTO v FROM bookings WHERE id = p_booking AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v.customer_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the customer who booked this visit may reschedule it';
    END IF;

    IF v.status NOT IN ('PENDING', 'ACCEPTED', 'ASSIGNED') THEN
        RAISE EXCEPTION 'Only an upcoming visit can be moved. Please contact support.';
    END IF;

    IF p_start IS NULL OR p_start < NOW() + (lead || ' minutes')::INTERVAL THEN
        RAISE EXCEPTION 'Pick a time at least % minutes from now', lead;
    END IF;

    IF p_start > NOW() + INTERVAL '90 days' THEN
        RAISE EXCEPTION 'Pick a time within the next 90 days';
    END IF;

    PERFORM set_config('caresy.customer_action', 'on', true);
    UPDATE bookings
       SET scheduled_start_time = p_start,
           -- An INSTANT request moved to a future hour is a scheduled visit; the
           -- expiry rules for the two differ and would otherwise disagree.
           booking_type = 'SCHEDULED',
           expires_at = GREATEST(p_start - (hrs || ' hours')::INTERVAL,
                                 NOW() + (mins || ' minutes')::INTERVAL),
           service_metadata = COALESCE(service_metadata, '{}'::JSONB) || JSONB_BUILD_OBJECT(
               'rescheduledAt',   NOW(),
               'rescheduledFrom', v.scheduled_start_time)
     WHERE id = p_booking;

    -- No status change, so the status trigger stays silent: everybody who needs
    -- to be at a hospital at a particular hour is told here or not at all.
    IF v.companion_user_id IS NOT NULL THEN
        INSERT INTO notifications (booking_id, recipient_role, recipient_user_id, event, title, body)
        VALUES (p_booking, 'COMPANION', v.companion_user_id, 'BOOKING_RESCHEDULED',
                'Moved: ' || COALESCE(v.reference_code, 'visit'),
                'The customer moved this visit to ' ||
                TO_CHAR(p_start AT TIME ZONE 'Asia/Kolkata', 'DD Mon, HH12:MI AM') || '.');
    END IF;

    INSERT INTO notifications (booking_id, recipient_role, event, title, body)
    VALUES (p_booking, 'ADMIN', 'BOOKING_RESCHEDULED',
            'Moved ' || COALESCE(v.reference_code, ''),
            'Customer moved this visit to ' ||
            TO_CHAR(p_start AT TIME ZONE 'Asia/Kolkata', 'DD Mon, HH12:MI AM') || '.');

    RETURN p_start;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID, TIMESTAMPTZ) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. …and those two are the only way in
-- ---------------------------------------------------------------------------
-- Same shape as guard_booking_payment_columns (26_BILLING): a transaction-local
-- flag that only the RPCs above set. Without it the RPCs are advisory — the
-- customer's own anon-key session can still PATCH the row directly, because the
-- UPDATE policy checks who owns the row and never what changed in it.
CREATE OR REPLACE FUNCTION public.guard_customer_booking_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF current_setting('caresy.customer_action', true) = 'on'
       OR current_setting('caresy.billing', true) = 'on'
       OR is_admin()
       -- No JWT: the expiry sweep, the trip triggers and the cron routes run as
       -- the service role. They are server-side and already trusted.
       OR auth.uid() IS NULL
    THEN
        RETURN NEW;
    END IF;

    -- The companion working the job progresses it through their own RLS policies
    -- (13_LIFECYCLE): accept an open job, Start, Complete.
    IF auth.uid() IN (OLD.companion_user_id, NEW.companion_user_id) THEN
        RETURN NEW;
    END IF;

    IF NEW.status               IS DISTINCT FROM OLD.status
       OR NEW.companion_user_id IS DISTINCT FROM OLD.companion_user_id
       OR NEW.scheduled_start_time IS DISTINCT FROM OLD.scheduled_start_time
       OR NEW.expires_at        IS DISTINCT FROM OLD.expires_at
    THEN
        RAISE EXCEPTION 'Use cancel_booking() or reschedule_booking() to change a visit';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_customer_booking ON bookings;
CREATE TRIGGER trg_guard_customer_booking
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION guard_customer_booking_columns();

-- The lead window, so ops can widen it on a bad day without a deploy.
INSERT INTO app_settings (key, value, label)
VALUES ('min_lead_minutes', '60', 'Least notice, in minutes, for a booking or a reschedule')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cancel_booking'),
        'cancel_booking must exist';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reschedule_booking'),
        'reschedule_booking must exist';
    ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guard_customer_booking'),
        'the customer guard trigger must exist';
    ASSERT (SELECT value FROM app_settings WHERE key = 'min_lead_minutes') IS NOT NULL,
        'min_lead_minutes setting must exist';
END $$;
