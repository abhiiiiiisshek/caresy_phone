-- 52_FARE_REFERENCE_RLS.sql
--
-- `transport_fare_reference` (migration 27) was meant to be admin-only. It is
-- not: with the anon key alone, which every published build of the website and
-- both apps carries, this returns rows.
--
--   curl "$SUPABASE_URL/rest/v1/transport_fare_reference?select=*" \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
--   [{"provider":"UBER","drop_label":"…","avg_fare_paise":29000, …}]
--
-- Two reasons, both quiet:
--   • `REVOKE ALL … FROM PUBLIC` does not touch a grant held by the `anon`
--     role itself, and Supabase's default privileges on schema `public` hand
--     `anon` and `authenticated` SELECT on every new object.
--   • A view runs as its owner unless told otherwise, so row level security on
--     `booking_transport` never applied to reads through it.
--
-- Fix forward: make the view run as the caller. The existing "Booking parties
-- read transport" policy then does the work it was already written to do —
-- admins see every fare, a customer sees only rides on their own bookings, and
-- a signed-out caller sees nothing. No policy is added and no admin-facing
-- query changes: /admin/analytics and the admin app's Analytics screen read
-- this view as an admin and keep seeing everything.
ALTER VIEW public.transport_fare_reference SET (security_invoker = on);

REVOKE ALL ON public.transport_fare_reference FROM anon;
GRANT SELECT ON public.transport_fare_reference TO authenticated;

-- Sanity: the view must no longer be readable by an unauthenticated caller.
DO $$
BEGIN
    ASSERT NOT has_table_privilege('anon', 'public.transport_fare_reference', 'SELECT'),
        'anon can still read transport_fare_reference';
END $$;
