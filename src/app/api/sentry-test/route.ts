import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to verify Sentry is working correctly.
 * This route intentionally throws an error to test error reporting.
 *
 * Only available in development mode for security.
 *
 * Usage: GET /api/sentry-test
 */
export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Intentionally throw an error to test Sentry
    throw new Error(
      "This is a test error from /api/sentry-test endpoint. If you see this in Sentry, the integration is working correctly."
    );
  } catch (error) {
    // Capture the error with Sentry
    Sentry.captureException(error);

    return NextResponse.json(
      {
        success: true,
        message:
          "Test error sent to Sentry. Check your Sentry dashboard to verify it was received.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
