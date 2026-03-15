import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.PRESCRIBER_JWT_SECRET || "prescriber-secret-key"
);

export interface PrescriberTokenPayload {
  prescriberId: string;
  npi: string;
  name: string;
}

/**
 * Generate a JWT token for prescriber portal access
 */
export async function generatePrescriberToken(
  prescriberId: string,
  npi: string,
  name: string
): Promise<string> {
  const token = await new SignJWT({
    prescriberId,
    npi,
    name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a prescriber JWT token
 */
export async function verifyPrescriberToken(
  token: string
): Promise<PrescriberTokenPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as unknown as PrescriberTokenPayload;

    return {
      prescriberId: payload.prescriberId,
      npi: payload.npi,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

/**
 * Extract and verify the Bearer token from a NextRequest
 */
export async function getPrescriberFromRequest(
  request: NextRequest
): Promise<PrescriberTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyPrescriberToken(token);
}
