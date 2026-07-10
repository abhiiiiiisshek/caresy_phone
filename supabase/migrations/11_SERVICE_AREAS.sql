-- ============================================================================
-- Caresy — Migration 11: Service areas (pincode-based coverage)
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER SUPABASE_SCHEMA.sql. Idempotent.
--
-- Replaces the hardcoded client-side "does the text say Noida?" check with a
-- database-driven allowlist of served pincodes that ops can edit any time
-- (via the admin panel) — no code change or redeploy needed.
--
-- Provides:
--   • service_areas          — the editable allowlist of served pincodes.
--   • is_pincode_served(text)  — helper used by the app and the booking guard.
--   • enforce_service_area()  — trigger that REJECTS a booking whose pickup
--                              location pincode is not served.
--
-- Polygon / GPS geofencing is intentionally deferred; pincodes cover the whole
-- of Noida + Greater Noida correctly and are trivial to maintain.
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_areas (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pincode    TEXT NOT NULL UNIQUE,
    area_name  TEXT,                       -- human label, e.g. "Greater Noida West"
    city       TEXT NOT NULL DEFAULT 'Noida',
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Noida + Greater Noida (including Greater Noida West / Gaur City, the
-- case that was previously mis-flagged as out of area). VERIFY + EXTEND this
-- list for your exact coverage — that's the whole point of it being data.
INSERT INTO service_areas (pincode, area_name, city) VALUES
    ('201301', 'Noida (Sectors 1–18)',        'Noida'),
    ('201303', 'Noida',                        'Noida'),
    ('201304', 'Noida',                        'Noida'),
    ('201305', 'Noida / Noida Extension',      'Noida'),
    ('201307', 'Noida',                        'Noida'),
    ('201309', 'Noida',                        'Noida'),
    ('201312', 'Noida',                        'Noida'),
    ('201313', 'Noida (Sector 62 area)',       'Noida'),
    ('201306', 'Greater Noida West',           'Greater Noida'),
    ('201308', 'Greater Noida',                'Greater Noida'),
    ('201310', 'Greater Noida',                'Greater Noida'),
    ('201314', 'Greater Noida West',           'Greater Noida'),
    ('201318', 'Greater Noida West',           'Greater Noida'),
    ('203207', 'Greater Noida (Kasna)',        'Greater Noida'),
    ('201009', 'Gaur City / Greater Noida West','Greater Noida')
ON CONFLICT (pincode) DO NOTHING;

-- Anyone may read the served-area list (needed for client-side validation);
-- only admins may change it.
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read service areas" ON service_areas;
CREATE POLICY "Anyone can read service areas"
    ON service_areas FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins manage service areas" ON service_areas;
CREATE POLICY "Admins manage service areas"
    ON service_areas FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- Helper: is a given pincode currently served? NULL / unknown -> not served.
CREATE OR REPLACE FUNCTION is_pincode_served(p TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF p IS NULL OR trim(p) = '' THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM service_areas
        WHERE pincode = trim(p) AND is_active
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Guard: reject a booking whose pickup location is outside the served area.
-- Authoritative server-side check — a client that skips validation still can't
-- create an out-of-area booking.
CREATE OR REPLACE FUNCTION enforce_service_area()
RETURNS TRIGGER AS $$
DECLARE
    loc_pincode TEXT;
BEGIN
    IF NEW.status = 'DRAFT' THEN
        RETURN NEW;   -- drafts aren't submitted requests yet
    END IF;

    SELECT pincode INTO loc_pincode FROM locations WHERE id = NEW.pickup_location_id;

    IF NOT is_pincode_served(loc_pincode) THEN
        RAISE EXCEPTION 'Caresy does not yet serve pincode %. We currently operate in Noida & Greater Noida.',
            COALESCE(loc_pincode, 'unknown')
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_service_area ON bookings;
CREATE TRIGGER trg_enforce_service_area
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE PROCEDURE enforce_service_area();

-- ============================================================================
-- End of migration 11.
-- ============================================================================
