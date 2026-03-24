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

    // Fetch full patient profile with related data
    const patientData = await prisma.patient.findUnique({
      where: { id: patient.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        mrn: true,
        dateOfBirth: true,
        email: true,
        preferredContact: true,
        gender: true,
        phoneNumbers: {
          where: { patientId: patient.id },
          select: {
            number: true,
            phoneType: true,
            isPrimary: true,
            acceptsSms: true,
          },
        },
        addresses: {
          select: {
            line1: true,
            line2: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            addressType: true,
            isDefault: true,
          },
        },
        allergies: {
          where: { status: "active" },
          select: {
            allergen: true,
            reaction: true,
            severity: true,
          },
        },
        insurance: {
          where: { isActive: true },
          select: {
            id: true,
            memberId: true,
            priority: true,
            thirdPartyPlan: {
              select: {
                planName: true,
              },
            },
          },
        },
      },
    });

    if (!patientData) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      patient: patientData,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Patient profile error:", message);

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
