-- ============================================================================
-- Caresy — Migration 19: Mark is_admin() STABLE (RLS performance)
-- ----------------------------------------------------------------------------
-- Run AFTER 18_BOOKING_TRIP_LINK.sql. Idempotent — safe to re-run.
--
-- is_admin() is called inside RLS policies (companions, admin_users, app_settings,
-- notifications, trips, realtime.messages, …). plpgsql functions default to
-- VOLATILE, which forces Postgres to re-run the function for EVERY row a policy
-- touches instead of caching one result per statement. On admin list/update
-- queries that made every action noticeably slow.
--
-- Marking it STABLE is correct — the function has no side effects and returns
-- the same value within a single statement (it only reads auth.uid() + the
-- admin_users / auth.users tables under the statement snapshot) — and lets the
-- planner evaluate it once per statement. Body is unchanged from migration 10.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      lower(u.email) IN (SELECT email FROM admin_users)
      OR u.email LIKE '%@caresy.co',
      FALSE
    )
    FROM auth.users u
    WHERE u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
