-- ============================================================================
-- 45_ADMIN_SMART_NOTIFY.sql — Smart admin notifications (fix flood + new companion)
-- ----------------------------------------------------------------------------
-- Problem: BOOKING_CREATED -> ADMIN (30_LAUNCH_FIXES) enqueues one QUEUED row
-- per booking and send-push leaves it SENDING when OPS_WEBHOOK_URL is empty.
-- 36/44 reclaim SENDING>5m / FAILED retry then re-sends Telegram every 5m
-- endlessly. User reports flood every 2-4m. Also new companion (companions
-- INSERT PENDING_REVIEW) never notifies admin, and booking status
-- ACCEPTED/CANCELLED/EXPIRED was CUSTOMER-only, so admin never saw dispatch
-- done / lost request without polling.
--
-- Fixes:
--  1. New companion pending trigger: INSERT on companions -> ADMIN QUEUED
--     event COMPANION_PENDING_APPROVAL, deduped 5m.
--  2. Extend booking status trigger: on ACCEPTED/CANCELLED/EXPIRED also
--     enqueue ADMIN row (besides existing CUSTOMER row), deduped 5m.
--     IN_PROGRESS/COMPLETED stay CUSTOMER-only to reduce noise.
--  3. Dedupe both triggers: NOT EXISTS same booking/companion + event in last
--     5m with status QUEUED/SENDING/SENT (prevents status flap flood).
--  4. No change to claim/send-push exactly-once logic (36/44 stays).
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Companion pending approval -> ADMIN
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_companion_pending_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only on insert with PENDING_REVIEW (insert guard handles re-apply after REJECTED)
  IF NEW.approval_status != 'PENDING_REVIEW' THEN
    RETURN NEW;
  END IF;

  -- Dedupe: same companion + event within 5m (QUEUED/SENDING/SENT) -> skip
  IF EXISTS (
    SELECT 1 FROM public.notifications
     WHERE recipient_role = 'ADMIN'
       AND event = 'COMPANION_PENDING_APPROVAL'
       AND body LIKE '%' || NEW.id::text || '%'
       AND created_at > now() - interval '5 minutes'
       AND status IN ('QUEUED','SENDING','SENT')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (recipient_role, event, title, body, status)
  VALUES (
    'ADMIN',
    'COMPANION_PENDING_APPROVAL',
    'New companion needs approval — ' || COALESCE(NEW.full_name, substr(NEW.id::text,1,8)),
    'Companion ' || COALESCE(NEW.full_name, NEW.id::text)
      || ' (' || COALESCE(NEW.phone,'no phone') || ') signed up and needs KYC review. ID: ' || NEW.id::text,
    'QUEUED'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_companion_pending_notification ON public.companions;
CREATE TRIGGER trg_enqueue_companion_pending_notification
AFTER INSERT ON public.companions
FOR EACH ROW EXECUTE PROCEDURE public.enqueue_companion_pending_notification();

-- --------------------------------------------------------------------------
-- 2. Booking status -> CUSTOMER (existing) + ADMIN for key statuses
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_event TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN

    -- 2a. Existing CUSTOMER row (keep as-is, but add dedupe)
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
       WHERE booking_id = NEW.id
         AND event = 'STATUS_' || NEW.status
         AND recipient_role = 'CUSTOMER'
         AND created_at > now() - interval '5 minutes'
         AND status IN ('QUEUED','SENDING','SENT')
    ) THEN
      INSERT INTO public.notifications (booking_id, recipient_role, event, title, body)
      VALUES (
        NEW.id, 'CUSTOMER', 'STATUS_' || NEW.status,
        'Booking ' || COALESCE(NEW.reference_code, '') || ' is now ' || NEW.status,
        'Your Caresy request status changed to ' || NEW.status || '.'
      );
    END IF;

    -- 2b. ADMIN row only for dispatch-relevant statuses
    IF NEW.status IN ('ACCEPTED','CANCELLED','EXPIRED') THEN
      v_admin_event := 'ADMIN_STATUS_' || NEW.status;

      -- Dedupe per booking+event 5m
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
         WHERE booking_id = NEW.id
           AND event = v_admin_event
           AND recipient_role = 'ADMIN'
           AND created_at > now() - interval '5 minutes'
           AND status IN ('QUEUED','SENDING','SENT')
      ) THEN
        INSERT INTO public.notifications (booking_id, recipient_role, event, title, body)
        VALUES (
          NEW.id, 'ADMIN', v_admin_event,
          CASE NEW.status
            WHEN 'ACCEPTED' THEN 'Booking ' || COALESCE(NEW.reference_code,'') || ' assigned ✓'
            WHEN 'CANCELLED' THEN 'Booking ' || COALESCE(NEW.reference_code,'') || ' cancelled ✕'
            WHEN 'EXPIRED' THEN 'Booking ' || COALESCE(NEW.reference_code,'') || ' expired — needs re-dispatch'
            ELSE 'Booking ' || COALESCE(NEW.reference_code,'') || ' is now ' || NEW.status
          END,
          CASE NEW.status
            WHEN 'ACCEPTED' THEN 'Companion ' || COALESCE(NEW.companion_user_id::text, '?') || ' accepted booking ' || COALESCE(NEW.reference_code, NEW.id::text) || '. Dispatch done.'
            WHEN 'CANCELLED' THEN 'Booking ' || COALESCE(NEW.reference_code, NEW.id::text) || ' was cancelled — free capacity.'
            WHEN 'EXPIRED' THEN 'Booking ' || COALESCE(NEW.reference_code, NEW.id::text) || ' expired unassigned — needs manual dispatch or reassignment.'
            ELSE 'Booking ' || COALESCE(NEW.reference_code, NEW.id::text) || ' is now ' || NEW.status || '.'
          END
        );
      END IF;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enqueue_booking_notification ON public.bookings;
CREATE TRIGGER trg_enqueue_booking_notification
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE public.enqueue_booking_notification();

-- Dedupe for BOOKING_CREATED as well (30_LAUNCH_FIXES already enqueues, add guard now)
CREATE OR REPLACE FUNCTION public.enqueue_new_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'DRAFT' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications
     WHERE booking_id = NEW.id
       AND event = 'BOOKING_CREATED'
       AND recipient_role = 'ADMIN'
       AND created_at > now() - interval '5 minutes'
       AND status IN ('QUEUED','SENDING','SENT')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (booking_id, recipient_role, event, title, body)
  VALUES (
    NEW.id, 'ADMIN', 'BOOKING_CREATED',
    CASE WHEN NEW.booking_type = 'INSTANT' THEN 'URGENT request ' ELSE 'New booking ' END || COALESCE(NEW.reference_code, ''),
    'A ' || NEW.service_type || ' request needs a companion assigned.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_new_booking_notification ON public.bookings;
CREATE TRIGGER trg_enqueue_new_booking_notification
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION enqueue_new_booking_notification();

-- Sanity asserts
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname='enqueue_companion_pending_notification'), 'companion trigger must exist';
  ASSERT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_enqueue_companion_pending_notification'), 'trg_enqueue_companion_pending_notification must exist';
  ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname='enqueue_booking_notification'), 'enqueue_booking_notification must exist';
END $$;
