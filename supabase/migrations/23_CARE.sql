-- Caresy: patient-centred care — passport, timeline, documents, family circle
--
-- Bookings are episodes; a patient is the thing families actually follow. This
-- migration moves the durable record onto `patients` and lets more than one
-- family member see it.
--
-- Reuses what already exists rather than adding parallels:
--   * Care Passport is columns on `patients`, not a new table — it is a 1:1 fact
--     about the patient and `patients` already carries mobility_notes and age.
--   * Documents mirror `companion_documents`: a private Storage bucket plus a
--     rows table, folder named after the owning id.
--   * Notifications go into the existing `notifications` queue (13_LIFECYCLE),
--     which already has status='QUEUED' waiting for a sender to drain it. Two
--     columns are added so a row can target a person rather than only a role.
--
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. Care Passport — what a companion needs to know before a visit
-- ============================================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group   TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies     TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS conditions    TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medications   TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_notes    TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_doctor TEXT;

-- Family joins a patient's circle with this, the same shape as bookings.share_token.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS invite_token TEXT;
UPDATE patients SET invite_token = gen_random_uuid()::text WHERE invite_token IS NULL;
ALTER TABLE patients ALTER COLUMN invite_token SET DEFAULT gen_random_uuid()::text;
ALTER TABLE patients ALTER COLUMN invite_token SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE patients ADD CONSTRAINT patients_invite_token_unique UNIQUE (invite_token);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 2. Family circle
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relation   TEXT,                       -- "Daughter", "Son", free text
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (patient_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_members_user ON patient_members(user_id);

-- SECURITY DEFINER on purpose: this is called from the RLS policies of
-- patient_members itself, so a policy-respecting read here would recurse.
CREATE OR REPLACE FUNCTION public.can_access_patient(p_patient UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM patients  WHERE id = p_patient AND customer_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM patient_members WHERE patient_id = p_patient AND user_id = auth.uid())
      OR is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.can_access_patient(UUID) TO authenticated;

-- Redemption of an invite link. SECURITY DEFINER because the joiner cannot yet
-- see the patient row they are about to join.
CREATE OR REPLACE FUNCTION public.join_patient_circle(p_token TEXT, p_relation TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in required';
  END IF;

  -- Length guard so a NULL or empty token can never fall through to a match.
  SELECT id INTO v_patient
  FROM patients
  WHERE length(coalesce(p_token, '')) >= 32
    AND invite_token = p_token
    AND deleted_at IS NULL;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'invalid invite';
  END IF;

  INSERT INTO patient_members (patient_id, user_id, relation)
  VALUES (v_patient, auth.uid(), p_relation)
  ON CONFLICT (patient_id, user_id) DO UPDATE SET relation = COALESCE(EXCLUDED.relation, patient_members.relation);

  RETURN v_patient;
END;
$$;

REVOKE ALL ON FUNCTION public.join_patient_circle(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_patient_circle(TEXT, TEXT) TO authenticated;

ALTER TABLE patient_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Circle members read the circle" ON patient_members;
CREATE POLICY "Circle members read the circle"
    ON patient_members FOR SELECT
    USING (can_access_patient(patient_id));

-- Only the patient's owner adds or removes people. Members join via
-- join_patient_circle(), which runs as definer and bypasses this.
DROP POLICY IF EXISTS "Owner manages the circle" ON patient_members;
CREATE POLICY "Owner manages the circle"
    ON patient_members FOR ALL
    USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.customer_user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.customer_user_id = auth.uid()));

-- Family members must be able to read the patient they were invited to. The
-- original owner-only policy from SUPABASE_SCHEMA.sql is replaced, not added to.
DROP POLICY IF EXISTS "Users can view their own patients" ON patients;
CREATE POLICY "Users can view their own patients"
    ON patients FOR SELECT
    USING (customer_user_id = auth.uid() OR can_access_patient(id));

-- ============================================================================
-- 3. Care timeline
-- ============================================================================
CREATE TABLE IF NOT EXISTS care_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
    kind        TEXT NOT NULL,             -- VISIT | MEDICATION | VITALS | DOCUMENT | NOTE | STATUS
    title       TEXT NOT NULL,
    body        TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_events_patient ON care_events(patient_id, occurred_at DESC);

ALTER TABLE care_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Circle reads care events" ON care_events;
CREATE POLICY "Circle reads care events"
    ON care_events FOR SELECT
    USING (can_access_patient(patient_id));

-- The circle and the companion assigned to the linked booking may both write.
DROP POLICY IF EXISTS "Circle and assigned companion write care events" ON care_events;
CREATE POLICY "Circle and assigned companion write care events"
    ON care_events FOR INSERT
    WITH CHECK (
        can_access_patient(patient_id)
        OR EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = care_events.booking_id
              AND b.companion_user_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. Patient documents — prescriptions, reports, receipts
-- ============================================================================
-- The `patient-docs` bucket is created by migration 25 — run that too, or the
-- policy below guards a bucket that does not exist and uploads fail with
-- "Bucket not found".
-- Convention: files live under a folder named after the patient id, e.g.
--   patient-docs/<patient_id>/report.pdf
-- Folder is the patient, not the uploader, so the whole circle can read it.
CREATE TABLE IF NOT EXISTS patient_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
    doc_type    TEXT NOT NULL,             -- PRESCRIPTION | REPORT | RECEIPT | OTHER
    title       TEXT,
    file_path   TEXT NOT NULL,             -- path within the `patient-docs` bucket
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id, uploaded_at DESC);

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Circle reads patient documents" ON patient_documents;
CREATE POLICY "Circle reads patient documents"
    ON patient_documents FOR SELECT
    USING (can_access_patient(patient_id));

DROP POLICY IF EXISTS "Circle writes patient documents" ON patient_documents;
CREATE POLICY "Circle writes patient documents"
    ON patient_documents FOR INSERT
    WITH CHECK (can_access_patient(patient_id));

DROP POLICY IF EXISTS "Circle deletes patient documents" ON patient_documents;
CREATE POLICY "Circle deletes patient documents"
    ON patient_documents FOR DELETE
    USING (can_access_patient(patient_id));

DROP POLICY IF EXISTS "Circle manages patient docs folder" ON storage.objects;
CREATE POLICY "Circle manages patient docs folder"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'patient-docs'
        AND can_access_patient(((storage.foldername(name))[1])::uuid)
    )
    WITH CHECK (
        bucket_id = 'patient-docs'
        AND can_access_patient(((storage.foldername(name))[1])::uuid)
    );

