/**
 * Twilio Call Status Webhook
 *
 * Receives real-time call status callbacks from Twilio and updates
 * the in-memory active call list. When a call completes, logs it
 * to the CommunicationLog history. Also performs patient lookup on
 * incoming calls to match callers to patient records.
 *
 * Twilio sends form-encoded POST data with fields like:
 *   CallSid, CallStatus, From, To, Direction, Duration, etc.
 *
 * Call statuses: queued, ringing, in-progress, completed, failed, busy, no-answer, canceled
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/integrations/twilio-verify";
import {
  registerCall,
  updateCallStatus,
  getActiveCall,
  logCompletedCall,
  lookupPatientByPhone,
  inferCallReason,
} from "@/lib/communications/call-manager";
import type {
  CallStatus,
  CallOutcome,
  ActiveCall,
} from "@/lib/communications/call-manager";

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

function mapTwilioStatus(twilioStatus: string): CallStatus {
  switch (twilioStatus) {
    case "queued":
    case "ringing":
      return "ringing";
    case "in-progress":
      return "active";
    case "completed":
      return "completed";
    case "failed":
    case "canceled":
      return "failed";
    case "busy":
      return "busy";
    case "no-answer":
      return "no-answer";
    default:
      return "active";
  }
}

function mapOutcome(twilioStatus: string): CallOutcome {
  switch (twilioStatus) {
    case "completed":
      return "answered";
    case "no-answer":
    case "canceled":
      return "missed";
    case "busy":
      return "missed";
    case "failed":
      return "missed";
    default:
      return "answered";
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio form-encoded body
    const twilioSig = request.headers.get("x-twilio-signature");
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Verify Twilio signature (skipped in dev if no auth token)
    if (!verifyTwilioSignature(request.url, params, twilioSig)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const callSid = params.CallSid ?? params.callSid ?? "";
    const twilioStatus = params.CallStatus ?? params.callStatus ?? "";
    const from = params.From ?? params.from ?? "";
    const to = params.To ?? params.to ?? "";
    const direction = params.Direction ?? params.direction ?? "inbound";
    const duration = params.Duration ?? params.duration;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    const mappedStatus = mapTwilioStatus(twilioStatus);

    // Check if we already track this call
    const existing = getActiveCall(callSid);

    if (!existing) {
      // New call -- register it
      // Try to match caller to a patient
      const callerPhone = direction === "inbound" ? from : to;
      const patient = await lookupPatientByPhone(callerPhone);

      // Infer reason from URL path if the webhook came from an IVR sub-path
      const reason = inferCallReason(
        params.Digits,
        request.nextUrl.searchParams.get("reason") ?? undefined
      );

      const newCall: ActiveCall = {
        callSid,
        direction: direction.includes("inbound") ? "inbound" : "outbound",
        callerPhone,
        callerName: patient?.patientName ?? params.CallerName ?? null,
        patientId: patient?.patientId ?? null,
        patientMrn: patient?.patientMrn ?? null,
        status: mappedStatus,
        reason,
        assignedStaff: null,
        assignedStaffName: null,
        startedAt: new Date().toISOString(),
        holdStartedAt: null,
        transferredTo: null,
        conferenceSid: null,
      };

      registerCall(newCall);
    } else {
      // Existing call -- update status
      if (
        twilioStatus === "completed" ||
        twilioStatus === "failed" ||
        twilioStatus === "busy" ||
        twilioStatus === "no-answer" ||
        twilioStatus === "canceled"
      ) {
        // Call ended -- log to history
        const outcome = mapOutcome(twilioStatus);
        await logCompletedCall(callSid, outcome);
      } else {
        updateCallStatus(callSid, mappedStatus);
      }
    }

    // Twilio expects a 200 or 204 response
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Phone Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
