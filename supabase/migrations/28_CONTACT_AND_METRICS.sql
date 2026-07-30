-- ============================================================================
-- 28. contact_messages + ops_metrics
-- ============================================================================
-- These were written as OPS_METRICS_AND_CONTACT.sql, which has no number, so it
-- never got run against the live project. Sending a message from /support fails
-- with PGRST205 "Could not find the table 'public.contact_messages'", and the
-- live-operations widget on /booking and /quick-help silently reads nothing.
--
-- Renumbered here so it runs in sequence like everything else. The unnumbered
-- file is superseded; this one is the version to keep.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. ops_metrics — the singleton behind the "Live Operations Desk" widget
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops_metrics (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    active_companions INTEGER NOT NULL DEFAULT 6,
    avg_callback_minutes INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ops_metrics_singleton CHECK (id = 1)
);

INSERT INTO ops_metrics (id, active_companions, avg_callback_minutes)
VALUES (1, 6, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE ops_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ops metrics" ON ops_metrics;
CREATE POLICY "Anyone can read ops metrics"
    ON ops_metrics FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can update ops metrics" ON ops_metrics;
CREATE POLICY "Admins can update ops metrics"
    ON ops_metrics FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_timestamp_ops_metrics ON ops_metrics;
CREATE TRIGGER set_timestamp_ops_metrics
BEFORE UPDATE ON ops_metrics
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ---------------------------------------------------------------------------
-- 2. contact_messages — real backing for the /support form
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    -- Set when the sender happened to be signed in, so support can open the
    -- account rather than matching on a phone number typed by hand.
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    handled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columns added after the original file was written, for projects that ran it.
ALTER TABLE contact_messages
    ADD COLUMN IF NOT EXISTS user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

-- Length bounds, because this table is insertable by anyone on the internet.
-- Without them the form is an open write endpoint that accepts megabytes.
DO $$ BEGIN
    ALTER TABLE contact_messages ADD CONSTRAINT chk_contact_lengths CHECK (
        length(name) BETWEEN 1 AND 120
        AND length(phone) BETWEEN 6 AND 20
        AND length(message) BETWEEN 1 AND 4000
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anonymous insert is intentional: someone whose booking is going wrong may not
-- be signed in, and that is exactly when they need to reach support.
DROP POLICY IF EXISTS "Anyone can submit a contact message" ON contact_messages;
CREATE POLICY "Anyone can submit a contact message"
    ON contact_messages FOR INSERT
    WITH CHECK (true);

-- Read stays admin-only. These messages carry names and phone numbers.
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
CREATE POLICY "Admins can view contact messages"
    ON contact_messages FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update contact messages" ON contact_messages;
CREATE POLICY "Admins can update contact messages"
    ON contact_messages FOR UPDATE
    USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_unhandled
    ON contact_messages(created_at DESC) WHERE handled_at IS NULL;
