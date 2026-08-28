-- 43_FIX_IS_ADMIN_NULL.sql
-- Fix forward: is_admin() returned NULL (not FALSE) for anonymous callers, so
-- every `IF NOT is_admin() THEN RAISE` guard silently failed open.
--
-- Found 2026-08-29 by calling admin_save_booking_edit, admin_override_booking_status
-- and reassign_booking over PostgREST with only the publishable anon key. All three
-- got past the admin guard and failed later, at "Booking not found" — proving the
-- guard never fired.
--
-- Why: in 34_SECURITY_HARDENING.sql the COALESCE sat INSIDE the scalar subquery.
-- For an anonymous session auth.uid() is NULL, so `WHERE u.id = auth.uid()` matches
-- no row, the COALESCE never runs, and the subquery yields NULL. In plpgsql
-- `IF NOT NULL THEN` is not taken, so the RAISE was skipped.
--
-- Logged-in non-admins were never affected: their auth.users row exists, COALESCE
-- returns FALSE, the guard fires. RLS policies using is_admin() were also unaffected
-- (a NULL in USING denies, which is the safe direction).

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- COALESCE wraps the whole subquery, so "no such user" is FALSE, never NULL.
  RETURN COALESCE(
    (
      SELECT lower(u.email) IN (SELECT email FROM admin_users)
          OR u.email LIKE '%@caresy.co'
      FROM auth.users u
      WHERE u.id = auth.uid()
    ),
    FALSE
  );
END;
$$;

-- Defense in depth: these are admin-only entry points, so the anon role has no
-- business holding EXECUTE even with the guard fixed.
REVOKE EXECUTE ON FUNCTION public.admin_save_booking_edit(UUID, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_override_booking_status(UUID, booking_status_enum, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reassign_booking(UUID, UUID, TEXT) FROM anon;

-- Assertions. The SQL editor runs with no JWT, so auth.uid() is NULL here — the
-- exact condition that was broken.
DO $$
BEGIN
  IF is_admin() IS NULL THEN
    RAISE EXCEPTION 'is_admin() still returns NULL for a session with no auth.uid()';
  END IF;
  IF is_admin() IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'is_admin() must be FALSE for a session with no auth.uid(), got %', is_admin();
  END IF;
  RAISE NOTICE '43_FIX_IS_ADMIN_NULL applied: is_admin() = % for anonymous', is_admin();
END $$;
