/**
 * Shipping Tracking API Route
 *
 * GET /api/integrations/shipping/track/[trackingNumber]
 *
 * Track a package by tracking number
 * Auto-detects carrier from tracking number format
 * Public endpoint (no authentication required)
 */

import { NextRequest, NextResponse } from "next/server";
import { shippingClient } from "@/lib/integrations/shipping-carriers";
import { logger } from "@/lib/logger";

/**
 * Detect carrier from tracking number format
 */
function detectCarrier(
  trackingNumber: string
): "usps" | "ups" | "fedex" | null {
  if (!trackingNumber) return null;

  // USPS: 9400xxx or 9200xxx format, 22 digits
  if (/^9[24]00/.test(trackingNumber) && trackingNumber.length === 22) {
    return "usps";
  }

  // UPS: 1Z followed by 16 digits
  if (/^1Z/.test(trackingNumber) && trackingNumber.length === 18) {
    return "ups";
  }

  // FedEx: 12-14 digits
  if (/^\d{12,14}$/.test(trackingNumber)) {
    return "fedex";
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await params;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number required" },
        { status: 400 }
      );
    }

    logger.info(`[Shipping Track] Tracking: ${trackingNumber}`);

    // Auto-detect carrier
    const carrier = detectCarrier(trackingNumber);

    if (!carrier) {
      logger.warn(
        `[Shipping Track] Could not detect carrier for: ${trackingNumber}`
      );
      return NextResponse.json(
        {
          error:
            "Could not determine carrier from tracking number format",
          trackingNumber,
          hint: "Tracking number does not match USPS (9400/9200...), UPS (1Z...), or FedEx (...) format",
        },
        { status: 400 }
      );
    }

    // Get tracking info
    const result = await shippingClient.getTrackingInfo(
      carrier,
      trackingNumber
    );

    if (!result.success) {
      logger.warn(
        `[Shipping Track] Failed to get tracking for ${trackingNumber}: ${result.error}`
      );
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          trackingNumber,
          carrier,
        },
        { status: 400 }
      );
    }

    logger.info(
      `[Shipping Track] Retrieved tracking for ${trackingNumber}: ${result.data?.status}`
    );

    return NextResponse.json(
      {
        success: true,
        trackingNumber,
        carrier,
        tracking: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Shipping Track] Failed to get tracking info", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
