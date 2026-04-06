import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
 * Extract and verify the prescriber from a NextRequest.
 * Tries Bearer JWT first, then falls back to Supabase session.
 */
export async function getPrescriberFromRequest(
  request: NextRequest
): Promise<PrescriberTokenPayload | null> {
  // 1. Try Bearer JWT token (NPI login)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyPrescriberToken(token);
    if (payload) return payload;
  }

  // 2. Try cookie-based JWT token (NPI login via cookie)
  const cookieToken = request.cookies.get("prescriber_token")?.value;
  if (cookieToken) {
    const payload = await verifyPrescriberToken(cookieToken);
    if (payload) return payload;
  }

  // 3. Fall back to Supabase Auth session (email login)
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.user_metadata?.role === "prescriber") {
      const npi = user.user_metadata?.npi;
      if (npi) {
        const prescriber = await prisma.prescriber.findUnique({
          where: { npi },
          select: { id: true, npi: true, firstName: true, lastName: true },
        });
        if (prescriber) {
          return {
            prescriberId: prescriber.id,
            npi: prescriber.npi,
            name: `${prescriber.firstName} ${prescriber.lastName}`,
          };
        }
      }
    }
  } catch {
    // Supabase session check failed, continue
  }

  return null;
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
