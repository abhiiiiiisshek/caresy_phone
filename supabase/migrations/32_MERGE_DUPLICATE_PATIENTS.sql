-- ============================================================================
-- 32. Merge the duplicate patients /quick-help left behind
-- ============================================================================
-- /quick-help inserted a new patient row on every urgent request, so the same
-- parent accumulated one record per visit and their care timeline, documents and

-- booking history were split across all of them. The source is fixed (the page
-- reuses the customer's existing patient now); this cleans up the rows already
-- there.
--
-- Duplicate = same customer, same name ignoring case and surrounding spaces. The
-- oldest row wins because it is the one the earliest bookings and any family
-- circle already point at.
--
-- Safe to re-run: after the first pass there is nothing left to merge.
-- ---------------------------------------------------------------------------

BEGIN;

CREATE TEMP TABLE patient_merges ON COMMIT DROP AS
WITH ranked AS (
    SELECT id,
           customer_user_id,
           LOWER(TRIM(full_name)) AS name_key,
           FIRST_VALUE(id) OVER (
               PARTITION BY customer_user_id, LOWER(TRIM(full_name))
               ORDER BY created_at, id
           ) AS keeper_id
      FROM patients
     WHERE deleted_at IS NULL
       AND full_name IS NOT NULL
       AND TRIM(full_name) <> ''
)
SELECT id AS dup_id, keeper_id
  FROM ranked
 WHERE id <> keeper_id
   -- ponytail: documents live in a storage folder named after the patient id
   -- (migration 25), and moving files is not something SQL can do. A duplicate
   -- that owns documents is left alone rather than pointed at a folder the RLS
   -- policy will not open. Merge those by hand if any turn up.
   AND NOT EXISTS (SELECT 1 FROM patient_documents d WHERE d.patient_id = ranked.id);

-- Fill gaps on the keeper from whichever duplicate has the detail. A later
-- request that captured an age or an emergency number should not be lost just
-- because the first one did not ask for it.
UPDATE patients k
   SET age = COALESCE(k.age, d.age),
       emergency_contact_phone = COALESCE(k.emergency_contact_phone, d.emergency_contact_phone)
  FROM patients d
  JOIN patient_merges m ON m.dup_id = d.id
 WHERE k.id = m.keeper_id;

-- Repoint everything that hangs off a patient.
UPDATE bookings b SET patient_id = m.keeper_id
  FROM patient_merges m WHERE b.patient_id = m.dup_id;

UPDATE care_events e SET patient_id = m.keeper_id
  FROM patient_merges m WHERE e.patient_id = m.dup_id;

UPDATE notifications n SET patient_id = m.keeper_id
  FROM patient_merges m WHERE n.patient_id = m.dup_id;

-- patient_members is UNIQUE (patient_id, user_id), so drop the rows that would
-- collide with a membership the keeper already has, then move the rest.
DELETE FROM patient_members pm
 USING patient_merges m
 WHERE pm.patient_id = m.dup_id
   AND EXISTS (
        SELECT 1 FROM patient_members k
         WHERE k.patient_id = m.keeper_id AND k.user_id = pm.user_id
   );

UPDATE patient_members pm SET patient_id = m.keeper_id
  FROM patient_merges m WHERE pm.patient_id = m.dup_id;

-- Soft delete, not DELETE: every FK to patients cascades, so a hard delete of a
-- row we mis-identified would take real bookings with it.
UPDATE patients p
   SET deleted_at = NOW()
  FROM patient_merges m
 WHERE p.id = m.dup_id;

-- ---------------------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------------------
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM patient_merges;
    RAISE NOTICE 'merged % duplicate patient row(s)', n;

    -- Only the rows this run touched: a patient soft-deleted for some other
    -- reason long ago is not this migration's business.
    ASSERT NOT EXISTS (
        SELECT 1 FROM bookings b JOIN patient_merges m ON m.dup_id = b.patient_id
    ), 'no booking may still point at a merged-away patient';
END $$;

COMMIT;

-- What is left for a human, if anything: duplicates that own documents.
--
--   SELECT customer_user_id, LOWER(TRIM(full_name)) AS name_key, COUNT(*)
--     FROM patients WHERE deleted_at IS NULL
--    GROUP BY 1, 2 HAVING COUNT(*) > 1;
