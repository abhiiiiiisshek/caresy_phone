-- ============================================================================
-- 44_NOTIFICATION_RETRY.sql — Retry for FAILED notifications (issue #11)
-- ----------------------------------------------------------------------------
-- Before this, a notification that reached FAILED (FCM error, webhook 5xx,
-- network) stayed FAILED forever. Real defect: one bad run stranded the row;
-- ops requeued by hand with `update notifications set status='QUEUED'...`.
--
-- Policy: bounded retries with exponential backoff.
--   * MAX_ATTEMPTS = 5 (initial attempt + 4 retries). After 5 failures the
--     row stays FAILED permanently and surfaces in /admin/ops for manual
--     inspection. 5 is enough to ride out transient FCM quota/network blips
--     without hiding a permanently invalid row forever.
--   * Backoff = LEAST(60, 5 * 2^(attempts)) minutes after each failure.
--     5, 10, 20, 40, 60 minutes. Exponential avoids hammering a failing
--     provider; cap at 60m keeps worst-case delay bounded for an alert that
--     still matters (booking dispatch). Jitter not needed — ticks are 1/min and
--     concurrent ticks claim disjoint sets via SKIP LOCKED anyway.
--   * SENDING stale-reclaim (5m) unchanged — that covers crash mid-send.
--     FAILED retry is a second clause in the same claim query.
--
-- Adds:
--   1. attempts INT DEFAULT 0, next_retry_at TIMESTAMPTZ
--   2. extends claim_notifications() to also claim eligible FAILED rows:
--      status='FAILED' AND COALESCE(attempts,0) < 5 AND (next_retry_at IS NULL OR next_retry_at <= now())
--   3. index on next_retry_at for the FAILED clause
--
-- The send-push cron sets attempts/next_retry_at on each FAILED transition
-- (see apps/website/src/app/api/cron/send-push/route.ts). The claim query
-- then re-queues eligible rows automatically on a later tick.
-- Idempotent. Never edit an applied migration — fix forward with 45.
-- ============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Existing rows may have NULL attempts if added before default; normalize.
UPDATE public.notifications SET attempts = 0 WHERE attempts IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_failed_retry
  ON public.notifications(next_retry_at)
  WHERE status = 'FAILED';

-- Replace claim_notifications to include FAILED retry eligibility
CREATE OR REPLACE FUNCTION public.claim_notifications(p_limit INT)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    p_limit := 200;
  END IF;

  RETURN QUERY
  UPDATE public.notifications
     SET status = 'SENDING',
         claimed_at = now()
   WHERE id IN (
     SELECT id
       FROM public.notifications
      WHERE status = 'QUEUED'
         OR (status = 'SENDING' AND claimed_at < now() - interval '5 minutes')
         OR (status = 'FAILED' AND COALESCE(attempts, 0) < 5 AND (next_retry_at IS NULL OR next_retry_at <= now()))
      ORDER BY created_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_notifications(INT) TO authenticated, service_role, anon;

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='notifications' AND column_name='attempts'
  ), 'notifications.attempts must exist';
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='notifications' AND column_name='next_retry_at'
  ), 'notifications.next_retry_at must exist';
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='claim_notifications'
  ), 'claim_notifications RPC must exist';
  RAISE NOTICE '44_NOTIFICATION_RETRY applied: attempts/next_retry_at added, claim now includes FAILED with backoff';
END $$;
