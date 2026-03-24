import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseSession } from "@/lib/supabase-auth";
import { getErrorMessage } from "@/lib/errors";

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

    // Fetch all prescriptions for the patient
    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patient.id,
        isActive: true,
      },
      select: {
        id: true,
        rxNumber: true,
        status: true,
        directions: true,
        quantityPrescribed: true,
        quantityDispensed: true,
        daysSupply: true,
        refillsAuthorized: true,
        refillsRemaining: true,
        dateWritten: true,
        dateReceived: true,
        dateFilled: true,
        dateShipped: true,
        expirationDate: true,
        item: {
          select: {
            id: true,
            name: true,
            strength: true,
          },
        },
        formula: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        dateReceived: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      prescriptions,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Prescriptions fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}
