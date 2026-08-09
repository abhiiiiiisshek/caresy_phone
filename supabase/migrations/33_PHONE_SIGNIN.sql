-- ============================================================================
-- Caresy — Migration 33: find_user_by_phone() for OTP sign-in
-- ----------------------------------------------------------------------------
-- Run AFTER 32_MERGE_DUPLICATE_PATIENTS.sql. Idempotent.
--
-- MSG91 OTP sign-in (apps/website/src/app/api/auth/phone) verifies a number,
-- then must land the caller on the SAME account they already have — otherwise
-- a customer who signed in with Google, gave us their number, and later used
-- OTP would get a second, empty account.
--
-- The route can't answer "who owns this number?" from PostgREST alone: the
-- number can live in `profiles.phone` (set during onboarding) OR in
-- `auth.users.phone` (set when we create an OTP-only account), and auth.users
-- isn't exposed to the API. This SECURITY DEFINER function checks both.
--
-- Format-agnostic on purpose: profiles stores `+919876543210`, GoTrue stores
-- `919876543210`, and either could arrive with spaces. We match on the last
-- ten digits — the national number — which is unambiguous within India (the
-- only service area). Oldest account wins, so the earliest identity is the one
-- everything else already points at.
--
-- SECURITY: this reads auth.users.phone, so it is NOT granted to anon or
-- authenticated — only service_role, which the phone route already uses. Never
-- expose it to the browser: it would turn any number into an account probe.
-- ============================================================================

CREATE OR REPLACE FUNCTION find_user_by_phone(p_phone TEXT)
RETURNS TABLE (id UUID, email TEXT) AS $$
DECLARE
    national TEXT := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
BEGIN
    -- A blank or too-short input must never match every row with a NULL phone.
    IF length(national) < 10 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT u.id, u.email::TEXT
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE right(regexp_replace(coalesce(u.phone, ''),    '\D', '', 'g'), 10) = national
       OR right(regexp_replace(coalesce(p.phone, ''),    '\D', '', 'g'), 10) = national
    ORDER BY u.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Least privilege: revoke the default PUBLIC execute, hand it only to the
-- service role the OTP route runs as.
REVOKE ALL ON FUNCTION find_user_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_user_by_phone(TEXT) TO service_role;
