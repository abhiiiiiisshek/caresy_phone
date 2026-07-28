-- ============================================================================
-- 25. patient-docs storage bucket
-- ============================================================================
-- Migration 23 created patient_documents and the storage.objects policy but
-- left the bucket itself as a dashboard instruction, so a deploy that ran the
-- SQL still had uploads fail with "Bucket not found". Creating it here makes
-- the whole feature reproducible from migrations alone.
--
-- public = false on purpose: these are prescriptions and lab reports. Reads go
-- through createSignedUrl(path, 60) in apps/website/src/app/care/page.tsx, and
-- the "Circle manages patient docs folder" policy from migration 23 is what
-- decides who may sign. A public bucket would make every file world-readable
-- to anyone who learns the path, policy or no policy.
--
-- Limits mirror the file input's accept="image/*,application/pdf". A bucket
-- limit is the only one that can't be bypassed — the browser accept attribute
-- is a hint and the JS check is client-side.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'patient-docs',
    'patient-docs',
    FALSE,
    26214400,                       -- 25 MiB; a phone photo is ~5, a scan PDF ~10
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
    SET public             = FALSE,  -- re-assert if it was made public by hand
        file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Confirm what the bucket ended up as.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'patient-docs';
