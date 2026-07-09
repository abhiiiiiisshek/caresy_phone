-- ============================================================================
-- Caresy — Migration 10: Admin allowlist + Companions + KYC documents
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor AFTER SUPABASE_SCHEMA.sql and
-- PROFILES_TABLE.sql. Idempotent: safe to re-run.
--
-- This is the foundation for:
--   • Phase 1 — Admin panel  (approve/suspend companions, assign bookings)
--   • Phase 2 — Companion portal (register -> KYC -> approval -> jobs)
--
-- What it creates:
--   1. admin_users        — editable admin allowlist (replaces the hardcoded
--                           "@caresy.co" rule) and a rewritten is_admin().
--   2. companions          — a companion account row (1:1 with auth.users),
--                           with KYC + approval + availability state.
--   3. companion_documents — uploaded KYC files (Aadhaar, police cert, etc.).
--   4. RLS policies + a guard so companions cannot self-approve.
--
-- MANUAL STEP (once, in the Supabase dashboard): create a PRIVATE Storage
-- bucket named `companion-docs` for KYC uploads. Storage RLS policies for it
-- are included at the bottom of this file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ADMIN ALLOWLIST
-- ----------------------------------------------------------------------------
-- An editable table of admin emails so you can grant/revoke admin access from
-- data (or the admin panel) instead of changing code + redeploying.

CREATE TABLE IF NOT EXISTS admin_users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL UNIQUE,
    note       TEXT,                       -- e.g. "Founder", "Ops lead"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalise emails to lowercase so lookups are case-insensitive.
