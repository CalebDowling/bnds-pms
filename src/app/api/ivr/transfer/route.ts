/**
 * IVR Transfer Webhook
 *
 * Transfers the caller to the pharmacy's main line so they can speak with a
 * pharmacist directly. Uses PHARMACY_PHONE_NUMBER from environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildTransferToPharmacist } from '@/lib/integrations/ivr-system';
import { verifyTwilioSignature } from '@/lib/integrations/twilio-verify';

export async function POST(request: NextRequest) {
  try {
    const twilioSig = request.headers.get('x-twilio-signature');
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    if (!verifyTwilioSignature(request.url, params, twilioSig)) {
      return new Response('Unauthorized', { status: 403 });
    }

    const twimlResponse = buildTransferToPharmacist();

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('[IVR /transfer] Error:', error);

    const fallback =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
      '<Say voice="Polly.Joanna">We are unable to transfer your call at this time. Please call back during business hours.</Say>' +
      '<Hangup/>' +
      '</Response>';

    return new NextResponse(fallback, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
