/**
 * Public Refill Widget API
 *
 * POST /api/widget/refill
 * Accepts refill requests from the embeddable web widget.
 * Authenticated via pharmacy API key (X-Widget-Key header), not user session.
 * Rate-limited to 10 requests per IP per hour.
 */

import { NextRequest, NextResponse } from "next/server";

// ── In-memory rate-limit store (per-process; swap for Redis in prod) ────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function validateWidgetApiKey(key: string | null): Promise<boolean> {
  if (!key) return false;
  const { prisma } = await import("@/lib/prisma");
  const store = await prisma.store.findFirst();
  if (!store) return false;

  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId: store.id, settingKey: "widget_api_key" } },
  });

  return setting?.settingValue === key;
}

// ── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // API key validation
    const apiKey = request.headers.get("x-widget-key");
    if (!(await validateWidgetApiKey(apiKey))) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing API key." },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json();
    const { patientLastName, patientDOB, rxNumber, patientPhone } = body as {
      patientLastName?: string;
      patientDOB?: string;
      rxNumber?: string;
      patientPhone?: string;
    };

    // Validate required fields
    if (!patientLastName || !patientDOB || !rxNumber) {
      return NextResponse.json(
        { success: false, error: "Last name, date of birth, and RX number are required." },
        { status: 400 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

    // Look up prescription
    const prescription = await prisma.prescription.findUnique({
      where: { rxNumber },
      include: { patient: true },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found. Please verify your RX number." },
        { status: 404 }
      );
    }

    // Verify patient identity
    const patientLastNormalized = patientLastName.trim().toLowerCase();
    const rxLastNormalized = prescription.patient.lastName.toLowerCase();
    const dobInput = new Date(patientDOB);
    const dobStored = new Date(prescription.patient.dateOfBirth);

    const lastNameMatch = rxLastNormalized === patientLastNormalized;
    const dobMatch =
      dobInput.getFullYear() === dobStored.getFullYear() &&
      dobInput.getMonth() === dobStored.getMonth() &&
      dobInput.getDate() === dobStored.getDate();

    if (!lastNameMatch || !dobMatch) {
      return NextResponse.json(
        { success: false, error: "Patient information does not match our records." },
        { status: 400 }
      );
    }

    // Check refills remaining
    if (prescription.refillsRemaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No refills remaining on this prescription. Please contact the pharmacy or your prescriber.",
        },
        { status: 400 }
      );
    }

    // Check prescription is active
    if (!prescription.isActive || prescription.status === "discontinued") {
      return NextResponse.json(
        { success: false, error: "This prescription is no longer active." },
        { status: 400 }
      );
    }

    // Check for duplicate pending request
    const existingPending = await prisma.refillRequest.findFirst({
      where: {
        prescriptionId: prescription.id,
        status: "pending",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: true,
          message:
            "A refill request for this prescription is already being processed. You will receive a notification when it is ready.",
        },
        { status: 200 }
      );
    }

    // Create RefillRequest
    await prisma.refillRequest.create({
      data: {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        source: "web_widget",
        status: "pending",
        notes: patientPhone ? `Phone: ${patientPhone}` : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Your refill has been submitted! You will receive a text when it is ready for pickup.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Widget Refill API] Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
