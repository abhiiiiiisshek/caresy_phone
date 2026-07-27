-- Caresy: make the notifications queue debuggable once something drains it
--
-- 13_LIFECYCLE created `notifications` with status QUEUED | SENT | FAILED and
-- nothing to explain a failure. A push that silently fails is worse than one
-- that never sends, so record when it went and why it did not.
--
-- Idempotent: safe to re-run.

-- sent_at already exists from migration 20; only the failure reason is new.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS error TEXT;

-- The sender claims work with `status = 'QUEUED' ORDER BY created_at`. The
-- existing idx_notifications_status is a partial index on status alone; adding
-- created_at keeps the claim query from sorting.
CREATE INDEX IF NOT EXISTS idx_notifications_queued_oldest
    ON notifications(created_at) WHERE status = 'QUEUED';
