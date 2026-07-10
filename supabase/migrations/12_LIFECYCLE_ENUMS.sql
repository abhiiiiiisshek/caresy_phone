-- ============================================================================
-- Caresy — Migration 12: Lifecycle enum values
-- ----------------------------------------------------------------------------
-- Run this FIRST, on its own, before 13_LIFECYCLE.sql.
--
-- Postgres requires a new enum value to be committed before it can be used by
-- other statements, so these two lines live in their own migration. If your SQL
-- editor complains, run them one at a time. Idempotent (IF NOT EXISTS).
--
--   PENDING  → ACCEPTED (a companion accepted)  → IN_PROGRESS → COMPLETED
--   PENDING  → EXPIRED  (auto-timeout, no companion accepted)
-- ============================================================================

ALTER TYPE booking_status_enum ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE booking_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';

-- After running this, run 13_LIFECYCLE.sql.
