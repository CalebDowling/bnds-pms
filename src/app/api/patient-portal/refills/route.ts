import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseSession } from "@/lib/supabase-auth";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify patient from Supabase Auth token
    const authContext = await getSupabaseSession(request);

    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find patient record by email
    const patient = await prisma.patient.findFirst({
      where: {
        email: authContext.email,
        status: "active",
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { prescriptionId, notes } = body;

    if (!prescriptionId) {
      return NextResponse.json(
        { error: "Prescription ID is required" },
        { status: 400 }
      );
    }

    // Verify prescription belongs to patient and is eligible for refill
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: {
        id: true,
        patientId: true,
        refillsRemaining: true,
        expirationDate: true,
        rxNumber: true,
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    if (prescription.patientId !== patient.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if prescription has refills remaining
    if (prescription.refillsRemaining <= 0) {
      return NextResponse.json(
        { error: "No refills remaining for this prescription" },
        { status: 400 }
      );
    }

    // Check if prescription is expired
    if (prescription.expirationDate && new Date(prescription.expirationDate) < new Date()) {
      return NextResponse.json(
        { error: "Prescription has expired" },
        { status: 400 }
      );
    }

    // Create refill request
    const refillRequest = await prisma.refillRequest.create({
      data: {
        prescriptionId,
        patientId: patient.id,
        source: "patient_portal",
        status: "pending",
        notes: notes || null,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        prescription: {
          select: {
            rxNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      refillRequest,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Refill request creation error:", message);

    return NextResponse.json(
      { error: "Failed to create refill request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify patient from Supabase Auth token
    const authContext = await getSupabaseSession(request);

    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find patient record by email
    const patient = await prisma.patient.findFirst({
      where: {
        email: authContext.email,
        status: "active",
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found" },
        { status: 404 }
      );
    }

    // Fetch refill request history for the patient
    const refillRequests = await prisma.refillRequest.findMany({
      where: {
        patientId: patient.id,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        notes: true,
        prescription: {
          select: {
            id: true,
            rxNumber: true,
            item: {
              select: {
                name: true,
                strength: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      refillRequests,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Refill requests fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch refill requests" },
      { status: 500 }
    );
  }
}
