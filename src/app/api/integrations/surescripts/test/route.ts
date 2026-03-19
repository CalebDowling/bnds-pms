/**
 * SureScripts Connection Test Endpoint
 *
 * POST /api/integrations/surescripts/test
 *
 * Tests the SureScripts connection with provided credentials.
 * Requires authenticated user with admin privileges.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SureScriptsClient } from "@/lib/integrations/surescripts";
import { logger } from "@/lib/logger";

/**
 * POST /api/integrations/surescripts/test
 *
 * Test SureScripts connection
 *
 * Body (optional):
 * {
 *   "partnerId": "override_partner_id",
 *   "apiKey": "override_api_key",
 *   "endpoint": "override_endpoint"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[SureScripts Test] Unauthorized test attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin privileges
    if (!user.isAdmin && !user.roles.includes("pharmacist")) {
      logger.warn(
        `[SureScripts Test] Insufficient privileges for user: ${user.email}`
      );
      return NextResponse.json(
        { error: "Forbidden: Admin or Pharmacist role required" },
        { status: 403 }
      );
    }

    logger.info(`[SureScripts Test] Connection test initiated by ${user.email}`);

    // Get optional override credentials from request body
    let partnerId: string | undefined;
    let apiKey: string | undefined;
    let endpoint: string | undefined;

    try {
      const body = await request.json().catch(() => ({}));
      partnerId = body.partnerId;
      apiKey = body.apiKey;
      endpoint = body.endpoint;
    } catch {
      // No body provided, use environment variables
    }

    // Create test client with overrides if provided
    let client: SureScriptsClient;
    if (partnerId || apiKey || endpoint) {
      try {
        client = new SureScriptsClient(partnerId, apiKey, endpoint);
      } catch (error) {
        logger.error(
          "[SureScripts Test] Failed to create test client with overrides",
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
      const { surescriptsClient } = await import("@/lib/integrations/surescripts");
      client = surescriptsClient;
    }

    // Run connection test
    const result = await client.testConnection();

    logger.info(
      `[SureScripts Test] Connection test completed: ${
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
    logger.error("[SureScripts Test] Test execution failed", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
