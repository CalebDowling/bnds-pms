import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

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

    // Get all prescriptions for this prescriber to find their patients
    const prescriptions = await prisma.prescription.findMany({
      where: { prescriberId: prescriber.prescriberId },
      select: { patientId: true },
      distinct: ["patientId"],
    });

    const patientIds = prescriptions.map((p) => p.patientId);

    // Get all payments for patients of this prescriber's prescriptions
    const payments = await prisma.payment.findMany({
      where: {
        patientId: { in: patientIds },
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        status: true,
        processedAt: true,
        fill: {
          select: {
            id: true,
            prescription: {
              select: {
                rxNumber: true,
                patient: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { processedAt: "desc" },
    });

    // Get prescription fill details for invoice generation
    const fills = await prisma.prescriptionFill.findMany({
      where: {
        prescription: {
          prescriberId: prescriber.prescriberId,
        },
      },
      select: {
        id: true,
        totalPrice: true,
        dispensingFee: true,
        ingredientCost: true,
        copayAmount: true,
        status: true,
        dispensedAt: true,
        prescription: {
          select: {
            rxNumber: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { dispensedAt: "desc" },
    });

    // Calculate summary statistics
    const totalBilled = fills.reduce((sum, fill) => {
      return sum + (fill.totalPrice ? Number(fill.totalPrice) : 0);
    }, 0);

    const totalPaid = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const outstandingBalance = totalBilled - totalPaid;

    const lastPayment = payments
      .filter((p) => p.status === "completed")
      .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime())[0];

    // Build invoices list
    const invoices = fills
      .filter((f) => f.totalPrice)
      .map((fill) => ({
        fillId: fill.id,
        rxNumber: fill.prescription.rxNumber,
        patientName: `${fill.prescription.patient.firstName} ${fill.prescription.patient.lastName}`,
        totalPrice: Number(fill.totalPrice),
        dispensingFee: fill.dispensingFee ? Number(fill.dispensingFee) : 0,
        ingredientCost: fill.ingredientCost ? Number(fill.ingredientCost) : 0,
        copayAmount: fill.copayAmount ? Number(fill.copayAmount) : 0,
        status: fill.status,
        dispensedAt: fill.dispensedAt,
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalBilled: parseFloat(totalBilled.toFixed(2)),
        outstandingBalance: parseFloat(outstandingBalance.toFixed(2)),
        lastPaymentDate: lastPayment?.processedAt || null,
        lastPaymentAmount: lastPayment
          ? parseFloat(Number(lastPayment.amount).toFixed(2))
          : null,
      },
      invoices,
      paymentHistory: payments.map((p) => ({
        id: p.id,
        amount: parseFloat(Number(p.amount).toFixed(2)),
        paymentMethod: p.paymentMethod,
        status: p.status,
        processedAt: p.processedAt,
        fillId: p.fill?.id || null,
      })),
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Billing fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}
