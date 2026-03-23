import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription || prescription.prescriberId !== prescriber.prescriberId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch relations separately to avoid select/include conflicts
    const [patient, formula, item, fills, statusLog] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: prescription.patientId },
        include: {
          phoneNumbers: { where: { isPrimary: true }, take: 1 },
        },
      }),
      prescription.formulaId
        ? prisma.formula.findUnique({
            where: { id: prescription.formulaId },
            select: { id: true, name: true, dosageForm: true, route: true },
          })
        : null,
      prescription.itemId
        ? prisma.item.findUnique({
            where: { id: prescription.itemId },
            select: { id: true, name: true, strength: true, ndc: true },
          })
        : null,
      prisma.prescriptionFill.findMany({
        where: { prescriptionId: id },
        select: {
          id: true,
          fillNumber: true,
          status: true,
          quantity: true,
          daysSupply: true,
          filledAt: true,
          dispensedAt: true,
        },
        orderBy: { fillNumber: "asc" },
      }),
      prisma.prescriptionStatusLog.findMany({
        where: { prescriptionId: id },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          changedAt: true,
        },
        orderBy: { changedAt: "asc" },
      }),
    ]);

    const patientPhone = patient?.phoneNumbers[0]?.number || null;

    return NextResponse.json({
      success: true,
      order: {
        id: prescription.id,
        rxNumber: prescription.rxNumber,
        status: prescription.status,
        priority: prescription.priority,
        dateWritten: prescription.dateWritten,
        dateReceived: prescription.dateReceived,
        dateFilled: prescription.dateFilled,
        dateShipped: prescription.dateShipped,
        prescription: {
          quantityPrescribed: prescription.quantityPrescribed,
          quantityDispensed: prescription.quantityDispensed,
          daysSupply: prescription.daysSupply,
          directions: prescription.directions,
          refillsAuthorized: prescription.refillsAuthorized,
          refillsRemaining: prescription.refillsRemaining,
          prescriberNotes: prescription.prescriberNotes,
        },
        patient: patient
          ? {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              dateOfBirth: patient.dateOfBirth,
              email: patient.email,
              phone: patientPhone,
              metadata: patient.metadata,
            }
          : null,
        formula,
        item,
        fills,
        statusTimeline: statusLog,
        metadata: prescription.metadata,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Order detail fetch error:", message);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}
