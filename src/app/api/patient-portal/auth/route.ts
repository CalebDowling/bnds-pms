import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy auth endpoint - kept for backwards compatibility
 * Modern authentication uses Supabase Auth directly
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return NextResponse.json(
      {
        error: "This endpoint is deprecated. Please use Supabase Auth directly from the client.",
      },
      { status: 410 }
    );
  } catch (error) {
    console.error("Auth error:", error);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
