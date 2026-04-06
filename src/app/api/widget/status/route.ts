/**
 * Public Rx Status Check API
 *
 * GET /api/widget/status?rxNumber=...&lastName=...&dob=...
 * Returns prescription status without PHI — just a status label.
 * Authenticated via pharmacy widget API key (X-Widget-Key header).
 */

import { NextRequest, NextResponse } from "next/server";

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

// Map internal statuses to public-safe labels
function toPublicStatus(
  rxStatus: string,
  hasPendingRefill: boolean
): { label: string; color: "green" | "blue" | "yellow" | "red" | "gray" } {
  if (rxStatus === "ready_for_pickup" || rxStatus === "completed") {
    return { label: "Ready for Pickup", color: "green" };
  }
  if (
    rxStatus === "filling" ||
    rxStatus === "in_progress" ||
    rxStatus === "verifying" ||
    hasPendingRefill
  ) {
    return { label: "In Progress", color: "blue" };
  }
  if (rxStatus === "on_hold" || rxStatus === "pending_auth") {
    return { label: "On Hold", color: "yellow" };
  }
  if (rxStatus === "discontinued" || rxStatus === "transferred") {
    return { label: "Inactive", color: "red" };
  }
  return { label: "Received", color: "gray" };
}

export async function GET(request: NextRequest) {
  try {
    // API key validation
    const apiKey = request.headers.get("x-widget-key");
    if (!(await validateWidgetApiKey(apiKey))) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing API key." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rxNumber = searchParams.get("rxNumber");
    const lastName = searchParams.get("lastName");
    const dob = searchParams.get("dob");

    if (!rxNumber || !lastName || !dob) {
      return NextResponse.json(
        { success: false, error: "rxNumber, lastName, and dob are required." },
        { status: 400 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const prescription = await prisma.prescription.findUnique({
      where: { rxNumber },
      include: { patient: true },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found." },
        { status: 404 }
      );
    }

    // Verify patient identity
    const lastNormalized = lastName.trim().toLowerCase();
    const rxLastNormalized = prescription.patient.lastName.toLowerCase();
    const dobInput = new Date(dob);
    const dobStored = new Date(prescription.patient.dateOfBirth);

    const lastNameMatch = rxLastNormalized === lastNormalized;
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

    // Check for pending refill
    const pendingRefill = await prisma.refillRequest.findFirst({
      where: { prescriptionId: prescription.id, status: "pending" },
    });

    const status = toPublicStatus(prescription.status, !!pendingRefill);

    // Estimated ready: if filling, estimate ~2 hours from last update
    let estimatedReady: string | null = null;
    if (status.label === "In Progress") {
      const eta = new Date(prescription.updatedAt);
      eta.setHours(eta.getHours() + 2);
      if (eta > new Date()) {
        estimatedReady = eta.toISOString();
      }
    }

    return NextResponse.json({
      success: true,
      status: status.label,
      statusColor: status.color,
      estimatedReady,
      refillsRemaining: prescription.refillsRemaining,
    });
  } catch (error) {
    console.error("[Widget Status API] Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
