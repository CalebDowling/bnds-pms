/**
 * Stripe Payment Processing API Routes
 *
 * POST /api/integrations/payments — Create/process payment
 * GET /api/integrations/payments — Check connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripePaymentClient } from "@/lib/integrations/payments";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/integrations/payments
 *
 * Create payment intent, capture payment, or refund
 * Requires authenticated user with billing/pharmacist privileges
 *
 * Body (for payment intent):
 * {
 *   "action": "create|capture|refund",
 *   "amount": 5000,
 *   "currency": "usd",
 *   "paymentIntentId": "pi_... (for capture/refund)",
 *   "metadata": { "orderId": "...", "patientId": "..." }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Payments API] POST request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!user.isPharmacist && !user.isAdmin) {
      logger.warn(
        `[Payments API] Insufficient privileges for user: ${user.email}`
      );
      return NextResponse.json(
        { error: "Forbidden: Pharmacist or Admin role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, amount, currency = "usd", paymentIntentId, metadata } =
      body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action (create|capture|refund)" },
        { status: 400 }
      );
    }

    logger.info(`[Payments API] Processing ${action} by ${user.email}`);

    let result: any;

    switch (action) {
      case "create":
        if (!amount) {
          return NextResponse.json(
            { error: "amount required for create action" },
            { status: 400 }
          );
        }
        result = await stripePaymentClient.createPaymentIntent(
          amount,
          currency,
          metadata
        );
        break;

      case "capture":
        if (!paymentIntentId) {
          return NextResponse.json(
            { error: "paymentIntentId required for capture action" },
            { status: 400 }
          );
        }
        result = await stripePaymentClient.capturePayment(paymentIntentId);
        break;

      case "refund":
        if (!paymentIntentId) {
          return NextResponse.json(
            { error: "paymentIntentId required for refund action" },
            { status: 400 }
          );
        }
        result = await stripePaymentClient.refundPayment(
          paymentIntentId,
          amount
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      logger.warn(`[Payments API] ${action} failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Log transaction for audit trail
    const resourceId = result.data?.id || `payment-${Date.now()}`;
    await prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: `stripe_${action}`,
          tableName: "payments",
          recordId: resourceId,
          newValues: {
            action,
            status: result.data?.status,
            amount: result.data?.amount,
            currency: result.data?.currency,
          },
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        },
      })
      .catch((err) => {
        logger.error("[Payments API] Failed to create audit log", err);
      });

    logger.info(`[Payments API] ${action} completed (ID: ${resourceId})`);

    return NextResponse.json(
      {
        success: true,
        action,
        paymentId: result.data?.id,
        status: result.data?.status,
        amount: result.data?.amount,
        currency: result.data?.currency,
        clientSecret: result.data?.client_secret,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Payments API] Request processing failed", error);
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
 * GET /api/integrations/payments
 *
 * Check Stripe connection status
 * Requires authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await getCurrentUser();
    if (!user) {
      logger.warn("[Payments API] GET request without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("[Payments API] Checking connection status");

    // Test connection
    const status = await stripePaymentClient.testConnection();

    return NextResponse.json(
      {
        connected: status.success,
        message: status.success
          ? "Stripe connection successful"
          : status.error,
        timestamp: status.data?.timestamp || new Date().toISOString(),
      },
      { status: status.success ? 200 : 503 }
    );
  } catch (error) {
    logger.error("[Payments API] Connection test failed", error);
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
