import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify patient from token
    const patient = await getPatientFromRequest(request);

    if (!patient) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch full patient profile with related data
    const patientData = await prisma.patient.findUnique({
      where: { id: patient.patientId },
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
          where: { patient: { id: patient.patientId } },
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
