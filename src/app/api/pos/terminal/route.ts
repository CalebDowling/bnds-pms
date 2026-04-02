import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createConnectionToken,
  listReaders,
  registerReader,
} from "@/lib/integrations/stripe-terminal";

/**
 * POST /api/pos/terminal
 * Create a Stripe Terminal connection token for the JS SDK.
 *
 * The frontend Terminal SDK calls this endpoint to obtain a short-lived
 * secret that authenticates the reader connection.
 *
 * Response:
 *   - secret: string  (the connection token)
 */
export async function POST(_req: NextRequest) {
  try {
    await requireUser();

    const result = await createConnectionToken();

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Failed to create connection token" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { secret: result.data.secret },
      { status: 200 }
    );
  } catch (error) {
    console.error("Terminal connection token error:", error);
    const message = getErrorMessage(error);

    if (message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create terminal connection token" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pos/terminal
 * List registered terminal readers at this pharmacy location.
 *
 * Query params (optional):
 *   - register: boolean  — if true, expects registrationCode & label in query
 *                           (convenience for simple reader management UI)
 *
 * Response:
 *   - readers: TerminalReader[]
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();

    // Support inline reader registration via query params for convenience
    const { searchParams } = new URL(req.url);
    const registrationCode = searchParams.get("registrationCode");
    const label = searchParams.get("label");

    if (registrationCode && label) {
      const regResult = await registerReader({ registrationCode, label });
      if (!regResult.success) {
        return NextResponse.json(
          { error: regResult.error || "Failed to register reader" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: true, reader: regResult.data },
        { status: 201 }
      );
    }

    const result = await listReaders();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to list readers" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { readers: result.data || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Terminal readers error:", error);
    const message = getErrorMessage(error);

    if (message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to retrieve terminal readers" },
      { status: 500 }
    );
  }
}
