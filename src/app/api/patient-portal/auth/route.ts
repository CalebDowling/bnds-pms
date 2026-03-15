import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePatientToken } from "@/lib/patient-auth";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { lastName, dateOfBirth, mrn } = body;

    // Validate required fields
    if (!lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: "Last name and date of birth are required" },
        { status: 400 }
      );
    }

    // Parse and validate dateOfBirth
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth format" },
        { status: 400 }
      );
    }

    // Build query to find patient
    // Can search by MRN (if provided) or by lastName + dateOfBirth
    const patient = await prisma.patient.findFirst({
      where: {
        lastName: {
          equals: lastName,
          mode: "insensitive",
        },
        dateOfBirth: dob,
        status: "active",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mrn: true,
        dateOfBirth: true,
      },
    });

    // Verify patient exists
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found. Please verify your information." },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generatePatientToken(
      patient.id,
      patient.mrn,
      patient.firstName,
      patient.lastName
    );

    return NextResponse.json({
      success: true,
      token,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: patient.mrn,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Patient auth error:", message);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
