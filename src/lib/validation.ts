/**
 * Shared Zod validation schemas for API routes
 * HIPAA Technical Safeguard: Input validation
 */

import { z } from "zod";

// ─── Primitives ────────────────────────────────────
export const uuid = z.string().uuid("Invalid UUID format");
export const email = z.string().email("Invalid email address").toLowerCase().trim();
export const phone = z.string().regex(/^\+?[\d\s\-().]{7,20}$/, "Invalid phone number").optional();
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");
export const dateOptional = date.optional();
export const positiveInt = z.number().int().positive();
export const nonNegativeDecimal = z.number().min(0);

// ─── Pagination ────────────────────────────────────
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Date Range ────────────────────────────────────
export const dateRangeSchema = z.object({
  startDate: date,
  endDate: date,
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: "startDate must be before endDate" }
);

// ─── Patient ───────────────────────────────────────
export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  dateOfBirth: date,
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  email: email.optional(),
  ssnLastFour: z.string().regex(/^\d{4}$/, "Must be exactly 4 digits").optional(),
  mrn: z.string().max(30).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

// ─── Prescription ──────────────────────────────────
export const createPrescriptionSchema = z.object({
  patientId: uuid,
  prescriberId: uuid.optional(),
  itemId: uuid.optional(),
  formulaId: uuid.optional(),
  rxNumber: z.string().max(20).optional(),
  quantity: nonNegativeDecimal,
  daysSupply: z.number().int().min(0).max(365).optional(),
  refillsAuthorized: z.number().int().min(0).max(99).optional(),
  directions: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── Claims ────────────────────────────────────────
export const submitClaimSchema = z.object({
  fillId: uuid,
  insuranceId: uuid.optional(),
  overrideCode: z.string().max(10).optional(),
});

export const reverseClaimSchema = z.object({
  claimId: uuid,
  reason: z.string().min(1).max(500),
});

// ─── User Invite ───────────────────────────────────
export const inviteUserSchema = z.object({
  email: email,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  roleId: uuid,
});

// ─── 2FA ───────────────────────────────────────────
export const verify2FASchema = z.object({
  action: z.enum(["enable", "disable", "verify", "recovery"]),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits").optional(),
  secret: z.string().optional(),
  recoveryCode: z.string().optional(),
});

// ─── SMS Notification ──────────────────────────────
export const smsPickupSchema = z.object({
  fillId: z.string().optional(),
  patientId: z.string().optional(),
  phone: z.string().min(7, "Phone number required"),
  patientName: z.string().optional(),
  rxNumber: z.string().optional(),
});

// ─── Twilio ────────────────────────────────────────
export const twilioMessageSchema = z.object({
  type: z.enum(["sms", "voice", "fax"]),
  to: z.string().min(7),
  body: z.string().min(1).max(1600).optional(),
  twiml: z.string().optional(),
  mediaUrl: z.string().url().optional(),
});

// ─── Inventory ─────────────────────────────────────
export const createItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  strength: z.string().max(50).optional(),
  ndc: z.string().regex(/^\d{11}$/, "NDC must be 11 digits").optional(),
  unitOfMeasure: z.string().max(20).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  isControlled: z.boolean().optional(),
  isCompoundIngredient: z.boolean().optional(),
  isRefrigerated: z.boolean().optional(),
});

// ─── Utility ───────────────────────────────────────
/**
 * Parse and validate request body with a Zod schema.
 * Returns { data, error } where exactly one is defined.
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (result.success) {
      return { data: result.data };
    }
    const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { error: messages.join("; ") };
  } catch {
    return { error: "Invalid JSON body" };
  }
}

/**
 * Parse and validate URL search params with a Zod schema.
 */
export function parseParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: string } {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => { obj[key] = value; });
  const result = schema.safeParse(obj);
  if (result.success) {
    return { data: result.data };
  }
  const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  return { error: messages.join("; ") };
}
