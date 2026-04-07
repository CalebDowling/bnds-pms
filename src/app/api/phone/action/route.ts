/**
 * Call Control API
 *
 * POST endpoint for real-time call control actions:
 *   - hold: place a call on hold with hold music
 *   - retrieve: take a call off hold
 *   - transfer: transfer to another department/extension
 *   - end: hang up the call
 *
 * Body: { action, callSid, target? }
 * Requires authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  holdCall,
  retrieveCall,
  transferCall,
  endCall,
} from "@/lib/communications/call-manager";
import type { TransferTarget } from "@/lib/communications/call-manager";

const VALID_ACTIONS = ["hold", "retrieve", "transfer", "end"] as const;
type CallAction = (typeof VALID_ACTIONS)[number];

const VALID_TARGETS: TransferTarget[] = [
  "pharmacy_main",
  "pharmacist",
  "billing",
  "shipping",
  "voicemail",
];

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, callSid, target } = body as {
      action?: string;
      callSid?: string;
      target?: string;
    };

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action as CallAction)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate callSid
    if (!callSid || typeof callSid !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid callSid" },
        { status: 400 }
      );
    }

    // Validate transfer target
    if (action === "transfer") {
      if (!target || !VALID_TARGETS.includes(target as TransferTarget)) {
        return NextResponse.json(
          { error: `Invalid transfer target. Must be one of: ${VALID_TARGETS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Execute action
    let result: { success: boolean; error?: string };

    switch (action as CallAction) {
      case "hold":
        result = await holdCall(callSid);
        break;
      case "retrieve":
        result = await retrieveCall(callSid);
        break;
      case "transfer":
        result = await transferCall(callSid, target as TransferTarget);
        break;
      case "end":
        result = await endCall(callSid);
        break;
      default:
        result = { success: false, error: "Unknown action" };
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Action failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, action, callSid });
  } catch (error: any) {
    console.error("[Phone Action API] Error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
