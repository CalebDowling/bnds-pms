/**
 * Stripe Connection Test
 *
 * POST /api/integrations/payments/test
 *
 * Test Stripe API credentials and connectivity
 * Requires authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripePaymentClient } from "@/lib/integrations/payments";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Stripe Test] POST request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(`[Stripe Test] Insufficient privileges for user: ${user.email}`);
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    logger.info("[Stripe Test] Testing connection by user: " + user.email);

    // Test connection
    const result = await stripePaymentClient.testConnection();

    return NextResponse.json(
      {
        success: result.success,
        message: result.success
          ? "Stripe connection successful"
          : result.error,
        timestamp: result.data?.timestamp || new Date().toISOString(),
      },
      { status: result.success ? 200 : 503 }
    );
  } catch (error) {
    logger.error("[Stripe Test] Connection test failed", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
