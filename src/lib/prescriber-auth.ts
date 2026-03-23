import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.PRESCRIBER_JWT_SECRET || "prescriber-secret-key"
);

export interface PrescriberTokenPayload {
  prescriberId: string;
  npi: string;
  name: string;
}

/**
 * Generate a JWT token for prescriber portal access (legacy/API use)
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
 * Verify and decode a prescriber JWT token (legacy/API use)
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
 * Extract and verify the Bearer token from a NextRequest (legacy/API use)
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

/**
 * Get the current prescriber from Supabase Auth session.
 * Returns the prescriber record if the logged-in user has prescriber role.
 */
export async function getPrescriberFromSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Check user metadata for prescriber role
    const role = user.user_metadata?.role;
    const prescriberId = user.user_metadata?.prescriber_id;

    if (role !== "prescriber" || !prescriberId) return null;

    return {
      userId: user.id,
      prescriberId,
      email: user.email || "",
      name: user.user_metadata?.full_name || "",
      npi: user.user_metadata?.npi || "",
    };
  } catch {
    return null;
  }
}

/**
 * Require prescriber session — redirect to portal login if not authenticated
 */
export async function requirePrescriber() {
  const prescriber = await getPrescriberFromSession();
  if (!prescriber) {
    throw new Error("PRESCRIBER_AUTH_REQUIRED");
  }
  return prescriber;
}
