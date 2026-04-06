/**
 * IVR Voice Webhook — Main Twilio entry point
 *
 * Twilio sends a POST here whenever someone calls the pharmacy Twilio number.
 * Returns TwiML that greets the caller and presents the main menu:
 *   1 — Prescription refill
 *   2 — Prescription status
 *   3 — Speak with a pharmacist
 *
 * When the caller presses a digit, Twilio POSTs back with ?step=route and the
 * Digits parameter so we can forward them to the appropriate sub-flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleIncomingCall,
  routeMainMenuSelection,
} from '@/lib/integrations/ivr-system';
import { verifyTwilioSignature } from '@/lib/integrations/twilio-verify';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');

    // Parse the form-encoded body Twilio sends
    const twilioSig = request.headers.get('x-twilio-signature');
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    if (!verifyTwilioSignature(request.url, params, twilioSig)) {
      return new Response('Unauthorized', { status: 403 });
    }

    const digits = formData.get('Digits')?.toString() ?? '';

    let twimlResponse: string;

    if (step === 'route' && digits) {
      // Caller pressed a digit on the main menu — route them
      twimlResponse = routeMainMenuSelection(digits);
    } else {
      // Initial call or no digit collected — play main menu
      twimlResponse = handleIncomingCall();
    }

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('[IVR /voice] Error:', error);

    // Return a graceful TwiML error response so the caller hears something
    const fallback =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
      '<Say voice="Polly.Joanna">We are experiencing technical difficulties. Please call back later.</Say>' +
      '<Hangup/>' +
      '</Response>';

    return new NextResponse(fallback, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
