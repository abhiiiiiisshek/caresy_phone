-- ----------------------------------------------------------------------------
-- 20_NOTIFICATION_DELIVERY.sql
-- Lets admins drain the notifications queue from the admin outbox: mark a row
-- SENT (or FAILED) after delivering it, and record when. Delivery itself is
-- manual for now (WhatsApp click-to-chat from the admin page); this migration
-- only adds the write path so the queue can actually be worked down.
-- Run manually in the Supabase SQL editor, like the other migrations.
-- ----------------------------------------------------------------------------

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Admins update notifications" ON notifications;
CREATE POLICY "Admins update notifications"
    ON notifications FOR UPDATE TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());
