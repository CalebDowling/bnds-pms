/**
 * Twilio delivery-status webhook.
 *
 * Twilio POSTs here every time an outbound SMS changes state (queued → sent →
 * delivered / failed / undelivered). We persist each update so the dashboard
 * can show whether the pickup notification actually reached the patient,
 * not just whether we asked Twilio to send it.
 *
 * Signature validation:
 *   Twilio signs every callback with HMAC-SHA1(authToken, fullUrl + sortedParams).
 *   We use twilio's built-in `validateRequest` helper to verify against
 *   `X-Twilio-Signature`. Requests without a valid signature are rejected
 *   with 403 — protects against spoofing where someone POSTs fake `failed`
 *   updates to bury real delivery problems.
 *
 * Storage:
 *   - Adds a Notification with type "SMS_STATUS" (or "SMS_FAILED") matching
 *     the existing log shape used by /api/notifications/sms-pickup.
 *   - When the SID matches a fill we sent (via metadata.pickupNotification.messageId),
 *     we also write a FillEvent so the audit trail on /queue/process/[fillId]
 *     reflects the delivery outcome inline with other workflow events.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "twilio";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // Without an auth token we can't verify signatures. Refuse rather than
    // accepting unsigned input — this is a security boundary, not a feature
    // gate, so we don't want a silent no-op.
    return NextResponse.json(
      { error: "Twilio auth token not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("x-twilio-signature") || "";

  // Twilio sends form-encoded bodies. Read the raw text first so we can both
  // verify the signature and parse the params from the same payload.
  const rawBody = await request.text();
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(rawBody).entries()) {
    params[key] = value;
  }

  // Reconstruct the full webhook URL Twilio used. We trust the host header
  // because validateRequest will fail if it doesn't match what Twilio signed.
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.url.startsWith("https") ? "https" : "http");
  const host = request.headers.get("host") || "";
  const fullUrl = `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;

  const isValid = validateRequest(authToken, signature, fullUrl, params);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const messageSid = params.MessageSid || params.SmsSid;
  const messageStatus = params.MessageStatus || params.SmsStatus;
  const errorCode = params.ErrorCode || null;
  const to = params.To || null;

  if (!messageSid || !messageStatus) {
    return NextResponse.json(
      { error: "Missing MessageSid or MessageStatus" },
      { status: 400 }
    );
  }

  const isFailure =
    messageStatus === "failed" || messageStatus === "undelivered";
  const notificationType = isFailure ? "SMS_FAILED" : "SMS_STATUS";

  // Try to locate the original fill by the SID we stamped into metadata when
  // the pickup-ready SMS went out. If we can find one, we mirror the status
  // into the FillEvent audit trail so it shows up alongside other events on
  // /queue/process/[fillId]. Best-effort: if no match, we still log the
  // notification globally below.
  let matchingFillId: string | null = null;
  let originalSenderId: string | null = null;
  try {
    const fill = await prisma.prescriptionFill.findFirst({
      where: {
        metadata: {
          path: ["pickupNotification", "messageId"],
          equals: messageSid,
        },
      },
      select: {
        id: true,
        metadata: true,
      },
    });
    if (fill) {
      matchingFillId = fill.id;
      const meta = (fill.metadata as Record<string, unknown>) || {};
      const pickup = (meta.pickupNotification as
        | { sentBy?: string }
        | undefined) || undefined;
      originalSenderId = pickup?.sentBy || null;

      // Stamp the latest delivery state on the fill metadata so the panel
      // can render "Delivered ✓" / "Failed ✗" without scanning events.
      await prisma.prescriptionFill.update({
        where: { id: fill.id },
        data: {
          metadata: {
            ...meta,
            pickupNotification: {
              ...(pickup || {}),
              lastStatus: messageStatus,
              lastStatusAt: new Date().toISOString(),
              ...(errorCode ? { errorCode } : {}),
            },
          },
        },
      });

      // Write a FillEvent so the audit log shows delivery outcomes alongside
      // status changes. We need a performedBy (NOT NULL on fill_events); fall
      // back to the original sender so the row attributes correctly.
      if (originalSenderId) {
        await prisma.fillEvent.create({
          data: {
            fillId: fill.id,
            eventType: isFailure ? "sms_failed" : "sms_status",
            fromValue: null,
            toValue: messageStatus,
            performedBy: originalSenderId,
            notes: errorCode
              ? `Twilio ${messageStatus} (error ${errorCode}) for SID ${messageSid}`
              : `Twilio ${messageStatus} for SID ${messageSid}`,
          },
        });
      }
    }
  } catch (err) {
    // Don't fail the webhook on logging errors — Twilio will retry and we'd
    // rather record the status once than 503 it into a retry storm.
    console.error("[twilio-status] Failed to update fill audit:", err);
  }

  // Always write a top-level Notification too. This matches the existing
  // log shape used by /api/notifications/sms-pickup so a single feed shows
  // both sends and their delivery outcomes.
  if (originalSenderId) {
    try {
      await prisma.notification.create({
        data: {
          type: notificationType,
          title: isFailure
            ? `SMS delivery failed${to ? ` to ${to}` : ""}`
            : `SMS ${messageStatus}${to ? ` to ${to}` : ""}`,
          message: errorCode
            ? `Twilio reported ${messageStatus} (error ${errorCode}) for SID ${messageSid}.`
            : `Twilio reported ${messageStatus} for SID ${messageSid}.`,
          userId: originalSenderId,
          isRead: !isFailure, // failed deliveries surface as unread alerts
          metadata: {
            messageSid,
            messageStatus,
            errorCode,
            to,
            fillId: matchingFillId,
          },
        },
      });
    } catch (err) {
      console.error("[twilio-status] Failed to write notification:", err);
    }
  }

  // Twilio expects a 2xx with no body (or any short body). Returning JSON is
  // fine — what matters is the status code.
  return NextResponse.json({ ok: true });
}
