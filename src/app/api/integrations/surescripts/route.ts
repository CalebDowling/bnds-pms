/**
 * SureScripts Integration API Routes
 *
 * POST /api/integrations/surescripts — Receive inbound messages from SureScripts
 * GET /api/integrations/surescripts — Check connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { surescriptsClient, InboundRxMessage } from "@/lib/integrations/surescripts";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/integrations/surescripts
 *
 * Receive inbound messages from SureScripts webhook.
 * Authenticates request and processes NCPDP SCRIPT messages.
 *
 * Header: Authorization: Bearer <API_KEY>
 * Body: XML or JSON with NCPDP SCRIPT message
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate with API key (must be provided in Authorization header)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("[SureScripts API] Missing or invalid Authorization header");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);
    if (apiKey !== process.env.SURESCRIPTS_WEBHOOK_API_KEY) {
      logger.warn("[SureScripts API] Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get request body
    const contentType = request.headers.get("Content-Type") || "";
    let xmlData: string;

    if (contentType.includes("application/json")) {
      const json = await request.json();
      xmlData = String(json.message || json.xml || "");
    } else {
      xmlData = await request.text();
    }

    if (!xmlData) {
      logger.error("[SureScripts API] No message data provided");
      return NextResponse.json(
        { error: "Missing message data" },
        { status: 400 }
      );
    }

    // Process inbound message
    const message = await surescriptsClient.processInboundMessage(xmlData);

    logger.info(`[SureScripts API] Processing inbound message: ${message.messageType}`);

    // Store raw message in audit log for compliance
    await prisma.auditLog.create({
      data: {
        userId: "00000000-0000-0000-0000-000000000000", // System user ID
        action: "erx_inbound",
        tableName: "prescriptions",
        recordId: message.rxId || message.messageId,
        newValues: {
          messageType: message.messageType,
          messageId: message.messageId,
          timestamp: message.timestamp,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    }).catch((err) => {
      logger.error("[SureScripts API] Failed to create audit log", err);
    });

    // Route message based on type
    const result = await routeInboundMessage(message);

    // Send acknowledgement
    logger.info(
      `[SureScripts API] Inbound message processed successfully: ${message.messageId}`
    );

    return NextResponse.json(
      {
        success: true,
        messageId: message.messageId,
        processed: result.processed,
        action: result.action,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[SureScripts API] Inbound message processing failed", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/surescripts
 *
 * Check SureScripts connection status
 * Requires authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[SureScripts API] GET request without authentication");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info("[SureScripts API] Checking connection status");

    // Test connection
    const status = await surescriptsClient.testConnection();

    return NextResponse.json(
      {
        connected: status.connected,
        message: status.message,
        timestamp: status.timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[SureScripts API] Connection test failed", error);

    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Route inbound message to appropriate handler
 */
async function routeInboundMessage(
  message: InboundRxMessage
): Promise<{ processed: boolean; action: string }> {
  switch (message.messageType) {
    case "NEWRX":
      // New prescription received
      return await handleNewRx(message);

    case "RXCHG":
      // Prescription change from prescriber
      return await handleRxChange(message);

    case "RXREN":
      // Renewal request from prescriber
      return await handleRxRenewal(message);

    case "CANRX":
      // Prescription cancellation from prescriber
      return await handleRxCancel(message);

    case "RXSTAT":
      // Prescription status query
      return { processed: true, action: "status_query" };

    default:
      logger.warn(`[SureScripts API] Unknown message type: ${message.messageType}`);
      return { processed: false, action: "unknown_type" };
  }
}

/**
 * Handle new prescription (NEWRX)
 */
async function handleNewRx(
  message: InboundRxMessage
): Promise<{ processed: boolean; action: string }> {
  try {
    logger.info(`[SureScripts API] Handling NEWRX: ${message.messageId}`);

    // Store in intake queue for processing
    if (message.rxId) {
      await prisma.intakeQueueItem.create({
        data: {
          source: "surescripts",
          messageId: message.messageId,
          rawData: JSON.parse(JSON.stringify(message)),
          status: "pending",
          patientName: message.patientName,
          prescriberName: message.prescriberName,
          drugName: message.drugName,
          priority: "normal",
        },
      }).catch((err) => {
        logger.error("[SureScripts API] Failed to create intake queue item", err);
      });
    }

    return { processed: true, action: "new_rx_received" };
  } catch (error) {
    logger.error("[SureScripts API] Error handling NEWRX", error);
    return { processed: false, action: "new_rx_error" };
  }
}

/**
 * Handle prescription change (RXCHG)
 */
async function handleRxChange(
  message: InboundRxMessage
): Promise<{ processed: boolean; action: string }> {
  try {
    logger.info(`[SureScripts API] Handling RXCHG: ${message.messageId}`);

    // Find prescription and update
    if (message.rxId) {
      const prescription = await prisma.prescription.findFirst({
        where: { externalId: message.rxId },
      });

      if (prescription) {
        // Log change in PrescriptionStatusLog
        await prisma.prescriptionStatusLog.create({
          data: {
            prescriptionId: prescription.id,
            fromStatus: prescription.status,
            toStatus: "pending_review",
            changedBy: "00000000-0000-0000-0000-000000000000", // System user
            notes: `Change requested via SureScripts: ${message.messageId}`,
          },
        }).catch((err) => {
          logger.error("[SureScripts API] Failed to create status log", err);
        });
      }
    }

    return { processed: true, action: "rx_change_received" };
  } catch (error) {
    logger.error("[SureScripts API] Error handling RXCHG", error);
    return { processed: false, action: "rx_change_error" };
  }
}

/**
 * Handle renewal request (RXREN)
 */
async function handleRxRenewal(
  message: InboundRxMessage
): Promise<{ processed: boolean; action: string }> {
  try {
    logger.info(`[SureScripts API] Handling RXREN: ${message.messageId}`);

    if (message.rxId) {
      const prescription = await prisma.prescription.findFirst({
        where: { externalId: message.rxId },
      });

      if (prescription) {
        // Create renewal request
        await prisma.renewal.create({
          data: {
            prescriptionId: prescription.id,
            prescriberId: prescription.prescriberId,
            patientId: prescription.patientId,
            method: "surescripts",
            status: "pending",
          },
        }).catch((err) => {
          logger.error("[SureScripts API] Failed to create renewal", err);
        });
      }
    }

    return { processed: true, action: "renewal_request_received" };
  } catch (error) {
    logger.error("[SureScripts API] Error handling RXREN", error);
    return { processed: false, action: "renewal_error" };
  }
}

/**
 * Handle cancellation (CANRX)
 */
async function handleRxCancel(
  message: InboundRxMessage
): Promise<{ processed: boolean; action: string }> {
  try {
    logger.info(`[SureScripts API] Handling CANRX: ${message.messageId}`);

    if (message.rxId) {
      const prescription = await prisma.prescription.findFirst({
        where: { externalId: message.rxId },
      });

      if (prescription && prescription.status !== "cancelled") {
        // Update prescription status to cancelled
        await prisma.prescription.update({
          where: { id: prescription.id },
          data: { status: "cancelled" },
        }).catch((err) => {
          logger.error("[SureScripts API] Failed to cancel prescription", err);
        });
      }
    }

    return { processed: true, action: "cancellation_received" };
  } catch (error) {
    logger.error("[SureScripts API] Error handling CANRX", error);
    return { processed: false, action: "cancellation_error" };
  }
}
