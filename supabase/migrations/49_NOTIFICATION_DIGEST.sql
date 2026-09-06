-- ============================================================================
-- 49_NOTIFICATION_DIGEST.sql — buffer for INFORMATIONAL Telegram events
-- ----------------------------------------------------------------------------
-- Phase 1 of the Telegram redesign (was: every notifications row mirrored
-- 1:1 to Telegram — five status transitions on one booking meant five pings,
-- so admins couldn't tell "act now" from "already handled").
--
-- apps/website/src/lib/notificationPolicy.ts now classifies each event as
-- CRITICAL/IMPORTANT (send now, unchanged) or INFORMATIONAL (buffer, send
-- one digest per window). This table holds the buffer.
--
-- Design: a buffered notification row's own `status` is untouched by this —
-- it still finalizes through its existing path (FCM / ops-webhook) on the
-- same tick it's claimed, exactly as before. This table is a pure
-- side-channel accumulator of ids for later digest rendering, so buffering
-- never interacts with claim_notifications()'s 5-minute stale-SENDING
-- reclaim (36/44) — nothing is ever left mid-claim waiting on a window.
--
-- append_to_digest_bucket() is SECURITY DEFINER + a partial unique index
-- doing the atomic "append or open a new bucket" work, same technique
-- claim_notifications() already uses — not a new pattern.
--
-- Idempotent. Never edit an applied migration — fix forward with a new file.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_digest_buckets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregation_key  TEXT NOT NULL,
  recipient_role   TEXT,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_ids UUID[] NOT NULL DEFAULT '{}',
  flushed_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One open bucket per key at a time. This is also the ON CONFLICT target
-- append_to_digest_bucket() relies on for atomic append-or-create.
CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_buckets_open_key
  ON public.notification_digest_buckets(aggregation_key) WHERE flushed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_digest_buckets_due
  ON public.notification_digest_buckets(first_seen_at) WHERE flushed_at IS NULL;

ALTER TABLE public.notification_digest_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read digest buckets" ON public.notification_digest_buckets;
CREATE POLICY "Admins read digest buckets" ON public.notification_digest_buckets
  FOR SELECT USING (is_admin());
-- No INSERT/UPDATE policy for authenticated/anon: writes only happen via the
-- SECURITY DEFINER RPC below (called with the service-role key from the
-- send-push cron), the same shape notifications itself uses (no client-side
-- INSERT policy there either).

CREATE OR REPLACE FUNCTION public.append_to_digest_bucket(p_key TEXT, p_role TEXT, p_ids UUID[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notification_digest_buckets (aggregation_key, recipient_role, notification_ids)
  VALUES (p_key, p_role, p_ids)
  ON CONFLICT (aggregation_key) WHERE flushed_at IS NULL
  DO UPDATE SET notification_ids = public.notification_digest_buckets.notification_ids || EXCLUDED.notification_ids
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_to_digest_bucket(TEXT, TEXT, UUID[]) TO authenticated, service_role, anon;

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'notification_digest_buckets'
  ), 'notification_digest_buckets must exist';
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'append_to_digest_bucket'
  ), 'append_to_digest_bucket RPC must exist';
  RAISE NOTICE '49_NOTIFICATION_DIGEST applied: notification_digest_buckets + append_to_digest_bucket() ready';
END $$;
