-- ============================================================================
-- Caresy — Migration 15: admin_list_users() RPC
-- ----------------------------------------------------------------------------
-- Run AFTER 14_SCHEDULER.sql. Idempotent.
--
-- Backs the /admin/users page (DEVELOPER_HANDOFF.md §6-C). `profiles` has no
-- email column — email lives in auth.users, which anon/authenticated can't
-- read directly. This SECURITY DEFINER function joins profiles + auth.users
-- + a booking count, admin-gated, mirroring the is_admin() pattern used
-- elsewhere in this schema.
--
-- Excludes companion accounts (auth.users rows that also have a `companions`
-- row) — those are already listed at /admin/companions.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
    id                    UUID,
    email                 TEXT,
    full_name             TEXT,
    age                   INTEGER,
    phone                 TEXT,
    onboarding_completed  BOOLEAN,
    created_at            TIMESTAMPTZ,
    booking_count         BIGINT
) AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email::TEXT,
        p.full_name,
        p.age,
        p.phone,
        COALESCE(p.onboarding_completed, FALSE),
        u.created_at,
        COUNT(b.id) AS booking_count
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN bookings b ON b.customer_user_id = u.id AND b.deleted_at IS NULL
    WHERE NOT EXISTS (SELECT 1 FROM companions c WHERE c.id = u.id)
    GROUP BY u.id, u.email, p.full_name, p.age, p.phone, p.onboarding_completed, u.created_at
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;