-- ============================================================================
-- 5. Notification events — captured now, delivered when a sender exists
-- ============================================================================
-- `notifications` was booking-and-role shaped. Care events belong to a patient
-- and must reach named people, so it gains two nullable columns rather than
-- growing a second queue beside it.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS patient_id         UUID REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON notifications(recipient_user_id) WHERE status = 'QUEUED';

-- Let people read notifications addressed to them. Previously admin-only, which
-- was fine while nothing was user-facing.
DROP POLICY IF EXISTS "Recipients read own notifications" ON notifications;
CREATE POLICY "Recipients read own notifications"
    ON notifications FOR SELECT
    USING (recipient_user_id = auth.uid());

-- One QUEUED row per person in the circle, minus whoever caused the event —
-- nobody needs a notification about their own action.
CREATE OR REPLACE FUNCTION public.enqueue_care_event_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO notifications (patient_id, booking_id, recipient_user_id, recipient_role, event, title, body)
    SELECT NEW.patient_id, NEW.booking_id, m.user_id, 'CUSTOMER',
           'CARE_EVENT_' || NEW.kind, NEW.title, NEW.body
    FROM (
        SELECT customer_user_id AS user_id FROM patients WHERE id = NEW.patient_id
        UNION
        SELECT user_id FROM patient_members WHERE patient_id = NEW.patient_id
    ) m
    WHERE m.user_id IS DISTINCT FROM NEW.created_by;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS care_event_notify ON care_events;
CREATE TRIGGER care_event_notify
AFTER INSERT ON care_events
FOR EACH ROW EXECUTE PROCEDURE enqueue_care_event_notification();
