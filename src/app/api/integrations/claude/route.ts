import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { claudeAIClient, PharmacyUseCase } from "@/lib/integrations/claude-ai";
import { logger } from "@/lib/logger";

/**
 * GET /api/integrations/claude
 * Check Claude AI integration status
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    await requirePermission("settings", "read");

    const isConfigured = !!process.env.ANTHROPIC_API_KEY;

    return NextResponse.json({
      success: true,
      status: isConfigured ? "configured" : "not_configured",
      configured: isConfigured,
      lastTested: null,
      model: "claude-sonnet-4-20250514",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Claude integration status check failed", { error: errorMsg });

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 401 }
    );
  }
}

/**
 * POST /api/integrations/claude
 * Send a query to Claude with a specific use case
 *
 * Body:
 * {
 *   "type": "prescription_analysis" | "formulation" | "counseling" | "drug_query" | etc.,
 *   "data": { ... specific to type ... }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    await requirePermission("settings", "read");

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "ANTHROPIC_API_KEY not configured",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { type, data } = body as {
      type: PharmacyUseCase;
      data: Record<string, unknown>;
    };

    if (!type || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: type, data",
        },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "prescription_analysis":
        result = await claudeAIClient.analyzePrescription(
          data as unknown as Parameters<typeof claudeAIClient.analyzePrescription>[0]
        );
        break;

      case "formulation_suggestion":
        result = await claudeAIClient.suggestFormulation(
          data as unknown as Parameters<typeof claudeAIClient.suggestFormulation>[0]
        );
        break;

      case "patient_counseling":
        result = await claudeAIClient.draftPatientCounseling(
          data as unknown as Parameters<typeof claudeAIClient.draftPatientCounseling>[0]
        );
        break;

      case "lab_interpretation":
        result = await claudeAIClient.interpretLabResults(
          (data.labResults as unknown as Parameters<typeof claudeAIClient.interpretLabResults>[0]) || [],
          (data.medications as unknown as Parameters<typeof claudeAIClient.interpretLabResults>[1]) || []
        );
        break;

      case "clinical_note":
        result = await claudeAIClient.generateClinicalNote(
          data as unknown as Parameters<typeof claudeAIClient.generateClinicalNote>[0]
        );
        break;

      case "drug_query":
        result = await claudeAIClient.answerDrugQuery(
          (data.question as unknown as string) || ""
        );
        break;

      case "insurance_rejection":
        result = await claudeAIClient.reviewInsuranceRejection(
          data as unknown as Parameters<typeof claudeAIClient.reviewInsuranceRejection>[0]
        );
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown use case: ${type}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Claude integration request failed", { error: errorMsg });

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
