-- ============================================================================
-- 36_NOTIFICATIONS_CLAIM.sql — Exactly-once claim-before-send for notifications
-- ----------------------------------------------------------------------------
-- Closes CARESY-4: two concurrent send-push ticks could SELECT the same
-- QUEUED rows before either UPDATE landed, so FCM + Telegram + ops each
-- fired twice even though only one DB status update stuck.
--
-- Status column type check (13_LIFECYCLE.sql / 20 / 24):
--   13_LIFECYCLE.sql defines `status TEXT NOT NULL DEFAULT 'QUEUED'`
--   (comment: QUEUED | SENT | FAILED) — free TEXT, no CHECK, no enum.
--   So adding 'SENDING' needs NO DDL on the column itself. If it were a CHECK
--   or enum, we would ALTER it here. Flag: status is free TEXT (assumed).
--
-- Adds:
--   1. claimed_at timestamptz — when the row was claimed into SENDING
--   2. RPC claim_notifications(p_limit int) — atomically claims QUEUED (+ stale
--      SENDING) rows using FOR UPDATE SKIP LOCKED so concurrent ticks claim
--      DISJOINT sets, then RETURNING * for the cron to send.
--   3. Stale reclaim: rows stuck in SENDING older than 5 min (crash mid-send)
--      are eligible for re-claim in the same SELECT via
--      `OR (status='SENDING' AND claimed_at < now()-'5 minutes')`.
--   4. Index helper for the claim query is the existing
--      idx_notifications_queued_oldest (24) on created_at WHERE status='QUEUED'
--      plus a new partial index covering SENDING for stale reclaim.
--
-- Human must apply: psql / Supabase SQL editor → run this file.
-- ============================================================================

-- 1. claimed_at — when a row entered SENDING
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Help the claim query's ORDER BY / stale filter (optional, low cost)
CREATE INDEX IF NOT EXISTS idx_notifications_sending_claimed
  ON public.notifications(claimed_at)
  WHERE status = 'SENDING';

-- 2. RPC: atomically claim up to p_limit rows into SENDING
-- Usage from the cron (TypeScript):
--   const { data: rows } = await supabase.rpc('claim_notifications', { p_limit: 200 })
-- Rows are now SENDING, so a concurrent tick's SELECT ... FOR UPDATE SKIP LOCKED
-- will skip them and claim a disjoint set. Exactly-once per claim, no double-send.
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
      ORDER BY created_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_notifications(INT) TO authenticated, service_role, anon;

-- Sanity asserts (like prior migrations)
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='notifications' AND column_name='claimed_at'
  ), 'notifications.claimed_at must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='claim_notifications'
  ), 'claim_notifications RPC must exist';

  -- status column is free TEXT (no CHECK/enum to extend) — document assumption
  ASSERT (
    SELECT data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='notifications' AND column_name='status'
  ) = 'text', 'notifications.status is expected to be TEXT (free); if CHECK/enum, extend it to allow SENDING';
END $$;
