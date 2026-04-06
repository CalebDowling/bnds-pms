import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { testKeragonConnection, getKeragonStatus } from "@/lib/integrations/keragon";

/**
 * POST /api/integrations/keragon/test
 * Test the Keragon connection by dispatching a ping event.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await testKeragonConnection();

  return NextResponse.json({
    ...result,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/integrations/keragon/test
 * Get the current Keragon configuration status (no test dispatch).
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = getKeragonStatus();

  return NextResponse.json({
    ...status,
    timestamp: new Date().toISOString(),
  });
}
