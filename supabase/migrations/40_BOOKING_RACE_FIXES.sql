-- ============================================================================
-- 40_BOOKING_RACE_FIXES.sql — Close two concurrency races
-- ---------------------------------------------------------------------------
-- Two independent fixes, both CREATE OR REPLACE redefinitions (never edit the
-- original migration files):
--
-- 3a. complete_booking() — add row lock, close double-tap overwrite race.
--     Current 26_BILLING.sql:134 does SELECT ... without FOR UPDATE, then
--     UPDATE — two near-simultaneous calls can both pass the "already
--     COMPLETED" idempotency check before either commits, second silently
--     overwrites first's billed_minutes/final_amount_paise.
--     FOR UPDATE at the read makes second call block before computing,
--     then re-read post-commit and hit idempotent early-return.
--
-- 3b. reschedule_booking() — stop race against 5-min expiry sweep.
--     Current 31_CUSTOMER_ACTIONS.sql:81-142 reads status once with no lock,
--     then writes scheduled_start_time/expires_at unconditionally by id alone
--     with no re-check — expire_stale_bookings() cron can flip row to
--     EXPIRED in between, producing EXPIRED but freshly-future expires_at,
--     invisible to companion feed and admin status-filtered board forever.
--     Add FOR UPDATE to initial SELECT, add AND status IN (...) to final
--     UPDATE WHERE, and GET DIAGNOSTICS row count → exception if zero.
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

-- 3a. complete_booking with FOR UPDATE
CREATE OR REPLACE FUNCTION public.complete_booking(p_booking UUID)
RETURNS TABLE (final_amount_paise INTEGER, billed_minutes INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking  bookings%ROWTYPE;
    v_minutes  INTEGER;
    v_evening  INTEGER;
    v_total    INTEGER;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.companion_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the assigned companion may complete this booking';
    END IF;

    IF v_booking.status = 'COMPLETED' THEN
        RETURN QUERY SELECT v_booking.final_amount_paise, v_booking.billed_minutes;
        RETURN;
    END IF;

    IF v_booking.actual_start_time IS NULL THEN
        RAISE EXCEPTION 'Start the job before completing it';
    END IF;

    v_minutes := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - v_booking.actual_start_time)) / 60.0))::INTEGER;
    v_evening := COALESCE((v_booking.service_metadata ->> 'eveningSurchargePaise')::INTEGER, 0);
    IF v_evening NOT IN (0, 9900) THEN
        v_evening := 0;
    END IF;
    v_total := price_for_minutes(v_minutes) + v_evening;

    PERFORM set_config('caresy.billing', 'on', true);
    UPDATE bookings SET
        status = 'COMPLETED', actual_end_time = NOW(), billed_minutes = v_minutes,
        final_amount_paise = v_total, payment_status = 'PENDING'
    WHERE id = p_booking;

    RETURN QUERY SELECT v_total, v_minutes;
END;
$$;

-- 3b. reschedule_booking with FOR UPDATE + status re-check
CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking UUID, p_start TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v    bookings%ROWTYPE;
    lead INT := get_setting_int('min_lead_minutes', 60);
    mins INT := get_setting_int('instant_expiry_minutes', 30);
    hrs  INT := get_setting_int('scheduled_flag_hours', 2);
    v_rows INT;
BEGIN
    SELECT * INTO v FROM bookings WHERE id = p_booking AND deleted_at IS NULL FOR UPDATE;
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
           booking_type = 'SCHEDULED',
           expires_at = GREATEST(p_start - (hrs || ' hours')::INTERVAL,
                                 NOW() + (mins || ' minutes')::INTERVAL),
           service_metadata = COALESCE(service_metadata, '{}'::JSONB) || JSONB_BUILD_OBJECT(
               'rescheduledAt',   NOW(),
               'rescheduledFrom', v.scheduled_start_time)
     WHERE id = p_booking AND status IN ('PENDING','ACCEPTED','ASSIGNED');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'This visit changed status and can no longer be rescheduled — refresh and try again';
    END IF;

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

REVOKE ALL ON FUNCTION public.complete_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_booking(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.reschedule_booking(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID, TIMESTAMPTZ) TO authenticated;

DO $check$
BEGIN
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_booking' AND pronargs = 1), 'complete_booking must exist';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reschedule_booking' AND pronargs = 2), 'reschedule_booking must exist';
    -- Both must remain SECURITY DEFINER with search_path pinned
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'complete_booking' AND prosecdef
    ), 'complete_booking must be SECURITY DEFINER';
    ASSERT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'reschedule_booking' AND prosecdef
    ), 'reschedule_booking must be SECURITY DEFINER';
END $check$;
