import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

interface RefillRequestBody {
  prescriptionId: string;
  notes?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify prescriber authentication
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get prescriptions with remaining refills for this prescriber
    const prescriptions = await prisma.prescription.findMany({
      where: {
        prescriberId: prescriber.prescriberId,
        refillsRemaining: { gt: 0 },
      },
      select: {
        id: true,
        rxNumber: true,
        status: true,
        refillsRemaining: true,
        refillsAuthorized: true,
        dateWritten: true,
        daysSupply: true,
        directions: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        formula: {
          select: {
            name: true,
          },
        },
        item: {
          select: {
            name: true,
          },
        },
        fills: {
          select: {
            id: true,
            fillNumber: true,
          },
          orderBy: { fillNumber: "desc" },
          take: 1,
        },
      },
      orderBy: { dateWritten: "desc" },
    });

    return NextResponse.json({
      success: true,
      refillableRxs: prescriptions.map((rx) => {
        const lastFill = rx.fills[0];
        const nextFillNumber = (lastFill?.fillNumber || 0) + 1;

        return {
          id: rx.id,
          rxNumber: rx.rxNumber,
          status: rx.status,
          refillsRemaining: rx.refillsRemaining,
          refillsAuthorized: rx.refillsAuthorized,
          dateWritten: rx.dateWritten,
          daysSupply: rx.daysSupply,
          directions: rx.directions,
          patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
          medication: rx.formula?.name || rx.item?.name || "Unknown",
          nextFillNumber,
        };
      }),
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Refills fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch refillable prescriptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify prescriber authentication
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: RefillRequestBody = await request.json();
    const { prescriptionId, notes } = body;

    if (!prescriptionId) {
      return NextResponse.json(
        { error: "prescriptionId is required" },
        { status: 400 }
      );
    }

    // Get prescription - verify prescriber owns it
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: {
        id: true,
        prescriberId: true,
        patientId: true,
        refillsRemaining: true,
        status: true,
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    if (prescription.prescriberId !== prescriber.prescriberId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (prescription.refillsRemaining <= 0) {
      return NextResponse.json(
        { error: "No refills remaining for this prescription" },
        { status: 400 }
      );
    }

    // Create a refill request
    const refillRequest = await prisma.refillRequest.create({
      data: {
        prescriptionId,
        patientId: prescription.patientId,
        source: "prescriber_portal",
        status: "pending",
        notes: notes || undefined,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      refillRequest,
      message: "Refill request submitted successfully",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Refill request error:", message);

    return NextResponse.json(
      { error: "Failed to create refill request" },
      { status: 500 }
    );
  }
}
