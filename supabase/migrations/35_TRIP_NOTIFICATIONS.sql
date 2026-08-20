-- ============================================================================
-- 35_TRIP_NOTIFICATIONS.sql — Trip-status customer notifications
-- ----------------------------------------------------------------------------
-- Closes the CARESY-3 gap: companion advancing a trip via advance_trip_status()
-- (16_TRIPS_AND_LIVE_TRACKING.sql) only UPDATED trips and wrote no
-- notifications row, so the customer tracking screen was silent and Telegram
-- saw nothing. Bookings status already notifies via 13_LIFECYCLE, but trips
-- run on a finer state machine (assigned → en_route_pickup → picked_up → …)
-- that the customer should see in real time.
--
-- Adds AFTER UPDATE OF status ON trips trigger that INSERTs one QUEUED row
-- per status change: event TRIP_<STATUS>, recipient_role CUSTOMER,
-- recipient_user_id = trip.customer_user_id (the booking owner), with
-- booking_id (+ patient_id via bookings) so the existing cron SELECT and
-- Telegram fan-out (route.ts / lib/telegram.ts) pick it up automatically.
--
-- Fires only when NEW.status IS DISTINCT FROM OLD.status (no insert on
-- location pings or other column updates). Mirrors the 13_LIFECYCLE
-- enqueue_booking_notification + 23_CARE enqueue_care_event_notification shape:
-- SECURITY DEFINER, SET search_path = public, same notifications columns.
--
-- Does NOT add trip CREATE notifications (piggybacks on BOOKING_ACCEPTED per
-- god Q1). Does NOT cover companion approval / patient CRUD / billing (Q2
-- SKIP). Does NOT add the CARESY-4 exact-once claim column (Q3 ACCEPT).
-- Single TELEGRAM_CHAT_ID is expected (Q4).
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

-- Enqueue one customer notification when a trip's status advances.
CREATE OR REPLACE FUNCTION public.enqueue_trip_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref       TEXT;
    v_patient   UUID;
    v_title     TEXT;
    v_body      TEXT;
    v_status    TEXT := upper(NEW.status::text);
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    -- Need booking context for human text + patient link.
    SELECT reference_code, patient_id
      INTO v_ref, v_patient
      FROM public.bookings
     WHERE id = NEW.booking_id;

    -- Human title/body per trip_status (assigned, en_route_pickup, picked_up,
    -- en_route_hospital, arrived, completed, cancelled). Keep concise for
    -- the Telegram preview and push title.
    CASE NEW.status::text
        WHEN 'assigned' THEN
            v_title := 'Companion assigned — booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8));
            v_body  := 'A companion has been assigned to your booking. You can follow them live in Tracking.';
        WHEN 'en_route_pickup' THEN
            v_title := 'Companion is on the way — ' || COALESCE(v_ref, '');
            v_body  := 'Your companion is en route to the pickup location for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || '.';
        WHEN 'picked_up' THEN
            v_title := 'Picked up — ' || COALESCE(v_ref, '');
            v_body  := 'Your companion has picked up the patient for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || '.';
        WHEN 'en_route_hospital' THEN
            v_title := 'En route to hospital — ' || COALESCE(v_ref, '');
            v_body  := 'Your companion is en route to the hospital for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || '.';
        WHEN 'arrived' THEN
            v_title := 'Arrived — ' || COALESCE(v_ref, '');
            v_body  := 'Your companion has arrived for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || '.';
        WHEN 'completed' THEN
            v_title := 'Trip completed — ' || COALESCE(v_ref, '');
            v_body  := 'The trip for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || ' is complete.';
        WHEN 'cancelled' THEN
            v_title := 'Trip cancelled — ' || COALESCE(v_ref, '');
            v_body  := 'The trip for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || ' was cancelled.';
        ELSE
            v_title := 'Trip ' || v_status || ' — ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8));
            v_body  := 'Trip status is now ' || NEW.status::text || ' for booking ' || COALESCE(v_ref, substr(NEW.booking_id::text,1,8)) || '.';
    END CASE;

    INSERT INTO public.notifications (
        booking_id, patient_id, recipient_user_id, recipient_role,
        event, title, body, status
    ) VALUES (
        NEW.booking_id,
        v_patient,
        NEW.customer_user_id,
        'CUSTOMER',
        'TRIP_' || v_status,
        v_title,
        v_body,
        'QUEUED'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_trip_status_notification ON public.trips;
CREATE TRIGGER trg_enqueue_trip_status_notification
AFTER UPDATE OF status ON public.trips
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE PROCEDURE public.enqueue_trip_status_notification();

-- Sanity: function + trigger must exist
DO $$
BEGIN
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enqueue_trip_status_notification'),
        'enqueue_trip_status_notification must exist';
    ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enqueue_trip_status_notification'),
        'trg_enqueue_trip_status_notification must exist';
END $$;
