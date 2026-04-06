import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { claudeAIClient } from "@/lib/integrations/claude-ai";
import { logger } from "@/lib/logger";

/**
 * POST /api/integrations/claude/test
 * Test the Claude AI API connection
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    await requirePermission("settings", "write");

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "ANTHROPIC_API_KEY not configured",
          status: "unconfigured",
        },
        { status: 503 }
      );
    }

    const result = await claudeAIClient.testConnection();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Connection test failed",
          status: "error",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "connected",
      message: "Claude AI connection successful",
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Claude connection test failed", { error: errorMsg });

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        status: "error",
      },
      { status: 500 }
    );
  }
}
