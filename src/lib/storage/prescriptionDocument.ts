/**
 * Prescription document storage
 * ============================================================================
 *
 * The `RxDocumentView` Phase 1 component already knows how to render a fax
 * PDF, paper scan, or photographed Rx — it just needs `documentUrl` on the
 * source payload. This module is the writer for that URL.
 *
 * Architecture:
 *
 *   Inbound channel (Keragon fax webhook, `/prescriptions/new` upload,
 *   phone-Rx attached image, …)
 *      │
 *      ▼
 *   uploadPrescriptionDocument()  ── stores bytes in Supabase Storage
 *      │                              under a stable path keyed by
 *      │                              year/month and a UUID, then
 *      │                              creates a `documents` row that
 *      │                              points at it.
 *      ▼
 *   Document row (entityType="prescription_intake" or "prescription")
 *      │
 *      ▼
 *   Caller writes `{ documentId, documentUrl }` onto Prescription.metadata
 *   (faxSource / paperSource / phoneSource — RxDocumentView reads it from
 *   there). The URL is a long-lived signed URL because the bucket is
 *   private and the dashboard renders it inside an <iframe>/<img>.
 *
 * Bucket policy:
 *   Private bucket `prescription-documents`. Created once via Supabase
 *   dashboard or migration. Service-role uploads write here; we issue
 *   short-lived signed URLs for read.
 *
 * Why a private bucket: incoming Rx docs contain PHI (patient name,
 * DOB, drug, prescriber). They must never be reachable via a guess-able
 * public URL. Signed URLs expire — the renderer requests a fresh URL
 * each time the panel mounts.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * Supabase Storage bucket holding all prescription source documents
 * (fax PDFs, paper scans, phone-call attached images, etc.). Private —
 * read access goes through `getPrescriptionDocumentSignedUrl` only.
 *
 * Override via env for local dev / preview environments that use a
 * separate bucket.
 */
export const PRESCRIPTION_DOCUMENT_BUCKET =
  process.env.PRESCRIPTION_DOCUMENT_BUCKET || "prescription-documents";

/**
 * Default signed-URL lifetime. The Rx detail / queue process page
 * issues a fresh URL on every render, so 1 hour is plenty for the
 * tab to stay open while the pharmacist works through the fill.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Hard upload size limit. Faxes / scans should be well under this;
 * larger means somebody attached the wrong file. Tune if real
 * traffic produces multi-page faxes that exceed it.
 */
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Channel that produced the document. Used for audit + storage path
 * partitioning so we can quickly count fax-vs-paper-vs-phone documents
 * via a path prefix scan.
 */
export type PrescriptionDocumentSource = "fax" | "paper" | "phone" | "erx_attachment";

export interface UploadPrescriptionDocumentInput {
  /** Raw document bytes — typically from a multipart upload or a
   *  base64 payload decoded by the Keragon webhook. */
  bytes: Buffer | Uint8Array;
  /** Original filename. We sanitize it before storing. */
  fileName: string;
  /** MIME type — `application/pdf` for faxes, `image/*` for scans. */
  contentType: string;
  /** Inbound channel — drives the storage path prefix. */
  source: PrescriptionDocumentSource;
  /** Free-form description shown in the audit trail. */
  description?: string;
  /**
   * UUID of the user / system actor that ingested this document.
   * Falls back to null for unauthenticated webhook ingests
   * (Keragon fax webhook, etc).
   */
  uploadedBy?: string | null;
  /**
   * If known at upload time, the Prescription this document attaches
   * to. For inbound faxes we usually do NOT know this — we set the
   * intake queue item first and link the prescription later.
   */
  prescriptionId?: string | null;
}

export interface UploadPrescriptionDocumentResult {
  documentId: string;
  storageKey: string;
  signedUrl: string;
}

// ─── Internal helpers ───────────────────────────────────────────────────

/**
 * Strip path-traversal and weird unicode from a user-supplied filename
 * before it becomes part of a storage key. We keep the original name
 * so the auditor can recognize what was uploaded ("fax-123.pdf"),
 * but sanitize it so the stored object key is filesystem-safe.
 */
function sanitizeFileName(raw: string): string {
  // Strip any path component (a fax sender might send "C:\foo\bar.pdf")
  const baseName = raw.split(/[/\\]/).pop() || raw;
  // Replace anything that isn't alphanumeric, dot, dash, or underscore.
  const cleaned = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  // Don't allow leading dots — they'd produce hidden files / weird keys.
  return cleaned.replace(/^\.+/, "") || "document";
}

/**
 * Build the canonical Storage object key. Layout:
 *   <source>/<YYYY>/<MM>/<uuid>-<sanitized>.<ext>
 *
 * The date partition keeps a single month under any one prefix
 * navigable in the Supabase Storage UI even at high volume; the UUID
 * prefix prevents collisions when two different uploads share a
 * filename ("scan.pdf" is common).
 */
