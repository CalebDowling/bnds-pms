import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { reverseClaim } from "@/lib/claims/adjudicator";
import { getErrorMessage } from "@/lib/errors";

/**
 * POST /api/claims/reverse
 * Reverse/void a paid insurance claim
 *
 * Request body:
 *   - claimId: string (required) - ID of the claim to reverse
 *   - reason?: string (optional) - Reason for reversal
 *
 * Response:
 *   - transactionId: string
 *   - status: "paid" (reversal confirmation)
 *   - responseData?: Record<string, unknown>
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { claimId, reason } = body;

    if (!claimId || typeof claimId !== "string") {
      return NextResponse.json({ error: "claimId is required and must be a string" }, { status: 400 });
    }

    const response = await reverseClaim(claimId, reason, user.id);

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Claim reversal error:", error);
    const message = getErrorMessage(error);

    if (message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (message.includes("not found") || message.includes("not be reversed")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
