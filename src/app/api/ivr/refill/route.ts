/**
 * IVR Refill Flow Webhook
 *
 * Handles the prescription refill sub-flow:
 *   1. Initial POST — prompts the caller to enter their RX number via DTMF.
 *   2. ?step=lookup — receives the entered digits, looks up the prescription,
 *      creates a RefillRequest record, and confirms (or reports an error).
 *
 * On success a confirmation SMS is sent to the caller's phone number.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildRefillMenu,
  processRefillRequest,
} from '@/lib/integrations/ivr-system';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');

    const formData = await request.formData();
    const digits = formData.get('Digits')?.toString() ?? '';
    const callerPhone = formData.get('From')?.toString() ?? formData.get('Caller')?.toString() ?? '';

    let twimlResponse: string;

    if (step === 'lookup' && digits) {
      // Caller entered their RX number — process the refill
      twimlResponse = await processRefillRequest(digits, callerPhone);
    } else {
      // Prompt the caller for their RX number
      twimlResponse = buildRefillMenu();
    }

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('[IVR /refill] Error:', error);

    const fallback =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
      '<Say voice="Polly.Joanna">We are experiencing technical difficulties processing your refill request. Please call back later or press 3 to speak with a pharmacist.</Say>' +
      '<Redirect>/api/ivr/voice</Redirect>' +
      '</Response>';

    return new NextResponse(fallback, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
