// @ts-nocheck -- TODO: add proper types to replace this flag
/**
 * IVR (Interactive Voice Response) System for Automated Prescription Services
 *
 * Provides automated phone-based prescription refill requests and status inquiries
 * via Twilio. Patients can call the pharmacy to:
 *   - Request prescription refills by entering their RX number
 *   - Check the status of a prescription fill
 *   - Transfer to a live pharmacist
 *
 * Environment variables:
 *   TWILIO_ACCOUNT_SID    - Twilio account identifier
 *   TWILIO_AUTH_TOKEN      - Twilio auth token
 *   TWILIO_PHONE_NUMBER    - Pharmacy's Twilio phone number (outbound caller ID)
 *   PHARMACY_PHONE_NUMBER  - Main pharmacy phone line (for live transfers)
 */

// @ts-ignore -- twilio types installed separately
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Twilio client (lazily initialised so env vars are read at call-time)
// ---------------------------------------------------------------------------

let _twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!_twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables');
    }
    _twilioClient = twilio(sid, token);
  }
  return _twilioClient;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHARMACY_NAME = "Boudreaux's New Drug Store";
const VOICE_CONFIG: VoiceResponse.SayAttributes = {
  voice: 'Polly.Joanna',
  language: 'en-US',
};

/** Human-readable status labels spoken to the caller. */
const FILL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'pending and has not yet been started',
  IN_PROGRESS: 'currently being filled',
  READY: 'ready for pickup',
  PICKED_UP: 'already been picked up',
  DELIVERED: 'out for delivery',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on hold — please speak with a pharmacist for details',
  WAITING_FOR_STOCK: 'waiting for stock to arrive',
  TRANSFERRED: 'transferred to another pharmacy',
};

// ---------------------------------------------------------------------------
// Exported business-logic helpers
// ---------------------------------------------------------------------------

/**
 * Build the TwiML response for the initial incoming call greeting / main menu.
 */
export function handleIncomingCall(): string {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/api/ivr/voice?step=route',
    method: 'POST',
    timeout: 5,
  });

  gather.say(
    VOICE_CONFIG,
    `Thank you for calling ${PHARMACY_NAME}. ` +
      'Press 1 to request a prescription refill. ' +
      'Press 2 to check the status of a prescription. ' +
      'Press 3 to speak with a pharmacist.',
  );

  // If no input, repeat the menu
  twiml.redirect('/api/ivr/voice');

  return twiml.toString();
}

/**
 * Route the caller based on the digit they pressed on the main menu.
 */
export function routeMainMenuSelection(digit: string): string {
  const twiml = new VoiceResponse();

  switch (digit) {
    case '1':
      twiml.redirect('/api/ivr/refill');
      break;
    case '2':
      twiml.redirect('/api/ivr/status');
      break;
    case '3':
      twiml.redirect('/api/ivr/transfer');
      break;
    default:
      twiml.say(VOICE_CONFIG, 'Sorry, that is not a valid option.');
      twiml.redirect('/api/ivr/voice');
      break;
  }

  return twiml.toString();
}

/**
 * Build TwiML that prompts the caller to enter their RX number for a refill.
 */
export function buildRefillMenu(): string {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 7,
    action: '/api/ivr/refill?step=lookup',
    method: 'POST',
    timeout: 10,
    finishOnKey: '#',
  });

  gather.say(
    VOICE_CONFIG,
    'Please enter your prescription number using the keypad, followed by the pound sign.',
  );

  // Timeout — go back to main menu
  twiml.say(VOICE_CONFIG, 'We did not receive any input.');
  twiml.redirect('/api/ivr/voice');

  return twiml.toString();
}

/**
 * Build TwiML that prompts the caller to enter their RX number for a status check.
 */
export function buildStatusCheck(): string {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 7,
    action: '/api/ivr/status?step=lookup',
    method: 'POST',
    timeout: 10,
    finishOnKey: '#',
  });

  gather.say(
    VOICE_CONFIG,
    'Please enter your prescription number using the keypad, followed by the pound sign.',
  );

  twiml.say(VOICE_CONFIG, 'We did not receive any input.');
  twiml.redirect('/api/ivr/voice');

  return twiml.toString();
}

/**
 * Look up a patient by the phone number they are calling from (Caller ID).
 * Returns the patient record or null.
 */
export async function lookupPatientByPhone(phoneNumber: string) {
  // Normalise to digits only for comparison
  const digits = phoneNumber.replace(/\D/g, '');
  // Try matching the last 10 digits (strip country code)
  const last10 = digits.slice(-10);

  const patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { phone: { contains: last10 } },
        { mobilePhone: { contains: last10 } },
      ],
    },
    include: {
      prescriptions: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  return patient;
}

/**
 * Look up a prescription by its RX number and return it with the most recent
 * fill record and owning patient.
 */
