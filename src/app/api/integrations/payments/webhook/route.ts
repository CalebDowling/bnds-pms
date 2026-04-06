/**
 * Stripe Webhook Handler
 *
 * POST /api/integrations/payments/webhook
 *
 * Receives events from Stripe for:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 * - customer.created
 *
 * No authentication required (Stripe webhooks)
 */

import { NextRequest, NextResponse } from "next/server";
import { stripePaymentClient } from "@/lib/integrations/payments";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    // Verify and parse webhook
    const webhookResult = stripePaymentClient.processWebhook(body, signature);

    if (!webhookResult.success) {
      logger.warn(`[Stripe Webhook] Invalid signature: ${webhookResult.error}`);
      return NextResponse.json(
        { error: webhookResult.error },
        { status: 400 }
      );
    }

    const event = webhookResult.data;
    if (!event) {
      return NextResponse.json(
        { error: "No event data" },
        { status: 400 }
      );
    }

    const eventType = event.type;
    const eventObject = event.data.object as Record<string, unknown>;
    const eventId = event.id;

    logger.info(`[Stripe Webhook] Processing event: ${eventType}`);

    // Handle different event types
    let action = "webhook_unknown";

    switch (eventType) {
      case "payment_intent.succeeded": {
        action = "payment_intent_succeeded";
        const paymentIntentId = (eventObject.id as string) || "";
        const amount = (eventObject.amount as number) || 0;
        logger.info(
          `[Stripe Webhook] Payment succeeded: ${paymentIntentId}`
        );

        // Store event for audit trail
        await prisma.auditLog
          .create({
            data: {
              userId: "00000000-0000-0000-0000-000000000000",
              action,
              tableName: "payments",
              recordId: paymentIntentId,
              newValues: {
                eventType,
                eventId,
                amount,
                status: "succeeded",
              },
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
          })
          .catch((err) => {
            logger.error("[Stripe Webhook] Failed to log event", err);
          });
        break;
      }

      case "payment_intent.payment_failed": {
        action = "payment_intent_failed";
        const paymentIntentId = (eventObject.id as string) || "";
        const amount = (eventObject.amount as number) || 0;
        logger.warn(
          `[Stripe Webhook] Payment failed: ${paymentIntentId}`
        );

        await prisma.auditLog
          .create({
            data: {
              userId: "00000000-0000-0000-0000-000000000000",
              action,
              tableName: "payments",
              recordId: paymentIntentId,
              newValues: {
                eventType,
                eventId,
                amount,
                status: "failed",
                errorCode: (eventObject.last_payment_error as any)?.code,
              },
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
          })
          .catch((err) => {
            logger.error("[Stripe Webhook] Failed to log event", err);
          });
        break;
      }

      case "charge.refunded": {
        action = "charge_refunded";
        const chargeId = (eventObject.id as string) || "";
        const amount = (eventObject.amount_refunded as number) || 0;
        logger.info(`[Stripe Webhook] Charge refunded: ${chargeId}`);

        await prisma.auditLog
          .create({
            data: {
              userId: "00000000-0000-0000-0000-000000000000",
              action,
              tableName: "payments",
              recordId: chargeId,
              newValues: {
                eventType,
                eventId,
                refundAmount: amount,
                status: "refunded",
              },
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
          })
          .catch((err) => {
            logger.error("[Stripe Webhook] Failed to log event", err);
          });
        break;
      }

      case "customer.created": {
        action = "customer_created";
        const customerId = (eventObject.id as string) || "";
        logger.info(`[Stripe Webhook] Customer created: ${customerId}`);

        await prisma.auditLog
          .create({
            data: {
              userId: "00000000-0000-0000-0000-000000000000",
              action,
              tableName: "stripe_customers",
              recordId: customerId,
              newValues: {
                eventType,
                eventId,
                email: String(eventObject.email || ""),
              },
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            },
          })
          .catch((err) => {
            logger.error("[Stripe Webhook] Failed to log event", err);
          });
        break;
      }

      default:
        logger.debug(`[Stripe Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json(
      {
        success: true,
        eventType,
        eventId,
        action,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Stripe Webhook] Failed to process webhook", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
