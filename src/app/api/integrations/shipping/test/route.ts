/**
 * Shipping Carriers Connection Test
 *
 * POST /api/integrations/shipping/test
 *
 * Test connection to one or all shipping carriers
 * Requires authenticated user
 *
 * Body:
 * {
 *   "carrier": "usps|ups|fedex|all" (optional, defaults to "all")
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { shippingClient } from "@/lib/integrations/shipping-carriers";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Shipping Test] POST request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(
        `[Shipping Test] Insufficient privileges for user: ${user.email}`
      );
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const carrier = body.carrier || "all";

    logger.info(`[Shipping Test] Testing ${carrier} carrier(s) by ${user.email}`);

    if (carrier === "all") {
      // Test all carriers
      const uspsResult = await shippingClient.testConnection("usps");
      const upsResult = await shippingClient.testConnection("ups");
      const fedexResult = await shippingClient.testConnection("fedex");

      const allConnected =
        uspsResult.success || upsResult.success || fedexResult.success;

      return NextResponse.json(
        {
          success: allConnected,
          carriers: {
            usps: {
              connected: uspsResult.success,
              message: uspsResult.success ? "Connected" : uspsResult.error,
            },
            ups: {
              connected: upsResult.success,
              message: upsResult.success ? "Connected" : upsResult.error,
            },
            fedex: {
              connected: fedexResult.success,
              message: fedexResult.success ? "Connected" : fedexResult.error,
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status: allConnected ? 200 : 503 }
      );
    } else if (["usps", "ups", "fedex"].includes(carrier)) {
      // Test single carrier
      const result = await shippingClient.testConnection(
        carrier as "usps" | "ups" | "fedex"
      );

      return NextResponse.json(
        {
          success: result.success,
          carrier,
          message: result.success ? "Connected" : result.error,
          timestamp: result.data?.timestamp || new Date().toISOString(),
        },
        { status: result.success ? 200 : 503 }
      );
    } else {
      return NextResponse.json(
        { error: `Invalid carrier: ${carrier}. Use usps|ups|fedex|all` },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("[Shipping Test] Connection test failed", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
