-- ============================================================================
-- 46_PICKUP_PRECISION.sql — scope the companion's pickup read to the job
-- ----------------------------------------------------------------------------
-- The open-jobs feed and an accepted job need different things from a pickup.
--
-- A companion browsing the feed is deciding whether to take the work: hospital,
-- area, time, pay. They do not need the meeting point itself. The companion who
-- took the job needs the opposite — the exact spot to walk to, down to which
-- gate on the campus, which is what locations.latitude / longitude are for.
--
-- "Companions read job locations" (13_LIFECYCLE.sql) did not draw that line. It
-- granted SELECT on the locations row for open jobs as well as assigned ones,
-- and RLS is row-level, so that is every column — address_line_1 and the
-- coordinates included. This narrows it to the assigned companion and gives the
-- feed a reader shaped like what the feed actually renders.
--
-- Why an RPC rather than a second policy: the same reasoning as
-- 22_PUBLIC_TRACKING.sql / ADR-0007. RLS decides rows, not columns, so any
-- policy that shows a browsing companion the row shows them all of it.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The companion read on locations covers the job they hold
-- ----------------------------------------------------------------------------
-- Supersedes the policy of the same name in 13_LIFECYCLE.sql. Admins are
-- unaffected (they read through their own policies), and the customer keeps the
-- owner policy from SUPABASE_SCHEMA.sql.
DROP POLICY IF EXISTS "Companions read job locations" ON locations;
CREATE POLICY "Companions read job locations"
    ON locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.pickup_location_id = locations.id
              AND b.companion_user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM companions c
            WHERE c.id = auth.uid() AND c.approval_status = 'APPROVED'
        )
    );


-- ----------------------------------------------------------------------------
-- 2. Coarse pickup for the open-jobs feed
-- ----------------------------------------------------------------------------
-- One row per open job the caller may see, carrying only what the feed card
-- draws. No address_line_1, no coordinates — those arrive with the job.
--
-- Keyed by booking_id rather than location_id so the caller can join it onto the
-- rows it already fetched without a second lookup.
CREATE OR REPLACE FUNCTION public.open_job_pickups()
RETURNS TABLE (
    booking_id UUID,
    title      TEXT,
    pincode    TEXT,
    city       TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT b.id, l.title, l.pincode, l.city
      FROM bookings b
      JOIN locations l ON l.id = b.pickup_location_id
     WHERE b.status = 'PENDING'
       AND b.companion_user_id IS NULL
       AND b.deleted_at IS NULL
       -- Same gate the old policy carried: only an approved companion browses
       -- the feed.
       AND EXISTS (
           SELECT 1 FROM companions c
           WHERE c.id = auth.uid() AND c.approval_status = 'APPROVED'
       );
$$;

REVOKE ALL ON FUNCTION public.open_job_pickups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_job_pickups() TO authenticated;
