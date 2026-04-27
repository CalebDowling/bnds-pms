import { NextRequest, NextResponse } from "next/server";
import { verifyKeragonSignature, type KeragonWebhookPayload } from "@/lib/integrations/keragon";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyPatient } from "@/lib/messaging/dispatcher";
import { logger } from "@/lib/logger";

/**
 * POST /api/integrations/keragon/webhook
 *
 * Inbound webhook from Keragon workflows.
 * Keragon calls this endpoint when a workflow wants the PMS to take an action,
 * for example: send an SMS, update a record, trigger a label print, etc.
 *
 * Supported actions:
 *   - send_sms          → Send SMS to a patient
 *   - send_notification  → Send multi-channel notification
 *   - update_fill_status → Update a prescription fill status
 *   - update_claim       → Update claim status
 *   - create_alert       → Create an in-app alert/notification
 *   - log_event          → Write to audit log (for traceability)
 *   - sync_drx           → Trigger a DRX sync for a specific record
 *   - intake_fax         → Inbound fax PDF → IntakeQueueItem with attachment
 *   - noop / ping        → Health check / acknowledgment
 */
export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Verify webhook signature
  const signature = request.headers.get("x-webhook-signature");
  if (!verifyKeragonSignature(rawBody, signature)) {
    logger.warn("[Keragon Webhook] Invalid signature — rejecting request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: KeragonWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, workflowRunId, workflowName, data } = payload;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  logger.info(`[Keragon Webhook] Received action="${action}" workflow="${workflowName || "unknown"}" runId="${workflowRunId || "none"}"`);

  // Support flat payload structure (fields at root level instead of nested in data)
  // Keragon workflows may send fields flat (not nested under "data")
  const raw = payload as Record<string, any>;
  const baseData = payload.data || {};
  const mergedData: Record<string, any> = {
    ...baseData,
    ...(raw.patientId && { patientId: raw.patientId }),
    ...(raw.templateName && { templateName: raw.templateName }),
    ...(raw.templateData && { templateData: raw.templateData }),
    ...(raw.channels && { channels: raw.channels }),
    ...(raw.fillId && { fillId: raw.fillId }),
    ...(raw.status && { status: raw.status }),
    ...(raw.claimId && { claimId: raw.claimId }),
    ...(raw.message && { message: raw.message }),
    ...(raw.title && { title: raw.title }),
  };

  // Log to audit trail
  await logAudit({
    userId: "system-keragon",
    action: "CREATE",
    resource: "keragon_webhook",
    resourceId: workflowRunId,
    newValues: { action, workflowName, data: mergedData },
  }).catch(() => {});

  try {
    switch (action) {
      // ---------------------------------------------------------------
      // Send SMS to a patient
      // ---------------------------------------------------------------
      case "send_sms": {
        const { patientId, message, templateName, templateData } = mergedData;
        if (!patientId) {
          return NextResponse.json({ error: "Missing patientId" }, { status: 400 });
        }

        if (templateName) {
          await notifyPatient(patientId, templateName, templateData || {}, {
            channels: ["sms"],
          });
        } else if (message) {
          // Direct SMS via Twilio
          const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { phoneNumbers: { where: { isPrimary: true } } },
          });

          if (!patient || !patient.phoneNumbers[0]?.number) {
            return NextResponse.json({ error: "Patient or phone not found" }, { status: 404 });
          }

          // Use the SMS service
          const { sendSMS } = await import("@/lib/messaging/sms");
          const result = await sendSMS(patient.phoneNumbers[0].number, message);

          // Log the communication
          await prisma.communicationLog.create({
            data: {
              patientId,
              channel: "sms",
              direction: "outbound",
              toAddress: patient.phoneNumbers[0].number,
              body: message,
              status: result.success ? "sent" : "failed",
              externalId: result.messageId,
            },
          });
        }

        return NextResponse.json({ success: true, action: "send_sms" });
      }

      // ---------------------------------------------------------------
      // Send multi-channel notification
      // ---------------------------------------------------------------
      case "send_notification": {
        const { patientId, templateName, templateData, channels } = mergedData;
        if (!patientId || !templateName) {
          return NextResponse.json({ error: "Missing patientId or templateName" }, { status: 400 });
        }

        await notifyPatient(patientId, templateName, templateData || {}, {
          channels: channels || ["sms", "email"],
        });

        return NextResponse.json({ success: true, action: "send_notification" });
      }

      // ---------------------------------------------------------------
      // Update prescription fill status
      // ---------------------------------------------------------------
      case "update_fill_status": {
        const { fillId, status, notes } = mergedData;
        if (!fillId || !status) {
          return NextResponse.json({ error: "Missing fillId or status" }, { status: 400 });
        }

        await prisma.prescriptionFill.update({
          where: { id: fillId },
          data: {
            status,
          },
        });

        return NextResponse.json({ success: true, action: "update_fill_status" });
      }

      // ---------------------------------------------------------------
      // Update claim status
      // ---------------------------------------------------------------
      case "update_claim": {
        const { claimId, status: claimStatus, paidAmount, rejectionCode, rejectionMessage } = mergedData;
        if (!claimId) {
          return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
        }

        const updateData: Record<string, any> = {};
        if (claimStatus) updateData.status = claimStatus;
        if (paidAmount !== undefined) updateData.amountPaid = paidAmount;
        if (rejectionCode) updateData.rejectionCode = rejectionCode;
        if (rejectionMessage) updateData.rejectionMessage = rejectionMessage;

        await prisma.claim.update({
          where: { id: claimId },
          data: updateData,
        });

        // Log status change
        if (claimStatus) {
          await prisma.claimStatusLog.create({
            data: {
              claimId,
              fromStatus: "unknown",
              toStatus: claimStatus,
              changedBy: null,
              reason: `Updated via Keragon workflow: ${workflowName || workflowRunId}`,
            },
          }).catch(() => {});
        }

        return NextResponse.json({ success: true, action: "update_claim" });
      }

      // ---------------------------------------------------------------
      // Create in-app alert / notification
      // ---------------------------------------------------------------
      case "create_alert": {
        const { title, message: alertMessage, type, recipientUserId, priority } = mergedData;
        if (!title || !alertMessage) {
          return NextResponse.json({ error: "Missing title or message" }, { status: 400 });
        }

        const { createNotification } = await import("@/lib/notifications");
        await createNotification(
          recipientUserId || "system",
          type || "info",
          title,
          alertMessage,
          { source: "keragon", workflowRunId, workflowName, priority: priority || "normal" }
        );

        return NextResponse.json({ success: true, action: "create_alert" });
      }

      // ---------------------------------------------------------------
      // Log an event to audit trail
      // ---------------------------------------------------------------
      case "log_event": {
        const { eventType, resource, resourceId, details } = mergedData;

        await logAudit({
          userId: "system-keragon",
          action: eventType || "CREATE",
          resource: resource || "keragon_event",
          resourceId,
          newValues: details,
        });

        return NextResponse.json({ success: true, action: "log_event" });
      }

      // ---------------------------------------------------------------
      // Inbound fax → IntakeQueueItem with PDF attached
      //
      // Keragon's inbound-fax connector (eFax / Documo / SRFax / etc)
      // posts the fax PDF here. We stash the bytes in Supabase
      // Storage, create a Document row, and create an
      // IntakeQueueItem(source="fax") so the tech sees it in the
      // intake review queue. RxDocumentView renders the PDF when
      // the resulting Prescription is later opened.
      //
      // Expected `data` (or root-flat) fields from the workflow:
      //   - fileBase64         (preferred) base64 PDF body
      //   - fileUrl            alternate: URL we fetch the PDF from
      //   - fileName           original filename, optional
      //   - contentType        defaults to "application/pdf"
      //   - faxNumber          sender fax number
      //   - senderName         caller-id name
      //   - pageCount          page count
      //   - notes              cover-sheet OCR / free-text triage notes
      // We use the X-Event-Id header as the idempotency key — Keragon
      // re-delivers on transient 5xx, and we don't want to create
      // duplicate intake rows for the same fax.
      // ---------------------------------------------------------------
      case "intake_fax": {
        const { processFaxIntake } = await import("@/lib/erx/fax-processor");
        // Pull data from either nested `data` or flat root for parity
        // with the other actions.
        const fax = mergedData as {
          fileBase64?: string;
          fileUrl?: string;
          fileName?: string;
          contentType?: string;
          faxNumber?: string;
          senderName?: string;
          pageCount?: number;
          notes?: string;
        };

        const fileBase64 = fax.fileBase64 ?? (raw.fileBase64 as string | undefined);
        const fileUrl = fax.fileUrl ?? (raw.fileUrl as string | undefined);
        if (!fileBase64 && !fileUrl) {
          return NextResponse.json(
            { error: "Missing fileBase64 or fileUrl" },
            { status: 400 }
          );
        }

        // Idempotency key — Keragon's X-Event-Id, fall back to
        // workflowRunId so re-deliveries of the same workflow run
        // don't double-write either.
        const eventId =
          request.headers.get("x-event-id") ||
          workflowRunId ||
          null;

        const result = await processFaxIntake({
          fileBase64: fileBase64 ?? null,
          fileUrl: fileUrl ?? null,
          fileName: fax.fileName ?? (raw.fileName as string | undefined) ?? null,
          contentType: fax.contentType ?? (raw.contentType as string | undefined) ?? null,
          faxNumber: fax.faxNumber ?? (raw.faxNumber as string | undefined) ?? null,
          senderName: fax.senderName ?? (raw.senderName as string | undefined) ?? null,
          pageCount: fax.pageCount ?? (raw.pageCount as number | undefined) ?? null,
          notes: fax.notes ?? (raw.notes as string | undefined) ?? null,
          eventId,
        });

        return NextResponse.json({
          success: true,
          action: "intake_fax",
          intakeId: result.intakeId,
          documentId: result.documentId,
          signedUrl: result.signedUrl,
          alreadyProcessed: result.alreadyProcessed ?? false,
        });
      }

      // ---------------------------------------------------------------
      // Health check / ping
      // ---------------------------------------------------------------
      case "ping":
      case "noop": {
        return NextResponse.json({
          success: true,
          action,
          pong: true,
          timestamp: new Date().toISOString(),
        });
      }

      // ---------------------------------------------------------------
      // Unknown action
      // ---------------------------------------------------------------
      default: {
        logger.warn(`[Keragon Webhook] Unknown action: ${action}`);
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
      }
    }
  } catch (err: any) {
    logger.error(`[Keragon Webhook] Error processing action="${action}":`, err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/keragon/webhook
 * Health check endpoint — Keragon can use this to verify the webhook URL is alive.
 */
export async function GET() {
  return NextResponse.json({
    service: "bnds-pms",
    integration: "keragon",
    status: "active",
    timestamp: new Date().toISOString(),
  });
}
