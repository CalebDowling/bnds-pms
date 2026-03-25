import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "crypto";

// Set test encryption key before importing module
beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("encryption", () => {
  it("encrypts and decrypts correctly", async () => {
    const { encrypt, decrypt } = await import("@/lib/security/encryption");
    const plaintext = "1234"; // SSN last 4
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.length).toBeGreaterThan(30);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/security/encryption");
    const a = encrypt("test");
    const b = encrypt("test");
    expect(a).not.toBe(b); // Random IV means different output each time
  });

  it("isEncrypted detects encrypted vs plain strings", async () => {
    const { encrypt, isEncrypted } = await import("@/lib/security/encryption");
    expect(isEncrypted("1234")).toBe(false);
    expect(isEncrypted("hello")).toBe(false);
    expect(isEncrypted(encrypt("test"))).toBe(true);
  });

  it("safeDecrypt returns original for non-encrypted input", async () => {
    const { safeDecrypt } = await import("@/lib/security/encryption");
    expect(safeDecrypt("plaintext")).toBe("plaintext");
    expect(safeDecrypt("")).toBe("");
  });

  it("safeEncrypt skips already-encrypted input", async () => {
    const { encrypt, safeEncrypt } = await import("@/lib/security/encryption");
    const encrypted = encrypt("data");
    const result = safeEncrypt(encrypted);
    expect(result).toBe(encrypted); // Should not double-encrypt
  });
});
