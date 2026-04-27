/**
 * Fax intake processor
 * ============================================================================
 *
 * When Keragon receives a fax (via its inbound-fax connector — eFax,
 * Documo, SRFax, Twilio Fax, …) the workflow POSTs the fax PDF to our
 * Keragon webhook with action="intake_fax". This module is the
 * server-side handler:
 *
 *   1. Decode the incoming PDF bytes
 *   2. Upload to Supabase Storage via uploadPrescriptionDocument
 *   3. Create an IntakeQueueItem(source="fax") so the document shows
 *      up in the intake review queue
 *   4. Return the intake item id + a signed URL that the webhook
 *      response echoes back to Keragon for traceability
 *
 * Why an intake queue item (and not a Prescription directly): the
 * incoming fax is a PDF — we can't reliably OCR it back into a
 * structured Rx without human review. The pharmacist opens the
 * intake item, reads the fax, and types the structured Rx. The
 * fax document auto-attaches to the resulting Prescription via
 * linkDocumentToPrescription so RxDocumentView can render it.
 */

import { prisma } from "@/lib/prisma";
import {
  uploadPrescriptionDocument,
  type PrescriptionDocumentSource,
} from "@/lib/storage/prescriptionDocument";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";

export interface FaxIntakeInput {
  /**
   * Sender's fax number (E.164 or formatted — we just stash whatever
   * the upstream connector sends so the audit trail is faithful).
   */
  faxNumber?: string | null;
  /** Caller-ID name from the inbound fax connector, if available. */
  senderName?: string | null;
  /** Page count reported by the connector. */
  pageCount?: number | null;
  /** Original filename from the connector (e.g. "fax-2026-04-27-1438.pdf"). */
  fileName?: string | null;
  /** PDF MIME — usually "application/pdf". */
  contentType?: string | null;
  /** Base64-encoded fax payload OR a URL we can fetch the PDF from. */
  fileBase64?: string | null;
  fileUrl?: string | null;
  /**
   * Webhook event id from Keragon — used for idempotency. If we've
   * already processed this id we no-op.
   */
  eventId?: string | null;
  /**
   * Optional free-form message body / cover-sheet OCR snippet the
   * connector extracted; surfaces in the intake item so the tech can
   * triage faster.
   */
  notes?: string | null;
}

export interface FaxIntakeResult {
  intakeId: string;
  documentId: string;
  signedUrl: string;
  alreadyProcessed?: boolean;
}

const FAX_SOURCE: PrescriptionDocumentSource = "fax";

/**
 * Decode the inbound fax payload to a Buffer. Accepts either
 * `fileBase64` (preferred — Keragon's HTTP Client step base64-encodes
 * binary attachments by default) or `fileUrl` (we fetch it server-side
 * — useful if the connector pre-stages the fax in its own storage).
 */
async function loadFaxBytes(input: FaxIntakeInput): Promise<Buffer> {
  if (input.fileBase64) {
    return Buffer.from(input.fileBase64, "base64");
  }
  if (input.fileUrl) {
    const res = await fetch(input.fileUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch fax from ${input.fileUrl}: ${res.status} ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("FaxIntake: neither fileBase64 nor fileUrl provided");
}

/**
 * Idempotency check — if the upstream Keragon event id has already
 * produced an intake row, return the existing one. Prevents duplicate
 * fax intakes when Keragon retries on transient PMS 5xx.
 */
async function findExistingByEventId(eventId: string) {
  return prisma.intakeQueueItem.findFirst({
    where: { messageId: eventId, source: "fax" },
    select: { id: true, rawData: true },
  });
}

/**
 * Process an inbound fax: store the PDF, create an intake queue item,
 * write an audit row, return the intake id + signed URL.
 */
export async function processFaxIntake(input: FaxIntakeInput): Promise<FaxIntakeResult> {
  // Idempotency — Keragon retries 5xx
  if (input.eventId) {
    const existing = await findExistingByEventId(input.eventId);
    if (existing) {
      const raw = existing.rawData as { faxSource?: { documentId?: string } } | null;
      const documentId = raw?.faxSource?.documentId ?? "";
      const { getPrescriptionDocumentSignedUrlById } = await import("./../storage/prescriptionDocument");
      const signed = documentId ? await getPrescriptionDocumentSignedUrlById(documentId) : null;
      return {
        intakeId: existing.id,
        documentId,
        signedUrl: signed?.signedUrl ?? "",
        alreadyProcessed: true,
      };
    }
  }

  // 1. Pull the PDF bytes
  const bytes = await loadFaxBytes(input);
  const contentType = input.contentType || "application/pdf";
  const fileName = input.fileName || `fax-${Date.now()}.pdf`;

  // 2. Upload to Storage + create Document row
  const upload = await uploadPrescriptionDocument({
    bytes,
    fileName,
    contentType,
    source: FAX_SOURCE,
    description: `Inbound fax${input.senderName ? ` from ${input.senderName}` : ""}${
      input.faxNumber ? ` (${input.faxNumber})` : ""
    }`,
    uploadedBy: null, // webhook ingests have no user
  });

  // 3. Create the IntakeQueueItem. Stash the faxSource payload in
  //    rawData so when the tech finalizes the Rx, the same payload
  //    can be lifted onto Prescription.metadata.faxSource — that's
  //    what RxDocumentView reads.
  const faxSource = {
    receivedAt: new Date().toISOString(),
    faxNumber: input.faxNumber ?? null,
    senderName: input.senderName ?? null,
    pageCount: input.pageCount ?? null,
    documentId: upload.documentId,
    documentUrl: upload.signedUrl,
    documentStorageKey: upload.storageKey,
  };

  const intakeItem = await prisma.intakeQueueItem.create({
    data: {
      source: "fax",
      messageId: input.eventId ?? null,
      rawData: { faxSource } as object as never,
      // No patientId / prescriberId / drugName yet — those get filled
      // in when the tech reviews the fax in the intake queue.
      status: "pending",
      patientName: null,
      prescriberName: null,
      drugName: null,
      priority: "normal",
      notes: input.notes ?? null,
    },
  });

  await logAudit({
    userId: "system-keragon",
    action: "CREATE",
    resource: "intake_queue",
    resourceId: intakeItem.id,
    newValues: {
      source: "fax",
      faxNumber: input.faxNumber,
      senderName: input.senderName,
      pageCount: input.pageCount,
      documentId: upload.documentId,
    },
  }).catch(() => {});

  logger.info(
    `[fax-intake] created intake ${intakeItem.id} for fax from ${
      input.senderName || input.faxNumber || "unknown"
    } (${bytes.length} bytes)`
  );

  return {
    intakeId: intakeItem.id,
    documentId: upload.documentId,
    signedUrl: upload.signedUrl,
  };
}
