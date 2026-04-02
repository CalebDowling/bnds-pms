import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import {
  createPaymentIntent,
  processPayment,
  capturePaymentIntent,
  cancelPaymentIntent,
  getPaymentIntent,
  type TerminalPaymentMethod,
} from "@/lib/integrations/stripe-terminal";

/**
 * POST /api/pos/payment
 * Create a new terminal payment intent for a prescription copay.
 *
 * Request body:
 *   - amount: number (required)     — Amount in cents (e.g., 1250 = $12.50)
 *   - fillId?: string               — Prescription fill ID
 *   - patientId?: string            — Patient ID
 *   - sessionId?: string            — POS session ID
 *   - description?: string          — Receipt description
 *   - paymentMethod?: string        — "card_present" | "contactless" | "manual_entry"
 *   - isFsaHsa?: boolean            — FSA/HSA-eligible purchase
 *   - readerId?: string             — Reader ID to immediately begin collection
 *
 * Response:
 *   - paymentIntent: TerminalPaymentIntent
 *   - reader?: TerminalReader  (if readerId was provided)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      amount,
      fillId,
      patientId,
      sessionId,
      description,
      paymentMethod,
      isFsaHsa,
      readerId,
    } = body;

    // --- Validation ---

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "amount is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount) || amount < 1) {
      return NextResponse.json(
        { error: "amount must be a positive integer (cents)" },
        { status: 400 }
      );
    }

    const validMethods: TerminalPaymentMethod[] = [
      "card_present",
      "contactless",
      "manual_entry",
    ];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        {
          error: `Invalid paymentMethod. Must be one of: ${validMethods.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify the fill exists if provided
    if (fillId) {
      const fill = await prisma.prescriptionFill.findUnique({
        where: { id: fillId },
        select: { id: true },
      });
      if (!fill) {
        return NextResponse.json(
          { error: "Fill not found" },
          { status: 404 }
        );
      }
    }

    // Verify patient exists if provided
    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
      });
      if (!patient) {
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 }
        );
      }
    }

    // Verify POS session exists and is open if provided
    if (sessionId) {
      const session = await prisma.posSession.findUnique({
        where: { id: sessionId },
        select: { id: true, status: true },
      });
      if (!session) {
        return NextResponse.json(
          { error: "POS session not found" },
          { status: 404 }
        );
      }
      if (session.status !== "open") {
        return NextResponse.json(
          { error: "POS session is not open" },
          { status: 400 }
        );
      }
    }

    // --- Create payment intent ---

    const intentResult = await createPaymentIntent({
      amount,
      fillId,
      patientId,
      sessionId,
      description,
      paymentMethod: paymentMethod || "card_present",
      isFsaHsa: isFsaHsa === true,
      metadata: {
        cashier_id: user.id,
        cashier_name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      },
    });

    if (!intentResult.success || !intentResult.data) {
      return NextResponse.json(
        { error: intentResult.error || "Failed to create payment intent" },
        { status: 500 }
      );
    }

    const response: Record<string, unknown> = {
      success: true,
      paymentIntent: intentResult.data,
    };

    // If a reader ID was provided, immediately begin collection
    if (readerId) {
      const processResult = await processPayment({
        readerId,
        paymentIntentId: intentResult.data.id,
      });

      if (!processResult.success) {
        // The intent was created but reader collection failed — return both
        response.readerError = processResult.error;
      } else {
        response.reader = processResult.data;
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POS payment creation error:", error);
    const message = getErrorMessage(error);

    if (message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pos/payment
 * Capture / confirm a payment intent, and record it in the POS transaction.
 *
 * Request body:
 *   - paymentIntentId: string (required)
 *   - action: "capture" | "confirm"  (defaults to "capture")
 *
 * Response:
 *   - paymentIntent: TerminalPaymentIntent
 *   - payment?: Payment  (database record, if session / patient context available)
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { paymentIntentId, action = "capture" } = body;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId is required" },
        { status: 400 }
      );
    }

    if (action !== "capture" && action !== "confirm") {
      return NextResponse.json(
        { error: 'action must be "capture" or "confirm"' },
        { status: 400 }
      );
    }

    // Retrieve intent to get metadata before capturing
    const currentIntent = await getPaymentIntent(paymentIntentId);
    if (!currentIntent.success || !currentIntent.data) {
      return NextResponse.json(
        { error: currentIntent.error || "Payment intent not found" },
        { status: 404 }
      );
    }

    // Capture / confirm the intent
    let result;
    if (action === "capture") {
      result = await capturePaymentIntent(paymentIntentId);
    } else {
      // "confirm" — for manual capture mode, we still capture
      result = await capturePaymentIntent(paymentIntentId);
    }

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Failed to capture payment" },
        { status: 500 }
      );
    }

    const intent = result.data;
    const metadata = currentIntent.data.metadata || {};

    // Record a Payment row in the database if we have patient context
    let paymentRecord = null;
    if (metadata.patient_id) {
      try {
        paymentRecord = await prisma.payment.create({
          data: {
            patientId: metadata.patient_id,
            amount: currentIntent.data.amount / 100, // cents to dollars
            paymentMethod: metadata.payment_method_type || "card_present",
            referenceNumber: paymentIntentId,
            fillId: metadata.fill_id || null,
            posTransactionId: null, // linked later when the POS transaction is finalized
            status: intent.status === "succeeded" ? "completed" : "pending",
            processedBy: user.id,
          },
        });
      } catch (dbError) {
        // Payment was captured successfully — don't fail the response
        console.error("Failed to record payment in database:", dbError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        paymentIntent: intent,
        payment: paymentRecord,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POS payment capture error:", error);
    const message = getErrorMessage(error);

    if (message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to capture payment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pos/payment
 * Cancel a payment intent that has not been captured.
 *
 * Request body:
 *   - paymentIntentId: string (required)
 *
 * Response:
 *   - paymentIntent: TerminalPaymentIntent (with status "canceled")
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireUser();

    const body = await req.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId is required" },
        { status: 400 }
      );
    }

    const result = await cancelPaymentIntent(paymentIntentId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Failed to cancel payment intent" },
        { status: 500 }
      );
    }

    // Also update any pending Payment record in the database
    try {
      await prisma.payment.updateMany({
        where: {
          referenceNumber: paymentIntentId,
          status: { in: ["pending", "processing"] },
        },
        data: {
          status: "canceled",
        },
      });
    } catch (dbError) {
      // Non-critical — the Stripe intent is already canceled
      console.error("Failed to update payment record on cancel:", dbError);
    }

    return NextResponse.json(
      {
        success: true,
        paymentIntent: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POS payment cancel error:", error);
    const message = getErrorMessage(error);

    if (message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 }
    );
  }
}
