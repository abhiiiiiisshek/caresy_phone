-- ============================================================================
-- 30. Launch fixes — the gaps a real customer would hit on day one
-- ============================================================================
-- Everything here was found by walking the live loop end to end: book -> accept
-- -> start -> complete -> collect. Each section names the failure it prevents.

-- ---------------------------------------------------------------------------
-- 1. A same-day booking must not be born already expired
-- ---------------------------------------------------------------------------
-- 13_LIFECYCLE set expires_at = scheduled_start_time - 2h for every SCHEDULED
-- booking. Somebody booking at 10:00 for 11:00 got expires_at = 09:00, already
-- in the past, so the very next expiry sweep moved a brand-new paid-intent
-- request to EXPIRED before any companion could see it. Same-day booking is the
-- common case for a hospital visit, not the edge case.
--
-- Floor it at the instant-booking window instead: however close the visit is,
-- the request always gets at least that long to be claimed.
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
        NEW.expires_at := GREATEST(
            NEW.scheduled_start_time - (hrs || ' hours')::INTERVAL,
            NOW() + (mins || ' minutes')::INTERVAL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rescue any live row the old rule already killed on arrival: still PENDING,
-- expiry in the past, but the visit itself has not happened yet.
UPDATE bookings
   SET expires_at = NOW() + (get_setting_int('instant_expiry_minutes', 30) || ' minutes')::INTERVAL
 WHERE status = 'PENDING'
   AND deleted_at IS NULL
   AND expires_at IS NOT NULL
   AND expires_at < NOW()
   AND (scheduled_start_time IS NULL OR scheduled_start_time > NOW());

-- ---------------------------------------------------------------------------
-- 2. The customer must learn who is coming, whoever assigned them
-- ---------------------------------------------------------------------------
-- Customers cannot SELECT from `companions` (policy: self or admin only), so
-- my-bookings reads the companion out of bookings.service_metadata.companion.
-- Only the admin dispatch board ever wrote that blob. When a companion accepted
-- a job from their own phone — the normal path — the customer's screen showed a
-- bare status and no name, no photo, and no phone number to call. Neither side
-- could reach the other on the day of the visit.
--
-- Stamping it in the database instead of in each app is what makes both paths
-- work, including any future one: the blob is derived from the companions row
-- rather than from whatever the caller happened to send.
CREATE OR REPLACE FUNCTION public.stamp_companion_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE c companions%ROWTYPE;
BEGIN
    IF NEW.companion_user_id IS NOT DISTINCT FROM OLD.companion_user_id THEN
        RETURN NEW;
    END IF;

    -- Unassigned again: drop the stale card rather than leave a name attached
    -- to a booking that nobody is covering.
    IF NEW.companion_user_id IS NULL THEN
        NEW.service_metadata := COALESCE(NEW.service_metadata, '{}'::JSONB) - 'companion';
        RETURN NEW;
    END IF;

    SELECT * INTO c FROM companions WHERE id = NEW.companion_user_id;
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    NEW.service_metadata := COALESCE(NEW.service_metadata, '{}'::JSONB) || JSONB_BUILD_OBJECT(
        'companion', JSONB_BUILD_OBJECT(
            'name',   c.full_name,
            -- The reason this section exists. A family standing outside a
            -- hospital gate needs to call the person meeting them.
            'phone',  c.phone,
            'photo',  c.photo_url,
            'avatar', UPPER(LEFT(c.full_name, 1)),
            'rating', CASE WHEN c.rating IS NOT NULL
                           THEN ROUND(c.rating, 1)::TEXT || ' (' || c.total_jobs || ' visits)'
                           ELSE 'New companion' END,
            'verification', 'Police Verified',
            'lang',      ARRAY_TO_STRING(COALESCE(c.languages, '{}'), ', '),
            'specialty', COALESCE(c.specialties[1], 'General Care')
        ));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_companion_on_booking ON bookings;
CREATE TRIGGER trg_stamp_companion_on_booking
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION stamp_companion_on_booking();

-- Backfill bookings that were assigned before the trigger existed.
UPDATE bookings b
   SET service_metadata = COALESCE(b.service_metadata, '{}'::JSONB) || JSONB_BUILD_OBJECT(
        'companion', JSONB_BUILD_OBJECT(
            'name',   c.full_name,
            'phone',  c.phone,
            'photo',  c.photo_url,
            'avatar', UPPER(LEFT(c.full_name, 1)),
            'rating', CASE WHEN c.rating IS NOT NULL
                           THEN ROUND(c.rating, 1)::TEXT || ' (' || c.total_jobs || ' visits)'
                           ELSE 'New companion' END,
            'verification', 'Police Verified',
            'lang',      ARRAY_TO_STRING(COALESCE(c.languages, '{}'), ', '),
            'specialty', COALESCE(c.specialties[1], 'General Care')
        ))
  FROM companions c
 WHERE b.companion_user_id = c.id
   AND b.service_metadata -> 'companion' ->> 'phone' IS DISTINCT FROM c.phone;

-- ---------------------------------------------------------------------------
-- 3. A companion may not certify their own licence
-- ---------------------------------------------------------------------------
-- 27_TRANSPORT says can_drive is "never self-served: a companion ticking their
-- own eligibility box is not verification" — but the guard that enforces that
-- rule for approval_status was never extended to cover it. A companion owns
-- their row and can UPDATE it, so a single PATCH from the browser set
-- can_drive = TRUE and let them take a job driving a stranger's car. The whole
-- licence gate was one HTTP request wide.
CREATE OR REPLACE FUNCTION guard_companion_privileged_fields()
RETURNS TRIGGER AS $$
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

    -- UPDATE by a non-admin. Allow re-application after rejection
    -- (REJECTED -> PENDING_REVIEW); block every other approval change.
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

    -- The licence itself stays editable by its owner (they upload it and fix
    -- typos); the verdict on it does not.
    IF NEW.can_drive         IS DISTINCT FROM OLD.can_drive
       OR NEW.drive_verified_by IS DISTINCT FROM OLD.drive_verified_by
       OR NEW.drive_verified_at IS DISTINCT FROM OLD.drive_verified_at
    THEN
        RAISE EXCEPTION 'Only an admin can verify a driving licence';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. Ops must be told a booking arrived, not just that one changed
-- ---------------------------------------------------------------------------
-- enqueue_booking_notification fires AFTER UPDATE only, so the single most
-- important event in the business — a new request — queued nothing at all. The
-- admin notifications page stayed empty until somebody had already noticed the
-- booking by other means, which for an urgent same-day request is the whole
-- window.
CREATE OR REPLACE FUNCTION public.enqueue_new_booking_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'DRAFT' THEN
        RETURN NEW;
    END IF;

    INSERT INTO notifications (booking_id, recipient_role, event, title, body)
    VALUES (
        NEW.id, 'ADMIN', 'BOOKING_CREATED',
        CASE WHEN NEW.booking_type = 'INSTANT' THEN 'URGENT request ' ELSE 'New booking ' END
            || COALESCE(NEW.reference_code, ''),
        'A ' || NEW.service_type || ' request needs a companion assigned.'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_new_booking_notification ON bookings;
CREATE TRIGGER trg_enqueue_new_booking_notification
    AFTER INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION enqueue_new_booking_notification();

-- ---------------------------------------------------------------------------
-- 5. A driving job nobody can take should never reach the board
-- ---------------------------------------------------------------------------
-- guard_drive_assignment (27_TRANSPORT) rejects the assignment with a raw
-- Postgres exception, which surfaced to a companion as an alert() they can do
-- nothing about, on a booking that stays open forever. Let ops see the reason
-- on the dispatch board instead of discovering it at assignment time.
CREATE OR REPLACE VIEW public.drive_ready_companions AS
    SELECT id, full_name, driving_licence_expiry
      FROM companions
     WHERE approval_status = 'APPROVED'
       AND can_drive
       AND driving_licence_expiry IS NOT NULL
       AND driving_licence_expiry >= CURRENT_DATE
       AND deleted_at IS NULL;

REVOKE ALL ON public.drive_ready_companions FROM PUBLIC;
GRANT SELECT ON public.drive_ready_companions TO authenticated;

-- ---------------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stamp_companion_on_booking'),
        'companion stamp trigger must exist';
    ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enqueue_new_booking_notification'),
        'new-booking notification trigger must exist';
    ASSERT NOT EXISTS (
        SELECT 1 FROM bookings
         WHERE status = 'PENDING' AND deleted_at IS NULL
           AND expires_at < NOW()
           AND (scheduled_start_time IS NULL OR scheduled_start_time > NOW())
    ), 'no upcoming pending booking may already be past its expiry';
END $$;
