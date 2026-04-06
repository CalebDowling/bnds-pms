/**
 * Shipping Carriers Integration API Routes
 *
 * POST /api/integrations/shipping — Get rates, validate address, create shipment
 * GET /api/integrations/shipping — Check connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { shippingClient } from "@/lib/integrations/shipping-carriers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/integrations/shipping
 *
 * Validate address, get rates, or create shipment
 * Requires authenticated user with order/pharmacist privileges
 *
 * Body (get rates):
 * {
 *   "action": "rates|validate|create",
 *   "origin": { Address },
 *   "destination": { Address },
 *   "package": { Package }
 * }
 *
 * Body (validate):
 * {
 *   "action": "validate",
 *   "address": { Address }
 * }
 *
 * Body (create):
 * {
 *   "action": "create",
 *   "shipmentData": { ShipmentData }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Shipping API] POST request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(
        `[Shipping API] Insufficient privileges for user: ${user.email}`
      );
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, address, origin, destination, package: pkg, shipmentData } =
      body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action (rates|validate|create)" },
        { status: 400 }
      );
    }

    logger.info(`[Shipping API] Processing ${action} by ${user.email}`);

    let result: any;

    switch (action) {
      case "validate":
        if (!address) {
          return NextResponse.json(
            { error: "address required for validate action" },
            { status: 400 }
          );
        }
        result = await shippingClient.validateAddress(address);
        break;

      case "rates":
        if (!origin || !destination || !pkg) {
          return NextResponse.json(
            {
              error:
                "origin, destination, and package required for rates action",
            },
            { status: 400 }
          );
        }
        result = await shippingClient.getRates(origin, destination, pkg);
        break;

      case "create":
        if (!shipmentData) {
          return NextResponse.json(
            { error: "shipmentData required for create action" },
            { status: 400 }
          );
        }
        result = await shippingClient.createShipment(shipmentData);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      logger.warn(`[Shipping API] ${action} failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Log transaction for audit trail
    const resourceId = result.data?.shipmentId || `shipment-${Date.now()}`;
    await prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: `shipping_${action}`,
          tableName: "shipments",
          recordId: resourceId,
          newValues: {
            action,
            carrier: result.data?.carrier || result.carrier,
            status: result.data?.status,
            trackingNumber: result.data?.trackingNumber,
          },
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        },
      })
      .catch((err) => {
        logger.error("[Shipping API] Failed to create audit log", err);
      });

    logger.info(
      `[Shipping API] ${action} completed (ID: ${resourceId})`
    );

    // Format response based on action
    if (action === "rates") {
      return NextResponse.json(
        {
          success: true,
          action,
          rates: result.data,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        action,
        carrier: result.data?.carrier,
        shipmentId: result.data?.shipmentId,
        trackingNumber: result.data?.trackingNumber,
        status: result.data?.status,
        labelUrl: result.data?.labelUrl,
        validated: result.data?.validated,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Shipping API] Request processing failed", error);
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
 * GET /api/integrations/shipping
 *
 * Check Shipping carriers connection status
 * Requires authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Shipping API] GET request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("[Shipping API] Checking connection status");

    // Test all carriers
    const uspsStatus = await shippingClient.testConnection("usps");
    const upsStatus = await shippingClient.testConnection("ups");
    const fedexStatus = await shippingClient.testConnection("fedex");

    const allConnected =
      uspsStatus.success || upsStatus.success || fedexStatus.success;

    return NextResponse.json(
      {
        connected: allConnected,
        carriers: {
          usps: {
            connected: uspsStatus.success,
            message: uspsStatus.success ? "Connected" : uspsStatus.error,
          },
          ups: {
            connected: upsStatus.success,
            message: upsStatus.success ? "Connected" : upsStatus.error,
          },
          fedex: {
            connected: fedexStatus.success,
            message: fedexStatus.success ? "Connected" : fedexStatus.error,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: allConnected ? 200 : 503 }
    );
  } catch (error) {
    logger.error("[Shipping API] Connection test failed", error);
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
