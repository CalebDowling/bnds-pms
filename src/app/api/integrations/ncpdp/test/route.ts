/**
 * NCPDP Switch Connection Test Endpoint
 *
 * POST /api/integrations/ncpdp/test
 *
 * Tests the NCPDP switch connection with provided credentials.
 * Requires authenticated user with admin/pharmacist privileges.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { NCPDPClaimsClient } from "@/lib/integrations/ncpdp-claims";
import { logger } from "@/lib/logger";

/**
 * POST /api/integrations/ncpdp/test
 *
 * Test NCPDP switch connection
 *
 * Body (optional):
 * {
 *   "switchUrl": "override_switch_url",
 *   "senderId": "override_sender_id",
 *   "password": "override_password",
 *   "processorId": "override_processor_id"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[NCPDP Test] Unauthorized test attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin/pharmacist privileges
    if (!user.isAdmin && !user.isPharmacist) {
      logger.warn(
        `[NCPDP Test] Insufficient privileges for user: ${user.email}`
      );
      return NextResponse.json(
        { error: "Forbidden: Admin or Pharmacist role required" },
        { status: 403 }
      );
    }

    logger.info(`[NCPDP Test] Connection test initiated by ${user.email}`);

    // Get optional override credentials from request body
    let switchUrl: string | undefined;
    let senderId: string | undefined;
    let password: string | undefined;
    let processorId: string | undefined;

    try {
      const body = await request.json().catch(() => ({}));
      switchUrl = body.switchUrl;
      senderId = body.senderId;
      password = body.password;
      processorId = body.processorId;
    } catch {
      // No body provided, use environment variables
    }

    // Create test client with overrides if provided
    let client: InstanceType<typeof NCPDPClaimsClient>;
    if (switchUrl || senderId || password || processorId) {
      try {
        client = new NCPDPClaimsClient(switchUrl, senderId, password, processorId);
      } catch (error) {
        logger.error(
          "[NCPDP Test] Failed to create test client with overrides",
          error
        );
        return NextResponse.json(
          {
            success: false,
            error: "Invalid credentials provided",
          },
          { status: 400 }
        );
      }
    } else {
      const { ncpdpClaimsClient } = await import("@/lib/integrations/ncpdp-claims");
      client = ncpdpClaimsClient;
    }

    // Run connection test
    const result = await client.testConnection();

    logger.info(
      `[NCPDP Test] Connection test completed: ${
        result.connected ? "SUCCESS" : "FAILED"
      }`
    );

    return NextResponse.json(
      {
        success: result.connected,
        connected: result.connected,
        message: result.message,
        timestamp: result.timestamp,
        tested_by: user.email,
      },
      { status: result.connected ? 200 : 503 }
    );
  } catch (error) {
    logger.error("[NCPDP Test] Test execution failed", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
