/**
 * TOTP (Time-based One-Time Password) implementation using Web Crypto API
 * No npm dependencies required
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Base32 encode a buffer into a string
 */
export function base32Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >> bits) & 31];
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decode a string into a buffer
 */
export function base32Decode(input: string): ArrayBuffer {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of input.toUpperCase()) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 255);
    }
  }

  return new Uint8Array(bytes).buffer;
}

/**
 * Generate a random base32 secret for TOTP
 * (typically 20 bytes = 160 bits)
 */
export async function generateSecret(lengthBytes = 20): Promise<string> {
  const buffer = new Uint8Array(lengthBytes);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer.buffer);
}

/**
 * Generate a 6-digit TOTP code for a given secret and time
 */
export async function generateTOTP(
  secret: string,
  time?: number
): Promise<string> {
  const timeCounter = Math.floor((time ?? Date.now()) / 30000);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  // Write the counter as big-endian 64-bit integer
  view.setBigInt64(0, BigInt(timeCounter), false);

  const secretBuffer = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, buffer);
  const signatureView = new Uint8Array(signature);

  // Dynamic truncation (RFC 4226)
  const offset = signatureView[signatureView.length - 1] & 0x0f;
  const code =
    ((signatureView[offset] & 0x7f) << 24) |
    ((signatureView[offset + 1] & 0xff) << 16) |
    ((signatureView[offset + 2] & 0xff) << 8) |
    (signatureView[offset + 3] & 0xff);

  return String((code % 1000000) >>> 0).padStart(6, "0");
}

/**
 * Verify a TOTP code with 1-step tolerance for clock skew
 */
export async function verifyTOTP(
  secret: string,
  token: string,
  time?: number
): Promise<boolean> {
  const now = time ?? Date.now();
  const testWindows = [-1, 0, 1]; // Check previous, current, and next time windows

  for (const window of testWindows) {
    const windowTime = now + window * 30000;
    const code = await generateTOTP(secret, windowTime);
    if (code === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate an otpauth:// URL for QR code scanning
 */
export function generateQRCodeURL(
  secret: string,
  email: string,
  issuer = "Boudreaux's Pharmacy"
): string {
  const encodedEmail = encodeURIComponent(email);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate backup recovery codes (10 codes, 8 alphanumeric each)
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < count; i++) {
    let code = "";
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);

    for (let j = 0; j < 8; j++) {
      code += charset[randomBytes[j] % charset.length];
    }
    codes.push(code);
  }

  return codes;
}
