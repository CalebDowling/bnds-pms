/**
 * Twilio Webhook Handler
 *
 * POST /api/integrations/twilio/webhook
 *
 * Receives status callbacks from Twilio for:
 * - SMS delivery receipts
 * - Call status updates
 * - Fax delivery status
 *
 * No authentication required (Twilio webhooks)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    // Parse webhook data
    const messageStatus = params.get("MessageStatus");
    const messageSid = params.get("MessageSid");
    const callSid = params.get("CallSid");
    const callStatus = params.get("CallStatus");
    const faxSid = params.get("FaxSid");
    const faxStatus = params.get("FaxStatus");

    // Determine event type
    let eventType = "unknown";
    let resourceId = "unknown";
    let status = "unknown";

    if (messageSid && messageStatus) {
      eventType = "sms_status";
      resourceId = messageSid;
      status = messageStatus;
    } else if (callSid && callStatus) {
      eventType = "call_status";
      resourceId = callSid;
      status = callStatus;
    } else if (faxSid && faxStatus) {
      eventType = "fax_status";
      resourceId = faxSid;
      status = faxStatus;
    }

    logger.info(
      `[Twilio Webhook] Received ${eventType} event: ${resourceId} = ${status}`
    );

    // Store webhook event for audit trail
    await prisma.auditLog
      .create({
        data: {
          userId: "00000000-0000-0000-0000-000000000000",
          action: `twilio_webhook_${eventType}`,
          tableName: "communications",
          recordId: resourceId,
          newValues: {
            eventType,
            status,
            rawData: Object.fromEntries(params),
          },
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        },
      })
      .catch((err) => {
        logger.error("[Twilio Webhook] Failed to log event", err);
      });

    return NextResponse.json(
      {
        success: true,
        eventType,
        resourceId,
        status,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Twilio Webhook] Failed to process webhook", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
