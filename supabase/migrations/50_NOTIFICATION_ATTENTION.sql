-- ============================================================================
-- 50_NOTIFICATION_ATTENTION.sql — per-entity attention state for Telegram
-- ----------------------------------------------------------------------------
-- Problem this closes: 44_NOTIFICATION_RETRY reclaims FAILED rows (FCM/ops
-- channel) on backoff, but send-push's fanoutTelegram() fired Telegram again
-- on every reclaim regardless of whether Telegram itself already delivered —
-- an FCM failure (no device token, common) meant the SAME Telegram message
-- resent every 5-60 min forever. That is the "still pending every few
-- minutes" flood. Root cause: no per-channel delivery memory, no per-entity
-- notify memory.
--
-- Fixes, additive only — 36/44's claim/retry logic is untouched:
--   1. notifications gains telegram_sent_at/telegram_message_id/telegram_chat_id
--      so a channel that already succeeded is never re-driven by another
--      channel's retry reclaim.
--   2. notification_attention: one open row per dedupe key (booking/patient),
--      tracks last notified status/time/tier/count and admin ack/snooze/
--      escalate/resolve state. resolve_notification_attention() is the single
--      decision point send-push calls before sending an IMMEDIATE Telegram
--      row or a stuck-booking escalation — real change, tier crossing, or
--      cooldown elapsed = send; same status inside cooldown/snooze = suppress.
--   3. apply_attention_action(): the write path for Telegram button presses
--      (Ack/Snooze/Escalate/Resolve), called from the new
--      /api/telegram/webhook route with the service-role key.
--   4. stuck_pending_bookings(): reuses bookings.expires_at (already set by
--      13_LIFECYCLE per booking_type) to find PENDING bookings past 50%/80%
--      of their own expiry window — no new config, no duplicate of
--      expire_stale_bookings' own 5-minute sweep.
--
-- INFORMATIONAL/BUFFERED events are untouched — they keep going straight to
-- notification_digest_buckets (49) exactly as before; attention only gates
-- CRITICAL/IMPORTANT immediate sends, which is what was flooding.
--
-- Idempotent. Never edit an applied migration — fix forward with a new file.
-- ============================================================================

