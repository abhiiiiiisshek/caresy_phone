-- ============================================================================
-- 29. Let the audit trigger actually write
-- ============================================================================
-- Assigning a companion failed with
--   new row violates row-level security policy for table "audit_logs"
-- and took the whole UPDATE down with it, so no booking could be assigned,
-- accepted, or have its status moved from the dispatch board.
--
-- Two things in SUPABASE_SCHEMA.sql combine into a deadlock:
--
--   1. audit_logs has RLS enabled with exactly one policy, "Admins can view
--      audit logs" (SELECT). There is no INSERT policy, so under RLS nobody
--      may insert - not even an admin.
--   2. trigger_audit_bookings() is plain `LANGUAGE plpgsql` with no
--      SECURITY DEFINER, so it executes as the signed-in user and is subject
--      to that same RLS.
--
-- Every UPDATE on bookings fires the AFTER trigger, the insert is refused, and
-- because a trigger failure aborts the statement, the booking update dies with
-- it. The audit log was not merely missing rows - it was blocking dispatch.
--
-- The fix is SECURITY DEFINER, matching enqueue_booking_notification() in
-- 13_LIFECYCLE.sql, which does the same job on the same table and works
-- precisely because it has it.
--
-- Deliberately NOT fixed by adding an INSERT policy. `WITH CHECK (true)` would
-- unblock the trigger and simultaneously let any authenticated session write
-- arbitrary rows straight into the audit log - forged actors, forged history.
-- An audit trail anyone can author is worse than none, because it is believed.
-- SECURITY DEFINER keeps the only writer the trigger itself.
--
-- Idempotent: safe to re-run.

-- Body is unchanged from SUPABASE_SCHEMA.sql. Only the three lines after the
-- closing $$ differ, plus the pinned search_path that every SECURITY DEFINER
-- function here carries so it cannot be hijacked by a caller-set path.
CREATE OR REPLACE FUNCTION public.trigger_audit_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, actor_id)
        VALUES ('bookings', OLD.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, actor_id)
        VALUES ('bookings', OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- The trigger itself was never the problem, but re-attach it so a project that
-- somehow lost it ends up in the same state as one that did not.
DROP TRIGGER IF EXISTS audit_bookings_changes ON bookings;
CREATE TRIGGER audit_bookings_changes
    AFTER UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_bookings();

-- ---------------------------------------------------------------------------
-- Check: fail loudly here rather than the next time someone assigns a job.
-- ---------------------------------------------------------------------------
-- Written with RAISE EXCEPTION over ASSERT, and with no local variables: the
-- first draft used `ASSERT v_secdef` and the Supabase SQL editor rejected it
-- with 42P01 relation "v_secdef" does not exist. A catalog EXISTS test needs
-- neither, and the tag is $check$ rather than $$ so it can never collide with
-- the function body's own quoting above.
DO $check$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname = 'trigger_audit_bookings'
           AND p.prosecdef
    ) THEN
        RAISE EXCEPTION
            'trigger_audit_bookings is not SECURITY DEFINER - dispatch will stay broken';
    END IF;

    -- Guards the tempting "just add a policy" regression: if an INSERT policy
    -- ever appears on audit_logs, someone has made the log forgeable.
    IF EXISTS (
        SELECT 1
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'audit_logs'
           AND cmd IN ('INSERT', 'ALL')
    ) THEN
        RAISE EXCEPTION
            'audit_logs has an INSERT policy - the trigger does not need one and it makes the log forgeable';
    END IF;
END $check$;
