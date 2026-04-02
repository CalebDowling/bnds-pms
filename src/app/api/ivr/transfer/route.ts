/**
 * IVR Transfer Webhook
 *
 * Transfers the caller to the pharmacy's main line so they can speak with a
 * pharmacist directly. Uses PHARMACY_PHONE_NUMBER from environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildTransferToPharmacist } from '@/lib/integrations/ivr-system';

export async function POST(_request: NextRequest) {
  try {
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
