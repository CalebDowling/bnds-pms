-- ============================================================================
-- Supabase Storage bucket: prescription-documents
-- ============================================================================
-- Phase 2-4 of the Rx document viewer feature ships an upload path for
-- inbound fax PDFs (Keragon webhook → fax-processor.ts), paper-Rx scans
-- (NewPrescriptionForm.tsx file picker), and phone-Rx audio attachments.
-- All of those ride through src/lib/storage/prescriptionDocument.ts which
-- targets a private "prescription-documents" bucket.
--
-- Production already has this bucket — it was created out-of-band via
-- INSERT INTO storage.buckets while smoke-testing the upload flow:
--
--   {"id":"prescription-documents", "public":false,
--    "file_size_limit":26214400 (25 MiB),
--    "allowed_mime_types":["application/pdf","image/png","image/jpeg",
--                          "image/webp","image/tiff","image/heic",
--                          "audio/mpeg","audio/mp4","audio/wav",
--                          "audio/webm","audio/ogg"]}
--
-- This migration is a no-op there (ON CONFLICT DO NOTHING). Fresh
-- databases — Vercel preview, local dev, new pharmacy onboarding —
-- pick the bucket up via this file so the upload path doesn't 404 on
-- the bucket lookup before the first manual provision.
--
-- We don't write Storage RLS policies here: server-side uploads use
-- the service-role client (createAdminClient) which bypasses RLS, and
-- end-user reads go through signed URLs (1h TTL) minted by the same
-- service-role client. No anonymous direct access is permitted.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescription-documents',
  'prescription-documents',
  false,
  26214400, -- 25 MiB — matches MAX_FILE_SIZE_BYTES in prescriptionDocument.ts
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/tiff',
    'image/heic',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/ogg'
  ]
)
ON CONFLICT (id) DO NOTHING;
