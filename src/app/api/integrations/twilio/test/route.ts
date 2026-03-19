/**
 * Twilio Connection Test
 *
 * POST /api/integrations/twilio/test
 *
 * Test Twilio API credentials and connectivity
 * Requires authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { twilioClient } from "@/lib/integrations/twilio";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Twilio Test] POST request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(`[Twilio Test] Insufficient privileges for user: ${user.email}`);
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    logger.info("[Twilio Test] Testing connection by user: " + user.email);

    // Test connection
    const result = await twilioClient.testConnection();

    return NextResponse.json(
      {
        success: result.success,
        message: result.success
          ? "Twilio connection successful"
          : result.error,
        timestamp: result.data?.timestamp || new Date().toISOString(),
      },
      { status: result.success ? 200 : 503 }
    );
  } catch (error) {
    logger.error("[Twilio Test] Connection test failed", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
