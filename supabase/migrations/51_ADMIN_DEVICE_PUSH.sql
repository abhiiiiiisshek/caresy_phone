-- ============================================================================
-- 51_ADMIN_DEVICE_PUSH.sql — ADMIN notifications reach admin phones
-- ----------------------------------------------------------------------------
-- Until now an ADMIN-role notification row had nowhere to go but Telegram or
-- OPS_WEBHOOK_URL: 13_LIFECYCLE writes it with recipient_user_id NULL (it is
-- addressed to the desk, not a person), and send-push's device path keys off
-- recipient_user_id. The iOS admin app (apps/admin-app) registers its Expo push
-- token into push_tokens like any other device, so all that is missing is a way
-- for the cron route — which holds the service-role key and cannot read
-- auth.users over PostgREST — to ask "which user ids are admins?".
--
-- Also adds the upcoming-visit sweep. 50_NOTIFICATION_ATTENTION escalates a
-- PENDING booking as it races expires_at, but a *scheduled* visit that is still
-- unstaffed an hour before it starts trips no rule at all — it simply arrives.
-- enqueue_upcoming_unstaffed_bookings() closes that gap by writing an ordinary
-- ADMIN notification row, so it inherits the whole existing delivery path
-- (claim → Telegram → device push) rather than growing a second one.
--
-- Idempotent. Run in the Supabase SQL editor or via `supabase db push`.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Which auth users are admins
-- --------------------------------------------------------------------------
-- Mirrors is_admin() (43_FIX_IS_ADMIN_NULL) exactly: the admin_users allowlist
-- plus the legacy @caresy.co domain. SECURITY DEFINER because auth.users is not
-- readable by PostgREST roles; EXECUTE is granted to service_role only, so the
-- anon/authenticated keys shipped in the apps cannot enumerate admin accounts.
CREATE OR REPLACE FUNCTION public.admin_push_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT u.id
      FROM auth.users u
     WHERE lower(u.email) IN (SELECT email FROM admin_users)
        OR u.email LIKE '%@caresy.co';
$$;

REVOKE EXECUTE ON FUNCTION public.admin_push_user_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_push_user_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_push_user_ids() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_push_user_ids() TO service_role;

-- --------------------------------------------------------------------------
-- 2. Scheduled visits that are still unstaffed as they approach
-- --------------------------------------------------------------------------
-- Called once per send-push tick. Enqueues one ADMIN row per booking that:
--   • has a scheduled_start_time inside the lead window and still ahead of now,
--   • has no companion,
--   • is not in a terminal status,
--   • has not already been flagged in the last hour (dedupe: the sweep runs
--     every minute and must not re-enqueue 60 times before someone acts).
-- Returns how many rows it wrote, so the route can report it.
CREATE OR REPLACE FUNCTION public.enqueue_upcoming_unstaffed_bookings(p_lead_minutes INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    INSERT INTO public.notifications (booking_id, recipient_role, event, title, body, status)
    SELECT
        b.id,
        'ADMIN',
        'BOOKING_UPCOMING_UNSTAFFED',
        'Unstaffed visit starting soon — ' || COALESCE(b.reference_code, substr(b.id::text, 1, 8)),
        'Booking ' || COALESCE(b.reference_code, substr(b.id::text, 1, 8))
            || ' starts in ' || GREATEST(0, ROUND(EXTRACT(EPOCH FROM (b.scheduled_start_time - now())) / 60))::text
            || ' min with no companion assigned.',
        'QUEUED'
      FROM public.bookings b
     WHERE b.companion_user_id IS NULL
       AND b.deleted_at IS NULL
       AND b.scheduled_start_time IS NOT NULL
       AND b.scheduled_start_time > now()
       AND b.scheduled_start_time <= now() + make_interval(mins => p_lead_minutes)
       AND b.status::text NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED')
       AND NOT EXISTS (
            SELECT 1
              FROM public.notifications n
             WHERE n.booking_id = b.id
               AND n.event = 'BOOKING_UPCOMING_UNSTAFFED'
               AND n.created_at > now() - interval '1 hour'
       );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_upcoming_unstaffed_bookings(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_upcoming_unstaffed_bookings(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_upcoming_unstaffed_bookings(INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_upcoming_unstaffed_bookings(INT) TO service_role;

-- --------------------------------------------------------------------------
-- 3. Assertions
-- --------------------------------------------------------------------------
-- The SQL editor runs with no JWT, so these prove the functions exist and are
-- callable as the definer rather than proving any particular row content.
DO $$
DECLARE
    v_admins INT;
BEGIN
    SELECT count(*) INTO v_admins FROM public.admin_push_user_ids();
    IF v_admins IS NULL THEN
        RAISE EXCEPTION 'admin_push_user_ids() returned NULL';
    END IF;

    -- A zero-lead sweep can never match (scheduled_start_time > now() AND
    -- <= now()), so this is a safe smoke test that writes nothing.
    IF public.enqueue_upcoming_unstaffed_bookings(0) <> 0 THEN
        RAISE EXCEPTION 'enqueue_upcoming_unstaffed_bookings(0) wrote rows it should not have';
    END IF;
END;
$$;
