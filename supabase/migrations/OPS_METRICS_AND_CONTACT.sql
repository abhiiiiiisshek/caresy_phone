-- Caresy: Ops Metrics + Contact Messages
--
-- Run this in the Supabase SQL editor for the project after SUPABASE_SCHEMA.sql
-- has already been applied (this file assumes `is_admin()` already exists there).
--
-- Idempotent: safe to re-run.

-- =====================================================================
-- 1. ops_metrics — singleton row backing the "Live Operations Desk"
--    widget shown on /booking, /quick-help, and /trust. Replaces the
--    previous client-side Math.random placeholder with real,
--    admin-editable numbers (edited from /admin-ops).
-- =====================================================================
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
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_ops_metrics ON ops_metrics;
CREATE TRIGGER set_timestamp_ops_metrics
BEFORE UPDATE ON ops_metrics
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- =====================================================================
-- 2. contact_messages — real backing for the /contact page form
--    (previously just showed an alert() and discarded the input).
-- =====================================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a contact message" ON contact_messages;
CREATE POLICY "Anyone can submit a contact message"
    ON contact_messages FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
CREATE POLICY "Admins can view contact messages"
    ON contact_messages FOR SELECT
    USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);