export async function lookupPatientByRxNumber(rxNumber: string) {
  const prescription = await prisma.prescription.findFirst({
    where: {
      rxNumber: rxNumber,
    },
    include: {
      patient: true,
      fills: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return prescription;
}

/**
 * Process a refill request: validate the RX number, create a RefillRequest,
 * and return TwiML confirming (or denying) the request.
 */
export async function processRefillRequest(
  rxNumber: string,
  callerPhone: string,
): Promise<string> {
  const twiml = new VoiceResponse();

  const prescription = await lookupPatientByRxNumber(rxNumber);

  if (!prescription) {
    twiml.say(
      VOICE_CONFIG,
      `We could not find a prescription with number ${rxNumber.split('').join(' ')}. ` +
        'Please check the number and try again, or press 3 to speak with a pharmacist.',
    );
    twiml.redirect('/api/ivr/voice');
    return twiml.toString();
  }

  // Check if the prescription is still active / has refills remaining
  if (!prescription.isActive) {
    twiml.say(
      VOICE_CONFIG,
      'This prescription is no longer active. Please speak with a pharmacist for assistance.',
    );
    twiml.redirect('/api/ivr/transfer');
    return twiml.toString();
  }

  if (
    prescription.refillsRemaining !== null &&
    prescription.refillsRemaining !== undefined &&
    prescription.refillsRemaining <= 0
  ) {
    twiml.say(
      VOICE_CONFIG,
      'This prescription has no refills remaining. We will transfer you to a pharmacist who can help.',
    );
    twiml.redirect('/api/ivr/transfer');
    return twiml.toString();
  }

  // Create the RefillRequest record
  try {
    await prisma.refillRequest.create({
      data: {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        source: 'IVR',
        status: 'PENDING',
      },
    });
  } catch (err) {
    console.error('[IVR] Failed to create refill request:', err);
    twiml.say(
      VOICE_CONFIG,
      'We encountered an error processing your refill request. Please try again later or speak with a pharmacist.',
    );
    twiml.redirect('/api/ivr/voice');
    return twiml.toString();
  }

  // Speak confirmation
  const patientFirst = prescription.patient?.firstName ?? 'there';
  twiml.say(
    VOICE_CONFIG,
    `Thank you, ${patientFirst}. Your refill request for prescription number ` +
      `${rxNumber.split('').join(' ')} has been submitted. ` +
      'You will receive a text message when your prescription is ready for pickup. ' +
      'Thank you for calling ' +
      PHARMACY_NAME +
      '. Goodbye!',
  );
  twiml.hangup();

  // Fire-and-forget: send confirmation SMS
  sendRefillConfirmationSms(callerPhone, rxNumber, prescription.patient?.firstName).catch(
    (err) => console.error('[IVR] SMS send failed:', err),
  );

  return twiml.toString();
}

/**
 * Process a status inquiry for a given RX number and return TwiML that reads
 * the current fill status back to the caller.
 */
export async function processStatusInquiry(rxNumber: string): Promise<string> {
  const twiml = new VoiceResponse();

  const prescription = await lookupPatientByRxNumber(rxNumber);

  if (!prescription) {
    twiml.say(
      VOICE_CONFIG,
      `We could not find a prescription with number ${rxNumber.split('').join(' ')}. ` +
        'Please check the number and try again.',
    );
    twiml.redirect('/api/ivr/voice');
    return twiml.toString();
  }

  const latestFill = prescription.fills?.[0];

  if (!latestFill) {
    twiml.say(
      VOICE_CONFIG,
      `Prescription number ${rxNumber.split('').join(' ')} has no fills on record. ` +
        'If you recently requested a refill, it may not have been processed yet. ' +
        'Please call back later or press 3 to speak with a pharmacist.',
    );
    twiml.redirect('/api/ivr/voice');
    return twiml.toString();
  }

  const statusLabel =
    FILL_STATUS_LABELS[latestFill.status] ?? `in status: ${latestFill.status}`;

  twiml.say(
    VOICE_CONFIG,
    `Prescription number ${rxNumber.split('').join(' ')} is ${statusLabel}. ` +
      'If you have any questions, press 3 to speak with a pharmacist. ' +
      'Thank you for calling ' +
      PHARMACY_NAME +
      '.',
  );

  // Offer to return to main menu or hang up
  const gather = twiml.gather({
    numDigits: 1,
    action: '/api/ivr/voice?step=route',
    method: 'POST',
    timeout: 5,
  });

  gather.say(VOICE_CONFIG, 'Press 1 to refill this prescription. Press 3 to speak with a pharmacist. Or hang up to end the call.');

  twiml.say(VOICE_CONFIG, 'Goodbye!');
  twiml.hangup();

  return twiml.toString();
}

/**
 * Build TwiML to transfer the call to the pharmacy main line.
 */
export function buildTransferToPharmacist(): string {
  const twiml = new VoiceResponse();
  const pharmacyNumber = process.env.PHARMACY_PHONE_NUMBER;

  if (!pharmacyNumber) {
    twiml.say(
      VOICE_CONFIG,
      'We are unable to transfer your call at this time. Please call back during business hours.',
    );
    twiml.hangup();
    return twiml.toString();
  }

  twiml.say(
    VOICE_CONFIG,
    'Please hold while we transfer you to a pharmacist.',
  );
  twiml.dial(
    {
      callerId: process.env.TWILIO_PHONE_NUMBER,
      timeout: 30,
    },
    pharmacyNumber,
  );

  return twiml.toString();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Send an SMS confirming the refill request was received.
 */
async function sendRefillConfirmationSms(
  toPhone: string,
  rxNumber: string,
  patientFirstName?: string | null,
): Promise<void> {
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  if (!fromPhone) {
    console.warn('[IVR] TWILIO_PHONE_NUMBER not set — skipping SMS.');
    return;
  }

  const greeting = patientFirstName ? `Hi ${patientFirstName}, t` : 'T';

  const client = getTwilioClient();
  await client.messages.create({
    to: toPhone,
    from: fromPhone,
    body:
      `${greeting}hank you for requesting a refill for prescription #${rxNumber} ` +
      `at ${PHARMACY_NAME}. We will notify you when it is ready for pickup.`,
  });
}
