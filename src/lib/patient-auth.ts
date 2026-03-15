import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.PATIENT_JWT_SECRET || "patient-secret-key"
);

export interface PatientTokenPayload {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

/**
 * Generate a JWT token for patient portal access
 */
export async function generatePatientToken(
  patientId: string,
  mrn: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const token = await new SignJWT({
    patientId,
    mrn,
    firstName,
    lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a patient JWT token
 */
export async function verifyPatientToken(
  token: string
): Promise<PatientTokenPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as unknown as PatientTokenPayload;

    return {
      patientId: payload.patientId,
      mrn: payload.mrn,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
  } catch {
    return null;
  }
}

/**
 * Extract and verify the Bearer token from a NextRequest
 */
export async function getPatientFromRequest(
  request: NextRequest
): Promise<PatientTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyPatientToken(token);
}
