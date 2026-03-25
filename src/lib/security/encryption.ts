/**
 * Field-level encryption for PHI data using AES-256-GCM
 * HIPAA Technical Safeguard: Encryption at Rest
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16; // GCM auth tag length
const ENCODING = "base64" as const;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required for PHI encryption");
  }
  // Key must be 32 bytes (256 bits) for AES-256
  const keyBuffer = Buffer.from(key, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte base64-encoded key");
  }
  return keyBuffer;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns: base64 string of IV + ciphertext + auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack: IV (12) + encrypted data + auth tag (16)
  const result = Buffer.concat([iv, encrypted, tag]);
  return result.toString(ENCODING);
}

/**
 * Decrypt ciphertext encrypted with encrypt()
 * Input: base64 string from encrypt()
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, ENCODING);

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Check if a string appears to be encrypted (base64 with minimum length for IV+tag)
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 40) return false;
  try {
    const buf = Buffer.from(value, ENCODING);
    return buf.length >= IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Safely encrypt — returns original if encryption fails or key not configured
 * Use for gradual migration of existing plaintext data
 */
export function safeEncrypt(plaintext: string): string {
  if (!plaintext || !process.env.ENCRYPTION_KEY) return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // Already encrypted
  try {
    return encrypt(plaintext);
  } catch {
    return plaintext;
  }
}

/**
 * Safely decrypt — returns original if decryption fails
 * Use for reading data that may or may not be encrypted yet
 */
export function safeDecrypt(ciphertext: string): string {
  if (!ciphertext || !process.env.ENCRYPTION_KEY) return ciphertext;
  if (!isEncrypted(ciphertext)) return ciphertext; // Not encrypted
  try {
    return decrypt(ciphertext);
  } catch {
    return ciphertext;
  }
}

/**
 * Generate a new encryption key (run once, store in env)
 * Usage: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString(ENCODING);
}
