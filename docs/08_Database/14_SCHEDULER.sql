-- ============================================================================
-- Caresy — Migration 14: Schedule the expiry sweep with pg_cron
-- ----------------------------------------------------------------------------
-- Run AFTER 13_LIFECYCLE.sql. Idempotent — safe to re-run.
--
-- Wires up automatic execution of expire_stale_bookings() (defined in
-- migration 13) every 5 minutes, so PENDING requests stop getting stuck
-- forever (owner concern #1 in DEVELOPER_HANDOFF.md).
--
-- Requires: the pg_cron extension available in your Supabase project
-- (available on all plans; some older projects may need it enabled via
-- Dashboard → Database → Extensions → pg_cron instead of the CREATE
-- EXTENSION statement below — if that statement errors with a permission
-- error, use the dashboard toggle then re-run this file).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Re-scheduling with the same job name errors in pg_cron, so unschedule any
-- existing job first to keep this file idempotent.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-bookings') THEN
        PERFORM cron.unschedule('expire-stale-bookings');
    END IF;
END $$;

SELECT cron.schedule(
    'expire-stale-bookings',
    '*/5 * * * *',
    $$ SELECT expire_stale_bookings(); $$
);

-- Verify: should return one row with the schedule above.
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'expire-stale-bookings';

-- To check it's actually firing (run a few minutes after scheduling):
-- SELECT jobid, status, start_time, end_time, return_message
--   FROM cron.job_run_details
--  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-stale-bookings')
--  ORDER BY start_time DESC LIMIT 5;
