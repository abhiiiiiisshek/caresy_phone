-- ============================================================================
-- Caresy — Migration 13: Request lifecycle, auto-expiry, jobs, notifications
-- ----------------------------------------------------------------------------
-- Run AFTER 12_LIFECYCLE_ENUMS.sql. Idempotent.
--
-- Adds:
--   1. app_settings           — admin-editable config (timeouts).
--   2. bookings.expires_at     + a trigger that sets it on creation.
--   3. expire_stale_bookings()  — moves timed-out PENDING requests to EXPIRED.
--   4. Companion job access     — RLS so approved companions can see open jobs,
--                                accept them, and progress their own jobs.
--   5. notifications           + a trigger that enqueues one on each status
--                                change (delivery integration is a follow-up).
--
-- Scheduling: see the pg_cron block at the bottom, OR use the Vercel cron route
-- at /api/cron/expire-bookings (shipped with this app).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. APP SETTINGS (configurable timeouts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    label      TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value, label) VALUES
    ('instant_expiry_minutes', '30', 'Minutes before an unaccepted same-day request expires'),
    ('scheduled_flag_hours',   '2',  'Hours before a scheduled start to escalate if still unassigned')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage settings" ON app_settings;
CREATE POLICY "Admins manage settings"
    ON app_settings FOR ALL
    USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION get_setting_int(p_key TEXT, p_default INT)
RETURNS INT AS $$
DECLARE v TEXT;
BEGIN
    SELECT value INTO v FROM app_settings WHERE key = p_key;
    IF v IS NULL THEN RETURN p_default; END IF;
    RETURN v::INT;
EXCEPTION WHEN others THEN RETURN p_default;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 2. bookings.expires_at + auto-set on creation
-- ----------------------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_booking_expiry()
RETURNS TRIGGER AS $$
DECLARE
    mins INT;
    hrs  INT;
BEGIN
    IF NEW.status = 'DRAFT' OR NEW.expires_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    mins := get_setting_int('instant_expiry_minutes', 30);
    hrs  := get_setting_int('scheduled_flag_hours', 2);

    IF NEW.booking_type = 'INSTANT' THEN
        NEW.expires_at := NOW() + (mins || ' minutes')::INTERVAL;
    ELSIF NEW.scheduled_start_time IS NOT NULL THEN
        NEW.expires_at := NEW.scheduled_start_time - (hrs || ' hours')::INTERVAL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_booking_expiry ON bookings;
CREATE TRIGGER trg_set_booking_expiry
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE PROCEDURE set_booking_expiry();


-- ----------------------------------------------------------------------------
-- 3. Expiry sweep
-- ----------------------------------------------------------------------------
-- Moves any still-PENDING request past its expires_at to EXPIRED. Safe to run
-- as often as you like; only affects overdue rows. Returns how many expired.
CREATE OR REPLACE FUNCTION expire_stale_bookings()
RETURNS INT AS $$
DECLARE n INT;
BEGIN
    UPDATE bookings
       SET status = 'EXPIRED'
     WHERE status = 'PENDING'
       AND expires_at IS NOT NULL
       AND expires_at < NOW()
       AND deleted_at IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow the Vercel cron route (anon key) to trigger the sweep. The function
-- only expires already-overdue rows, so exposing it is harmless.
GRANT EXECUTE ON FUNCTION expire_stale_bookings() TO anon, authenticated;

-- Backfill expires_at for existing PENDING rows so old stuck requests get an
-- expiry too (instant: 30 min after creation; scheduled: 2h before start).
UPDATE bookings
   SET expires_at = CASE
        WHEN booking_type = 'INSTANT' THEN created_at + (get_setting_int('instant_expiry_minutes',30) || ' minutes')::INTERVAL
        WHEN scheduled_start_time IS NOT NULL THEN scheduled_start_time - (get_setting_int('scheduled_flag_hours',2) || ' hours')::INTERVAL
        ELSE created_at + INTERVAL '30 minutes'
   END
 WHERE status = 'PENDING' AND expires_at IS NULL;


-- ----------------------------------------------------------------------------
-- 4. Companion job access (RLS)
-- ----------------------------------------------------------------------------
-- Approved companions can SEE open (unassigned, still-pending) jobs...
DROP POLICY IF EXISTS "Approved companions see open jobs" ON bookings;
CREATE POLICY "Approved companions see open jobs"
    ON bookings FOR SELECT
    USING (
        status = 'PENDING'
        AND companion_user_id IS NULL
        AND deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM companions c
            WHERE c.id = auth.uid() AND c.approval_status = 'APPROVED'
        )
    );

