import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { submitClaim } from "@/lib/claims/adjudicator";
import { getErrorMessage } from "@/lib/errors";

/**
 * POST /api/claims/submit
 * Submit an insurance claim for a prescription fill
 *
 * Request body:
 *   - fillId: string (required) - ID of the prescription fill to claim
 *   - insuranceId: string (required) - ID of the patient's insurance
 *   - overrideCodes?: string[] (optional) - Override rejection codes for resubmission
 *
 * Response:
 *   - transactionId: string
 *   - status: "paid" | "rejected" | "pending"
 *   - paidAmount?: number
 *   - ingredientCostPaid?: number
 *   - dispensingFeePaid?: number
 *   - copayAmount?: number
 *   - rejectionCodes?: string[]
 *   - rejectionMessages?: Record<string, string>
 *   - responseData?: Record<string, unknown>
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { fillId, insuranceId, overrideCodes } = body;

    if (!fillId || typeof fillId !== "string") {
      return NextResponse.json({ error: "fillId is required and must be a string" }, { status: 400 });
    }

    if (!insuranceId || typeof insuranceId !== "string") {
      return NextResponse.json({ error: "insuranceId is required and must be a string" }, { status: 400 });
    }

    const response = await submitClaim(
      {
        fillId,
        insuranceId,
        overrideCodes: Array.isArray(overrideCodes) ? overrideCodes : undefined,
      },
      user.id
    );

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Claim submission error:", error);
    const message = getErrorMessage(error);

    if (message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
