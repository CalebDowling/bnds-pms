/**
 * BNDS PMS — Twilio Outbound Call Webhook
 *
 * POST: Returns TwiML for outbound call voice content based on campaign type.
 * GET:  Call status callback — updates call result in the campaign.
 */

import { NextRequest, NextResponse } from "next/server";
import { updateCallStatus } from "@/lib/communications/outbound-caller";
import type { CallStatus, CampaignType } from "@/lib/communications/outbound-caller";

// ---------------------------------------------------------------------------
// TwiML message templates by campaign type
// ---------------------------------------------------------------------------

const PHARMACY_NAME = "Boudreaux's New Drug Store";
const PHARMACY_PHONE = "(318) 555-0199";

function getTwimlMessage(type: CampaignType, _callId?: string): string {
  const messages: Record<CampaignType, string> = {
    rx_ready: `
      <Response>
        <Say voice="Polly.Joanna" language="en-US">
          Hello, this is ${PHARMACY_NAME} calling to let you know that your prescription is ready for pickup.
          Our pharmacy is open Monday through Friday, 9 A.M. to 6 P.M., and Saturday 9 A.M. to 1 P.M.
          If you have any questions, please call us at ${PHARMACY_PHONE}.
          Thank you and have a great day.
        </Say>
      </Response>`,

    refill_reminder: `
      <Response>
        <Say voice="Polly.Joanna" language="en-US">
          Hello, this is ${PHARMACY_NAME} calling with a refill reminder.
          Our records show you may be running low on one or more of your medications.
          Please call us at ${PHARMACY_PHONE} or visit our pharmacy to request your refill.
          We want to make sure you don't miss a dose.
          Thank you and have a great day.
        </Say>
      </Response>`,

    med_sync_reminder: `
      <Response>
        <Say voice="Polly.Joanna" language="en-US">
          Hello, this is ${PHARMACY_NAME} calling about your medication synchronization appointment.
          Your med sync pickup date is coming up soon.
          Please call us at ${PHARMACY_PHONE} if you need to make any changes to your medications.
          Thank you and have a great day.
        </Say>
      </Response>`,

    appointment_reminder: `
      <Response>
        <Say voice="Polly.Joanna" language="en-US">
          Hello, this is ${PHARMACY_NAME} calling to remind you of your upcoming appointment.
          Please call us at ${PHARMACY_PHONE} if you need to reschedule.
          We look forward to seeing you. Thank you.
        </Say>
      </Response>`,

    custom: `
      <Response>
        <Say voice="Polly.Joanna" language="en-US">
          Hello, this is ${PHARMACY_NAME} calling with an important message.
          Please call us at ${PHARMACY_PHONE} at your earliest convenience.
          Thank you and have a great day.
        </Say>
      </Response>`,
  };

  return messages[type] ?? messages.custom;
}

// ---------------------------------------------------------------------------
// POST — Serve TwiML content to Twilio for the outbound call
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");
    const callId = url.searchParams.get("callId");
    const type = (url.searchParams.get("type") ?? "custom") as CampaignType;

    if (!campaignId || !callId) {
      return new NextResponse("<Response><Say>An error occurred.</Say></Response>", {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    }

    const twiml = getTwimlMessage(type, callId);

    return new NextResponse(twiml.trim(), {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Outbound Call TwiML] Error:", error);
    return new NextResponse(
      "<Response><Say>We are sorry, an error occurred. Please call the pharmacy directly.</Say></Response>",
      { status: 200, headers: { "Content-Type": "application/xml" } },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Call status callback from Twilio
// ---------------------------------------------------------------------------

function mapTwilioStatus(twilioStatus: string): CallStatus {
  const mapping: Record<string, CallStatus> = {
    completed: "answered",
    busy: "busy",
    "no-answer": "no_answer",
    failed: "failed",
    canceled: "failed",
  };
  return mapping[twilioStatus] ?? "in_progress";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");
    const callId = url.searchParams.get("callId");
    const isCallback = url.searchParams.get("callback") === "status";

    if (!isCallback || !campaignId || !callId) {
      return NextResponse.json({ error: "Invalid callback parameters" }, { status: 400 });
    }

    // Twilio sends status in query params for GET callbacks
    const callStatus = url.searchParams.get("CallStatus") ?? "";
    const callDuration = parseInt(url.searchParams.get("CallDuration") ?? "0", 10);

    if (callStatus) {
      const status = mapTwilioStatus(callStatus);
      await updateCallStatus(campaignId, callId, status, callDuration);
    }

    return NextResponse.json({ received: true, callStatus });
  } catch (error) {
    console.error("[Outbound Call Callback] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