CREATE OR REPLACE FUNCTION lc_admin_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email = lower(trim(NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lc_admin_email ON admin_users;
CREATE TRIGGER trg_lc_admin_email
BEFORE INSERT OR UPDATE ON admin_users
FOR EACH ROW EXECUTE PROCEDURE lc_admin_email();

-- Seed the first admin. Change/add rows here or via the admin panel later.
INSERT INTO admin_users (email, note)
VALUES ('checkgovt@gmail.com', 'Initial admin — seeded by migration 10')
ON CONFLICT (email) DO NOTHING;

-- Rewrite is_admin() to check the allowlist. The legacy "@caresy.co" domain
-- rule is kept as a fallback so nothing that already relies on it breaks.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see or edit the admin list.
DROP POLICY IF EXISTS "Admins manage admin list" ON admin_users;
CREATE POLICY "Admins manage admin list"
    ON admin_users FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ----------------------------------------------------------------------------
-- 2. COMPANIONS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE companion_status_enum AS ENUM (
        'PENDING_REVIEW',   -- Registered, KYC submitted, awaiting admin decision
        'APPROVED',         -- Cleared to receive and accept jobs
        'REJECTED',         -- Application declined
        'SUSPENDED'         -- Previously approved, temporarily blocked
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS companions (
    -- A companion IS a user account; id mirrors auth.users(id).
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile
    full_name         TEXT NOT NULL,
    phone             TEXT,
    email             TEXT,
    photo_url         TEXT,
    date_of_birth     DATE,
    gender            TEXT,
    bio               TEXT,
    languages         TEXT[]  DEFAULT '{}',   -- e.g. {Hindi, English}
    specialties       TEXT[]  DEFAULT '{}',   -- e.g. {Cardiology, Elderly care}
    years_experience  INTEGER CHECK (years_experience >= 0),

    -- Where they operate (pincodes) — cross-checked against service_areas later.
    service_pincodes  TEXT[]  DEFAULT '{}',

    -- Approval workflow
    approval_status   companion_status_enum NOT NULL DEFAULT 'PENDING_REVIEW',
    rejection_reason  TEXT,
    reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,

    -- Availability (only meaningful once APPROVED)
    is_online         BOOLEAN NOT NULL DEFAULT FALSE,
    last_online_at    TIMESTAMPTZ,

    -- Reputation (maintained as jobs complete; starts empty)
    rating            NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    total_jobs        INTEGER NOT NULL DEFAULT 0,

    -- System
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_companions_status   ON companions(approval_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companions_online    ON companions(is_online) WHERE approval_status = 'APPROVED' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companions_pincodes  ON companions USING GIN (service_pincodes);

ALTER TABLE companions ENABLE ROW LEVEL SECURITY;

-- A companion can read and create their own row; admins can read/write all.
DROP POLICY IF EXISTS "Companions view self, admins view all" ON companions;
CREATE POLICY "Companions view self, admins view all"
    ON companions FOR SELECT
    USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Companions create own row" ON companions;
CREATE POLICY "Companions create own row"
    ON companions FOR INSERT
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Companions update self, admins update all" ON companions;
CREATE POLICY "Companions update self, admins update all"
    ON companions FOR UPDATE
    USING (id = auth.uid() OR is_admin());

-- Guard: a companion may edit their own profile, but ONLY an admin may change
-- the fields that gate access (approval_status, reviewed_by/at, rating,
-- total_jobs). This prevents self-approval even though they can update the row.
CREATE OR REPLACE FUNCTION guard_companion_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF is_admin() THEN
        RETURN NEW;   -- admins may change anything
    END IF;

    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.reviewed_by  IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at  IS DISTINCT FROM OLD.reviewed_at
       OR NEW.rating       IS DISTINCT FROM OLD.rating
       OR NEW.total_jobs   IS DISTINCT FROM OLD.total_jobs
    THEN
        RAISE EXCEPTION 'Only an admin can change approval, review, or reputation fields';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_companion_fields ON companions;
CREATE TRIGGER trg_guard_companion_fields
BEFORE UPDATE ON companions
FOR EACH ROW EXECUTE PROCEDURE guard_companion_privileged_fields();

DROP TRIGGER IF EXISTS set_timestamp_companions ON companions;
CREATE TRIGGER set_timestamp_companions
BEFORE UPDATE ON companions
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- ----------------------------------------------------------------------------
-- 3. COMPANION DOCUMENTS (KYC)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE document_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS companion_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companion_id  UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
    doc_type      TEXT NOT NULL,           -- AADHAAR | POLICE_VERIFICATION | PHOTO_ID | OTHER
    file_path     TEXT NOT NULL,           -- path within the `companion-docs` Storage bucket
    status        document_status_enum NOT NULL DEFAULT 'PENDING',
    notes         TEXT,                    -- admin note on why rejected, etc.
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_companion_documents_companion ON companion_documents(companion_id);

ALTER TABLE companion_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companion sees own docs, admin sees all" ON companion_documents;
CREATE POLICY "Companion sees own docs, admin sees all"
    ON companion_documents FOR SELECT
    USING (companion_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Companion uploads own docs" ON companion_documents;
CREATE POLICY "Companion uploads own docs"
    ON companion_documents FOR INSERT
    WITH CHECK (companion_id = auth.uid());

-- Only admins verify/reject documents.
DROP POLICY IF EXISTS "Admins review docs" ON companion_documents;
CREATE POLICY "Admins review docs"
    ON companion_documents FOR UPDATE
    USING (is_admin());


-- ----------------------------------------------------------------------------
-- 4. STORAGE POLICIES for the private `companion-docs` bucket
-- ----------------------------------------------------------------------------
-- FIRST create the bucket in the dashboard: Storage -> New bucket ->
--   name: companion-docs   |   Public: OFF (private)
-- Convention: files are stored under a folder named after the companion's
-- user id, e.g.  companion-docs/<auth.uid>/aadhaar.jpg
-- The policies below let a companion manage only their own folder; admins see all.

DROP POLICY IF EXISTS "Companion manages own KYC folder" ON storage.objects;
CREATE POLICY "Companion manages own KYC folder"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'companion-docs'
        AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
    )
    WITH CHECK (
        bucket_id = 'companion-docs'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- End of migration 10.
-- ============================================================================