-- 1. Per-channel delivery memory on the existing queue row.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS telegram_sent_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. Per-entity attention state.
CREATE TABLE IF NOT EXISTS public.notification_attention (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key            TEXT NOT NULL,
  entity_type           TEXT NOT NULL,                  -- BOOKING | PATIENT | NOTIFICATION
  current_status        TEXT NOT NULL,
  last_notified_status  TEXT,
  last_notified_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_id       BIGINT,
  last_chat_id          TEXT,
  notify_count          INT NOT NULL DEFAULT 0,
  tier                  INT NOT NULL DEFAULT 0,
  attention_score       INT NOT NULL DEFAULT 0,
  ack_state             TEXT NOT NULL DEFAULT 'NEW',     -- NEW|NOTIFIED|ACKED|SNOOZED|ESCALATED|RESOLVED
  acked_by              TEXT,
  acked_at              TIMESTAMPTZ,
  snoozed_until         TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One open (non-resolved) row per entity at a time — same "open bucket"
-- pattern as idx_digest_buckets_open_key (49). A resolved entity that acts up
-- again gets a fresh row: honest history, no reuse of a closed case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_attention_open_key
  ON public.notification_attention(dedupe_key) WHERE ack_state != 'RESOLVED';

CREATE INDEX IF NOT EXISTS idx_notification_attention_snoozed
  ON public.notification_attention(snoozed_until) WHERE ack_state = 'SNOOZED';

ALTER TABLE public.notification_attention ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read notification attention" ON public.notification_attention;
CREATE POLICY "Admins read notification attention" ON public.notification_attention
  FOR SELECT USING (is_admin());
-- No client write policy: writes only via the SECURITY DEFINER RPCs below,
-- called with the service-role key from send-push / the Telegram webhook —
-- same shape as notifications and notification_digest_buckets.

-- 3. The single send/suppress decision point.
-- p_forced_tier lets a time-based caller (stuck_pending_bookings) push the
-- tier up directly; event-based callers pass NULL and just track status.
CREATE OR REPLACE FUNCTION public.resolve_notification_attention(
  p_dedupe_key   TEXT,
  p_entity_type  TEXT,
  p_status       TEXT,
  p_priority     TEXT,
  p_forced_tier  INT DEFAULT NULL
) RETURNS TABLE(should_send BOOLEAN, attention_id UUID, tier INT, notify_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row          public.notification_attention;
  v_cooldown     INTERVAL;
  v_new_tier     INT;
  v_is_critical  BOOLEAN;
  v_status_chg   BOOLEAN;
  v_tier_up      BOOLEAN;
  v_is_snoozed   BOOLEAN;
  v_should       BOOLEAN;
BEGIN
  v_cooldown := CASE p_priority
    WHEN 'CRITICAL' THEN INTERVAL '0 minutes'
    WHEN 'IMPORTANT' THEN INTERVAL '10 minutes'
    ELSE INTERVAL '5 minutes'
  END;

  SELECT * INTO v_row
    FROM public.notification_attention
   WHERE dedupe_key = p_dedupe_key AND ack_state != 'RESOLVED'
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.notification_attention
      (dedupe_key, entity_type, current_status, last_notified_status, last_notified_at, notify_count, tier, attention_score, ack_state)
    VALUES
      (p_dedupe_key, p_entity_type, p_status, p_status, now(), 1, COALESCE(p_forced_tier, 0), 1, 'NOTIFIED')
    RETURNING * INTO v_row;

    RETURN QUERY SELECT true, v_row.id, v_row.tier, v_row.notify_count;
    RETURN;
  END IF;

  v_new_tier    := GREATEST(v_row.tier, COALESCE(p_forced_tier, v_row.tier));
  v_is_critical := (p_priority = 'CRITICAL');
  v_status_chg  := (p_status IS DISTINCT FROM v_row.last_notified_status);
  v_tier_up     := (v_new_tier > v_row.tier);
  v_is_snoozed  := (v_row.ack_state = 'SNOOZED' AND v_row.snoozed_until > now());

  -- Real news (status changed / tier crossed) or CRITICAL always breaks
  -- through; otherwise only once cooldown has elapsed, and never while
  -- snoozed on stale news.
  v_should := v_is_critical OR v_status_chg OR v_tier_up
    OR (NOT v_is_snoozed AND (now() - v_row.last_notified_at) >= v_cooldown);

  UPDATE public.notification_attention
     SET current_status       = p_status,
         tier                 = v_new_tier,
         attention_score      = attention_score + (v_new_tier - v_row.tier) + (CASE WHEN v_should THEN 1 ELSE 0 END),
         notify_count         = notify_count + (CASE WHEN v_should THEN 1 ELSE 0 END),
         last_notified_status = CASE WHEN v_should THEN p_status ELSE last_notified_status END,
         last_notified_at     = CASE WHEN v_should THEN now() ELSE last_notified_at END,
         ack_state            = CASE WHEN v_should AND ack_state = 'ACKED' THEN 'NOTIFIED' ELSE ack_state END,
         updated_at           = now()
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  RETURN QUERY SELECT v_should, v_row.id, v_row.tier, v_row.notify_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_notification_attention(TEXT, TEXT, TEXT, TEXT, INT) TO service_role;

-- 4. Telegram button write path (Ack/Snooze/Escalate/Resolve).
CREATE OR REPLACE FUNCTION public.apply_attention_action(
  p_attention_id    UUID,
  p_action          TEXT,
  p_actor           TEXT,
  p_snooze_minutes  INT DEFAULT 30
) RETURNS public.notification_attention
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.notification_attention;
BEGIN
  UPDATE public.notification_attention
     SET ack_state      = CASE p_action
                             WHEN 'ACK' THEN 'ACKED'
                             WHEN 'SNOOZE' THEN 'SNOOZED'
                             WHEN 'ESCALATE' THEN 'ESCALATED'
                             WHEN 'RESOLVE' THEN 'RESOLVED'
                             ELSE ack_state
                           END,
         acked_by       = CASE WHEN p_action = 'ACK' THEN p_actor ELSE acked_by END,
         acked_at       = CASE WHEN p_action = 'ACK' THEN now() ELSE acked_at END,
         snoozed_until  = CASE WHEN p_action = 'SNOOZE' THEN now() + (p_snooze_minutes || ' minutes')::INTERVAL ELSE snoozed_until END,
         resolved_at    = CASE WHEN p_action = 'RESOLVE' THEN now() ELSE resolved_at END,
         tier           = CASE WHEN p_action = 'ESCALATE' THEN tier + 1 ELSE tier END,
         updated_at     = now()
   WHERE id = p_attention_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_attention_action(UUID, TEXT, TEXT, INT) TO service_role;

-- 5. Time-based stuck-PENDING candidates, reusing bookings.expires_at.
CREATE OR REPLACE FUNCTION public.stuck_pending_bookings()
RETURNS TABLE(
  booking_id       UUID,
  reference_code   TEXT,
  service_type     TEXT,
  created_at       TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  elapsed_fraction NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, reference_code, service_type, created_at, expires_at,
         CASE WHEN expires_at IS NULL OR expires_at <= created_at THEN 0
              ELSE LEAST(1, GREATEST(0,
                EXTRACT(EPOCH FROM (now() - created_at)) / EXTRACT(EPOCH FROM (expires_at - created_at))
              ))
         END AS elapsed_fraction
    FROM public.bookings
   WHERE status = 'PENDING'
     AND deleted_at IS NULL
     AND expires_at IS NOT NULL
     AND expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.stuck_pending_bookings() TO service_role;

-- Sanity asserts (like prior migrations)
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='notifications' AND column_name='telegram_sent_at'
  ), 'notifications.telegram_sent_at must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='notification_attention'
  ), 'notification_attention must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='resolve_notification_attention'
  ), 'resolve_notification_attention RPC must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='apply_attention_action'
  ), 'apply_attention_action RPC must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='stuck_pending_bookings'
  ), 'stuck_pending_bookings RPC must exist';

  RAISE NOTICE '50_NOTIFICATION_ATTENTION applied: attention table + resolve/apply/stuck RPCs ready';
END $$;
