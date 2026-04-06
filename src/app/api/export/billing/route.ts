import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/export/billing
 * Export billing/claims data as JSON
 * Query params: status, startDate, endDate
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("billing", "read");

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {} as Record<string, Date>;
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const claims = await prisma.claim.findMany({
      where,
      include: {
        fills: {
          include: {
            prescription: {
              include: {
                patient: {
                  select: { firstName: true, lastName: true, mrn: true },
                },
              },
            },
          },
          take: 1,
        },
        insurance: {
          include: {
            thirdPartyPlan: {
              select: { planName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData = claims.map((claim) => {
      const fill = claim.fills[0];
      const patient = fill?.prescription?.patient;
      return {
        "Claim Number": claim.claimNumber || claim.id,
        Patient: patient
          ? `${patient.lastName}, ${patient.firstName}`
          : "—",
        MRN: patient?.mrn || "—",
        Insurance: claim.insurance?.thirdPartyPlan?.planName || "—",
        "Amount Billed": `$${Number(claim.amountBilled).toFixed(2)}`,
        "Amount Allowed": claim.amountAllowed ? `$${Number(claim.amountAllowed).toFixed(2)}` : "—",
        "Amount Paid": claim.amountPaid ? `$${Number(claim.amountPaid).toFixed(2)}` : "—",
        "Patient Copay": claim.patientCopay ? `$${Number(claim.patientCopay).toFixed(2)}` : "—",
        Status: claim.status,
        "Submitted At": claim.submittedAt
          ? claim.submittedAt.toLocaleDateString("en-US")
          : "—",
        "Adjudicated At": claim.adjudicatedAt
          ? claim.adjudicatedAt.toLocaleDateString("en-US")
          : "—",
        "Paid At": claim.paidAt
          ? claim.paidAt.toLocaleDateString("en-US")
          : "—",
      };
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export billing error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to export billing data" },
      { status: 500 }
    );
  }
}
