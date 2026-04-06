import crypto from "crypto";

/**
 * Verify Twilio webhook signature to prevent unauthorized IVR requests.
 * Returns true if signature is valid or if TWILIO_AUTH_TOKEN is not configured (dev mode).
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // Dev mode — skip verification

  if (!signature) return false;

  // Sort params alphabetically and concatenate
  const data = url + Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], "");
  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
