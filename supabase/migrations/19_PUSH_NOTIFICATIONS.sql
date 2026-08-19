-- ============================================================================
-- 19. PUSH NOTIFICATIONS
-- ----------------------------------------------------------------------------
-- Delivers the QUEUED rows in public.notifications (enqueued by migration 13
-- on every booking status change) as Expo push notifications.
--
--   1. public.device_push_tokens — one row per device; users upsert their own.
--   2. drain_push_notifications() — joins QUEUED notifications to recipient
--      tokens and POSTs directly to the Expo Push API via pg_net (no Edge
--      Function needed; the Expo push endpoint requires no server key).
--   3. pg_cron job 'drain-push-notifications' — runs the drain every minute.
--
-- Idempotent: safe to run repeatedly.
-- Requires: pg_net + pg_cron extensions (both available on Supabase).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ----------------------------------------------------------------------------
-- 1. Device push tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
    token       TEXT PRIMARY KEY,              -- ExponentPushToken[...]
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform    TEXT,                          -- ios | android
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user
    ON public.device_push_tokens(user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push tokens" ON public.device_push_tokens;
CREATE POLICY "Users manage own push tokens"
    ON public.device_push_tokens FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Drain QUEUED notifications to the Expo Push API
-- ----------------------------------------------------------------------------
-- Resolves each QUEUED notification to its recipient user (via the booking and
-- recipient_role), fans out one Expo push message per registered device, and
-- marks the row SENT (or FAILED if the recipient has no tokens — nothing to
-- retry against). Delivery receipts are not tracked; Expo drops invalid tokens
-- silently, which is acceptable for status-change notices.
CREATE OR REPLACE FUNCTION public.drain_push_notifications()
RETURNS INT AS $$
DECLARE
    n INT := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT nt.id, nt.title, nt.body, nt.booking_id, t.token
          FROM public.notifications nt
          JOIN public.bookings b ON b.id = nt.booking_id
          LEFT JOIN public.device_push_tokens t
            ON t.user_id = CASE nt.recipient_role
                                WHEN 'CUSTOMER'  THEN b.customer_user_id
                                WHEN 'COMPANION' THEN b.companion_user_id
                           END
         WHERE nt.status = 'QUEUED'
         ORDER BY nt.created_at
         LIMIT 100
    LOOP
        IF r.token IS NOT NULL THEN
            PERFORM net.http_post(
                url     := 'https://exp.host/--/api/v2/push/send',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body    := jsonb_build_object(
                    'to',    r.token,
                    'title', r.title,
                    'body',  COALESCE(r.body, ''),
                    'data',  jsonb_build_object('booking_id', r.booking_id)
                )
            );
        END IF;

        UPDATE public.notifications
           SET status = CASE WHEN r.token IS NULL THEN 'FAILED' ELSE 'SENT' END
         WHERE id = r.id;
        n := n + 1;
    END LOOP;
    RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 3. Schedule the drain every minute
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-push-notifications') THEN
        PERFORM cron.unschedule('drain-push-notifications');
    END IF;
END $$;

SELECT cron.schedule(
    'drain-push-notifications',
    '* * * * *',
    $$ SELECT public.drain_push_notifications(); $$
);

-- Verify:
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'drain-push-notifications';