-- ...and ACCEPT one (claim it for themselves). WITH CHECK constrains the write
-- so they can only assign it to themselves and only into ACCEPTED.
DROP POLICY IF EXISTS "Approved companions accept open jobs" ON bookings;
CREATE POLICY "Approved companions accept open jobs"
    ON bookings FOR UPDATE
    USING (
        status = 'PENDING'
        AND companion_user_id IS NULL
        AND EXISTS (
            SELECT 1 FROM companions c
            WHERE c.id = auth.uid() AND c.approval_status = 'APPROVED'
        )
    )
    WITH CHECK (
        companion_user_id = auth.uid()
        AND status = 'ACCEPTED'
    );

-- Once assigned, the companion may progress their own job (ACCEPTED ->
-- IN_PROGRESS -> COMPLETED) but never reassign it away from themselves.
DROP POLICY IF EXISTS "Assigned companion updates own job" ON bookings;
CREATE POLICY "Assigned companion updates own job"
    ON bookings FOR UPDATE
    USING (companion_user_id = auth.uid())
    WITH CHECK (companion_user_id = auth.uid());

-- Approved companions may read the pickup location of jobs they can see (open
-- jobs) or are assigned to — needed to display the hospital/area on the feed.
DROP POLICY IF EXISTS "Companions read job locations" ON locations;
CREATE POLICY "Companions read job locations"
    ON locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.pickup_location_id = locations.id
              AND (
                    b.companion_user_id = auth.uid()
                 OR (b.status = 'PENDING' AND b.companion_user_id IS NULL)
              )
        )
        AND EXISTS (
            SELECT 1 FROM companions c
            WHERE c.id = auth.uid() AND c.approval_status = 'APPROVED'
        )
    );

-- The assigned companion may read the patient details for their own job only
-- (patient PII stays hidden on the open-jobs feed until a job is accepted).
DROP POLICY IF EXISTS "Assigned companion reads job patient" ON patients;
CREATE POLICY "Assigned companion reads job patient"
    ON patients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.patient_id = patients.id
              AND b.companion_user_id = auth.uid()
        )
    );


-- ----------------------------------------------------------------------------
-- 5. Notifications (enqueue on status change)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID REFERENCES bookings(id) ON DELETE CASCADE,
    recipient_role TEXT,                         -- CUSTOMER | COMPANION | ADMIN
    event          TEXT NOT NULL,                -- e.g. STATUS_ACCEPTED
    title          TEXT NOT NULL,
    body           TEXT,
    status         TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED | SENT | FAILED
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status) WHERE status = 'QUEUED';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read notifications" ON notifications;
CREATE POLICY "Admins read notifications"
    ON notifications FOR SELECT USING (is_admin());

-- Enqueue a notification whenever a booking's status changes. Actual delivery
-- (WhatsApp/SMS/email) is a follow-up that drains the QUEUED rows — this makes
-- the app capture every event that should be sent, honestly, right now.
CREATE OR REPLACE FUNCTION enqueue_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO notifications (booking_id, recipient_role, event, title, body)
        VALUES (
            NEW.id, 'CUSTOMER', 'STATUS_' || NEW.status,
            'Booking ' || COALESCE(NEW.reference_code, '') || ' is now ' || NEW.status,
            'Your Caresy request status changed to ' || NEW.status || '.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enqueue_booking_notification ON bookings;
CREATE TRIGGER trg_enqueue_booking_notification
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE PROCEDURE enqueue_booking_notification();


-- ----------------------------------------------------------------------------
-- 6. Scheduling the expiry sweep
-- ----------------------------------------------------------------------------
-- OPTION A (recommended if available) — pg_cron every 5 minutes.
-- Enable the extension first: Dashboard → Database → Extensions → pg_cron.
-- Then uncomment:
--
--   SELECT cron.schedule('expire-stale-bookings', '*/5 * * * *',
--          $$ SELECT expire_stale_bookings(); $$);
--
-- OPTION B — Vercel Cron. This app already ships /api/cron/expire-bookings and
-- a vercel.json schedule; set a CRON_SECRET env var in Vercel and you're done.
-- No extension needed.
-- ============================================================================
