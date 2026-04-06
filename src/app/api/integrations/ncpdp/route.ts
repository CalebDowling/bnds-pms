/**
 * NCPDP Claims Integration API Routes
 *
 * POST /api/integrations/ncpdp — Submit a claim
 * GET /api/integrations/ncpdp — Check connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ncpdpClaimsClient,
  type ClaimData,
} from "@/lib/integrations/ncpdp-claims";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/integrations/ncpdp
 *
 * Submit a claim to the insurance switch.
 * Requires authenticated user with billing/pharmacist privileges.
 *
 * Body:
 * {
 *   "claimData": { ClaimData object },
 *   "actionType": "submit|reverse|rebill|eligibility|priorauth"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[NCPDP API] POST request without authentication");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(`[NCPDP API] Insufficient privileges for user: ${user.email}`);
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { claimData, actionType = "submit" } = body;

    if (!claimData) {
      return NextResponse.json(
        { error: "Missing claimData in request body" },
        { status: 400 }
      );
    }

    logger.info(
      `[NCPDP API] Processing ${actionType} request by ${user.email}`
    );

    let result: Record<string, unknown> & { messageId: string; status: string };

    switch (actionType) {
      case "submit": {
        const submitResult = await ncpdpClaimsClient.submitClaim(claimData as ClaimData);
        result = JSON.parse(JSON.stringify(submitResult)) as Record<string, unknown> & { messageId: string; status: string };
        break;
      }

      case "reverse": {
        if (!claimData.claimNumber) {
          return NextResponse.json(
            { error: "claimNumber required for reverse action" },
            { status: 400 }
          );
        }
        const reverseResult = await ncpdpClaimsClient.reverseClaim(claimData.claimNumber);
        result = JSON.parse(JSON.stringify(reverseResult)) as Record<string, unknown> & { messageId: string; status: string };
        break;
      }

      case "rebill": {
        if (!claimData.claimNumber) {
          return NextResponse.json(
            { error: "claimNumber required for rebill action" },
            { status: 400 }
          );
        }
        const rebillResult = await ncpdpClaimsClient.submitRebill(
          claimData.claimNumber,
          claimData
        );
        result = JSON.parse(JSON.stringify(rebillResult)) as Record<string, unknown> & { messageId: string; status: string };
        break;
      }

      case "eligibility":
        const eligResult = await ncpdpClaimsClient.checkEligibility(
          {
            firstName: claimData.patientFirstName,
            lastName: claimData.patientLastName,
            dateOfBirth: claimData.patientDateOfBirth,
          },
          {
            memberId: claimData.memberId,
            bin: claimData.planBin,
            pcn: claimData.planPcn,
            groupNumber: claimData.groupNumber,
            personCode: claimData.personCode,
          }
        );
        result = {
          status: eligResult.eligible ? "approved" : "rejected",
          messageId: eligResult.responseCode || `msg-${Date.now()}`,
          approvedAmount: eligResult.copayAmount,
        };
        break;

      case "priorauth":
        const paResult = await ncpdpClaimsClient.priorAuthRequest({
          patientFirstName: claimData.patientFirstName,
          patientLastName: claimData.patientLastName,
          patientDateOfBirth: claimData.patientDateOfBirth,
          memberId: claimData.memberId,
          planBin: claimData.planBin,
          drugNdc: claimData.drugNdc,
          quantity: claimData.quantity,
          daysSupply: claimData.daysSupply,
          prescriberNpi: claimData.prescriberNpi,
          pharmacyNpi: claimData.pharmacyNpi,
          reason: claimData.reason,
        });
        result = {
          status: paResult.approved ? "approved" : "rejected",
          messageId: paResult.messageId,
          claimId: paResult.authCode,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action type: ${actionType}` },
          { status: 400 }
        );
    }

    // Log claim transaction for audit trail
    const claimId = String(result.claimId || result.messageId);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `ncpdp_${actionType}`,
        tableName: "claims",
        recordId: claimId.length === 36 ? claimId : `claim-${claimId}`,
        newValues: {
          actionType,
          status: result.status,
          messageId: result.messageId,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    }).catch((err) => {
      logger.error("[NCPDP API] Failed to create audit log", err);
    });

    logger.info(
      `[NCPDP API] ${actionType} completed with status: ${result.status}`
    );

    return NextResponse.json(
      {
        success: result.status === "approved",
        claimId: result.claimId,
        messageId: result.messageId,
        status: result.status,
        approvedAmount: result.approvedAmount,
        denialCodes: result.denialCodes,
        denialMessages: result.denialMessages,
      },
      {
        status:
          result.status === "approved"
            ? 200
            : result.status === "rejected"
              ? 400
              : 202,
      }
    );
  } catch (error) {
    logger.error("[NCPDP API] Request processing failed", error);

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
 * GET /api/integrations/ncpdp
 *
 * Check NCPDP switch connection status.
 * Requires authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[NCPDP API] GET request without authentication");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info("[NCPDP API] Checking connection status");

    // Test connection
    const status = await ncpdpClaimsClient.testConnection();

    return NextResponse.json(
      {
        connected: status.connected,
        message: status.message,
        timestamp: status.timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[NCPDP API] Connection test failed", error);

    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
