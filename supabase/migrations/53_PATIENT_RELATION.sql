-- Patient relation ("Mother", "Son", free text).
--
-- The mobile Family screen has asked for this since it shipped: the form has a
-- "Relation" field, the local state holds it, and then save() dropped it on the
-- floor because there was nowhere to put it. The column existed only on
-- `patient_members` (23_CARE.sql), which is a different thing — that is the
-- relation of a CIRCLE MEMBER to the patient, not of the patient to the account
-- holder. A companion arriving to meet "Sunita Sharma" benefits from knowing
-- she is the customer's mother; that fact belongs on the patient row.
--
-- No RLS change: `patients` policies are row-level and already cover every
-- column on the row.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS relation TEXT;

COMMENT ON COLUMN patients.relation IS
  'Relation of this patient to the account holder — "Mother", "Father", free text. Set from the Family screen.';
