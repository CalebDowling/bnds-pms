/**
 * Twilio Integration API Routes
 *
 * POST /api/integrations/twilio — Send SMS, Voice, or Fax
 * GET /api/integrations/twilio — Check connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { twilioClient } from "@/lib/integrations/twilio";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/integrations/twilio
 *
 * Send SMS, Voice, or Fax message
 * Requires authenticated user with pharmacist/admin privileges
 *
 * Body:
 * {
 *   "type": "sms|voice|fax",
 *   "to": "+1234567890",
 *   "body": "Message text (SMS/Voice)",
 *   "mediaUrl": "https://... (Fax only)",
 *   "twiml": "<Response>... (Voice only)"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Twilio API] POST request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(`[Twilio API] Insufficient privileges for user: ${user.email}`);
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, to, body: messageBody, mediaUrl, twiml } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: "Missing required fields: type, to" },
        { status: 400 }
      );
    }

    logger.info(
      `[Twilio API] Processing ${type} request by ${user.email}`
    );

    let result: any;

    switch (type) {
      case "sms":
        if (!messageBody) {
          return NextResponse.json(
            { error: "body required for SMS" },
            { status: 400 }
          );
        }
        result = await twilioClient.sendSMS(to, messageBody);
        break;

      case "voice":
        const defaultTwiml =
          twiml ||
          twilioClient.generateIVR([
            {
              digit: "1",
              description: "Check prescription status",
              action: "check-status",
            },
            {
              digit: "2",
              description: "Request refill",
              action: "request-refill",
            },
          ]);
        result = await twilioClient.makeCall(to, defaultTwiml);
        break;

      case "fax":
        if (!mediaUrl) {
          return NextResponse.json(
            { error: "mediaUrl required for Fax" },
            { status: 400 }
          );
        }
        result = await twilioClient.sendFax(to, mediaUrl);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      logger.warn(`[Twilio API] ${type} failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Log transaction for audit trail
    const resourceId = result.data?.sid || `${type}-${Date.now()}`;
    await prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: `twilio_${type}_send`,
          tableName: "communications",
          recordId: resourceId,
          newValues: {
            type,
            to,
            status: result.data?.status || "queued",
          },
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        },
      })
      .catch((err) => {
        logger.error("[Twilio API] Failed to create audit log", err);
      });

    logger.info(
      `[Twilio API] ${type} sent successfully (SID: ${resourceId})`
    );

    return NextResponse.json(
      {
        success: true,
        type,
        messageId: result.data?.sid,
        status: result.data?.status,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Twilio API] Request processing failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/twilio
 *
 * Check Twilio connection status
 * Requires authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Twilio API] GET request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("[Twilio API] Checking connection status");

    // Test connection
    const status = await twilioClient.testConnection();

    return NextResponse.json(
      {
        connected: status.success,
        message: status.success
          ? "Twilio connection successful"
          : status.error,
        timestamp: new Date().toISOString(),
      },
      { status: status.success ? 200 : 503 }
    );
  } catch (error) {
    logger.error("[Twilio API] Connection test failed", error);
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