function buildStorageKey(source: PrescriptionDocumentSource, fileName: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = randomUUID();
  return `${source}/${yyyy}/${mm}/${id}-${sanitizeFileName(fileName)}`;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Upload a prescription source document to Supabase Storage and create
 * the matching `documents` row.
 *
 * Returns the document id + storage key + a signed URL ready to drop
 * into `Prescription.metadata.faxSource.documentUrl` (or paperSource /
 * phoneSource as appropriate).
 *
 * Idempotency note: this function does NOT dedupe — if the caller
 * uploads the same fax PDF twice, two Document rows + two storage
 * objects will be created. The Keragon webhook is responsible for
 * checking its own event-id idempotency upstream.
 */
export async function uploadPrescriptionDocument(
  input: UploadPrescriptionDocumentInput
): Promise<UploadPrescriptionDocumentResult> {
  const {
    bytes,
    fileName,
    contentType,
    source,
    description,
    uploadedBy = null,
    prescriptionId = null,
  } = input;

  if (!bytes || bytes.length === 0) {
    throw new Error("uploadPrescriptionDocument: empty bytes");
  }
  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `uploadPrescriptionDocument: file too large (${bytes.length} bytes, max ${MAX_FILE_SIZE_BYTES})`
    );
  }
  if (!contentType) {
    throw new Error("uploadPrescriptionDocument: contentType is required");
  }

  const supabase = createAdminClient();
  const storageKey = buildStorageKey(source, fileName);

  // Upload to private bucket. `upsert: false` so a hash collision (which
  // shouldn't happen given the random UUID prefix) is loud, not silent.
  const { error: uploadError } = await supabase.storage
    .from(PRESCRIPTION_DOCUMENT_BUCKET)
    .upload(storageKey, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    logger.error(
      `[prescriptionDocument] upload to ${PRESCRIPTION_DOCUMENT_BUCKET}/${storageKey} failed:`,
      uploadError
    );
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Create the Document DB row. We store the *storage key* in
  // `storageUrl` (not a signed URL — those expire) and re-sign on
  // every read via getPrescriptionDocumentSignedUrl().
  let documentRow;
  try {
    documentRow = await prisma.document.create({
      data: {
        fileName: sanitizeFileName(fileName),
        fileType: contentType,
        fileSizeBytes: BigInt(bytes.length),
        storageUrl: storageKey, // path inside bucket, NOT a public URL
        entityType: prescriptionId ? "prescription" : "prescription_intake",
        entityId: prescriptionId ?? randomUUID(), // FK to Rx if we have one,
        // otherwise a unique placeholder until intake review links it.
        documentType: `rx_source_${source}`,
        description: description ?? `Prescription source document (${source})`,
        uploadedBy,
      },
    });
  } catch (dbErr) {
    // Roll back the storage object so we don't leave orphans.
    await supabase.storage
      .from(PRESCRIPTION_DOCUMENT_BUCKET)
      .remove([storageKey])
      .catch(() => {});
    throw dbErr;
  }

  // Sign immediately so the caller can hand a URL straight back to
  // the webhook ack response without a second round-trip.
  const signedUrl = await getPrescriptionDocumentSignedUrl(storageKey);

  return {
    documentId: documentRow.id,
    storageKey,
    signedUrl,
  };
}

/**
 * Issue a fresh signed URL for an already-uploaded prescription
 * document. The renderer (RxDocumentView) calls this on every mount —
 * we never persist a signed URL, only the storage key.
 *
 * Accepts either the bare storage key (preferred) or a full signed
 * URL (legacy; we strip the bucket prefix and re-sign).
 */
export async function getPrescriptionDocumentSignedUrl(
  storageKeyOrUrl: string,
  opts: { ttlSeconds?: number } = {}
): Promise<string> {
  const ttl = opts.ttlSeconds ?? SIGNED_URL_TTL_SECONDS;

  // If somebody passed a full URL, extract the path. We accept the
  // public form `https://<project>.supabase.co/storage/v1/object/.../<bucket>/<key>`
  // by splitting on the bucket name.
  let storageKey = storageKeyOrUrl;
  const bucketMarker = `/${PRESCRIPTION_DOCUMENT_BUCKET}/`;
  const idx = storageKey.indexOf(bucketMarker);
  if (idx !== -1) {
    storageKey = storageKey.substring(idx + bucketMarker.length);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(PRESCRIPTION_DOCUMENT_BUCKET)
    .createSignedUrl(storageKey, ttl);

  if (error || !data) {
    logger.error(
      `[prescriptionDocument] sign ${PRESCRIPTION_DOCUMENT_BUCKET}/${storageKey} failed:`,
      error
    );
    throw new Error(`Failed to sign URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/**
 * Resolve a Document row to a fresh signed URL — convenience wrapper
 * for callers that already have the document id (e.g. fill-process
 * page resolving `metadata.faxSource.documentId`).
 */
export async function getPrescriptionDocumentSignedUrlById(
  documentId: string,
  opts: { ttlSeconds?: number } = {}
): Promise<{ signedUrl: string; fileName: string; contentType: string } | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { storageUrl: true, fileName: true, fileType: true },
  });
  if (!doc) return null;
  const signedUrl = await getPrescriptionDocumentSignedUrl(doc.storageUrl, opts);
  return { signedUrl, fileName: doc.fileName, contentType: doc.fileType };
}

/**
 * Re-link a previously-uploaded "prescription_intake" document to a
 * concrete Prescription once the intake-review step creates it. The
 * Keragon fax flow (Phase 2) and the paper-scan flow (Phase 3) both
 * use this — the document is uploaded *before* the Prescription
 * exists, then re-pointed when the tech finalizes the Rx.
 */
export async function linkDocumentToPrescription(
  documentId: string,
  prescriptionId: string
): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { entityType: "prescription", entityId: prescriptionId },
  });
}
