/**
 * API Route — /api/hardware/eyecon
 *
 * Server-side proxy for Eyecon pill counting device requests.
 * This keeps the Eyecon device URL and any future auth tokens on the server
 * and provides a consistent API surface for the front-end.
 *
 * POST /api/hardware/eyecon
 *   body: { ndc: string, expectedQuantity?: number, referenceId?: string }
 *   → Starts a new counting session
 *
 * GET  /api/hardware/eyecon?sessionId=<id>
 *   → Returns the current count result for a session
 *
 * GET  /api/hardware/eyecon?action=verify&sessionId=<id>&expected=<n>
 *   → Verifies the count against an expected quantity
 *
 * GET  /api/hardware/eyecon?action=ping
 *   → Checks device connectivity
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  startCount,
  getCountResult,
  verifyCount,
  pingDevice,
} from "@/lib/integrations/eyecon-counter";

// ---------------------------------------------------------------------------
// GET — Retrieve count result, verify, or ping
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");

  // --- Ping ---
  if (action === "ping") {
    try {
      const reachable = await pingDevice();
      return NextResponse.json({ reachable });
    } catch (err) {
      return NextResponse.json(
        { reachable: false, error: String(err) },
        { status: 503 },
      );
    }
  }

  // --- Verify ---
  if (action === "verify") {
    const sessionId = searchParams.get("sessionId");
    const expectedStr = searchParams.get("expected");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing 'sessionId' query parameter." },
        { status: 400 },
      );
    }
    if (!expectedStr || isNaN(Number(expectedStr))) {
      return NextResponse.json(
        { error: "Missing or invalid 'expected' query parameter (must be a number)." },
        { status: 400 },
      );
    }

    try {
      const verification = await verifyCount(sessionId, Number(expectedStr));
      return NextResponse.json(verification);
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to verify count.", details: String(err) },
        { status: 502 },
      );
    }
  }

  // --- Get count result ---
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing 'sessionId' query parameter." },
      { status: 400 },
    );
  }

  try {
    const result = await getCountResult(sessionId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get count result.", details: String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Start a new counting session
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ndc?: string; expectedQuantity?: number; referenceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { ndc, expectedQuantity, referenceId } = body;

  if (!ndc || typeof ndc !== "string" || ndc.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid 'ndc' in request body." },
      { status: 400 },
    );
  }

  // Validate NDC format: should be numeric, 10-11 digits (with or without dashes)
  const ndcDigits = ndc.replace(/-/g, "");
  if (!/^\d{10,11}$/.test(ndcDigits)) {
    return NextResponse.json(
      { error: "Invalid NDC format. Expected 10-11 digit NDC." },
      { status: 400 },
    );
  }

  if (
    expectedQuantity !== undefined &&
    (typeof expectedQuantity !== "number" || expectedQuantity < 0)
  ) {
    return NextResponse.json(
      { error: "'expectedQuantity' must be a non-negative number." },
      { status: 400 },
    );
  }

  try {
    const result = await startCount({
      ndc: ndc.trim(),
      expectedQuantity,
      referenceId: referenceId ?? undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to start count session.", details: String(err) },
      { status: 502 },
    );
  }
}
