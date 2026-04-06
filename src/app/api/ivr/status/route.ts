/**
 * IVR Status Inquiry Webhook
 *
 * Handles the prescription status sub-flow:
 *   1. Initial POST — prompts the caller to enter their RX number via DTMF.
 *   2. ?step=lookup — receives the entered digits, looks up the most recent
 *      PrescriptionFill status, and reads it back to the caller via TwiML Say.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildStatusCheck,
  processStatusInquiry,
} from '@/lib/integrations/ivr-system';
import { verifyTwilioSignature } from '@/lib/integrations/twilio-verify';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');

    const twilioSig = request.headers.get('x-twilio-signature');
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    if (!verifyTwilioSignature(request.url, params, twilioSig)) {
      return new Response('Unauthorized', { status: 403 });
    }

    const digits = formData.get('Digits')?.toString() ?? '';

    let twimlResponse: string;

    if (step === 'lookup' && digits) {
      // Caller entered their RX number — look up and read status
      twimlResponse = await processStatusInquiry(digits);
    } else {
      // Prompt the caller for their RX number
      twimlResponse = buildStatusCheck();
    }

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('[IVR /status] Error:', error);

    const fallback =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
      '<Say voice="Polly.Joanna">We are experiencing technical difficulties checking your prescription status. Please call back later.</Say>' +
      '<Redirect>/api/ivr/voice</Redirect>' +
      '</Response>';

    return new NextResponse(fallback, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
