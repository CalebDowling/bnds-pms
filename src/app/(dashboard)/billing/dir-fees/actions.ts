"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { formatPatientName } from "@/lib/utils/formatters";

// ═══════════════════════════════════════════════
// DIR FEES
// ═══════════════════════════════════════════════

export async function getDIRFees({
  startDate,
  endDate,
  page = 1,
  limit = 25,
}: {
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
}) {
  const skip = (page - 1) * limit;

  const where: Prisma.ClaimWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: {
        fills: {
          include: {
            prescription: {
              include: {
                item: { select: { name: true } },
                formula: { select: { name: true } },
              },
            },
          },
        },
        insurance: {
          include: {
            thirdPartyPlan: { select: { planName: true } },
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);

  // Extract DIR fees from claim notes and calculate net reimbursement
  const dirFeesData = claims.map((claim) => {
    // Parse DIR fee data from notes field if stored as JSON
    let dirFeeAmount = 0;
    let pbmName = claim.insurance?.thirdPartyPlan?.planName || "Unknown";

    if (claim.notes) {
      try {
        const noteData = JSON.parse(claim.notes);
        dirFeeAmount = noteData?.dirFeeAmount ? parseFloat(noteData.dirFeeAmount) : 0;
        pbmName = noteData?.pbmName || pbmName;
      } catch {
        // notes is plain text, not JSON - ignore
      }
    }

    const amountPaid = parseFloat(claim.amountPaid?.toString() || "0");
    const netReimbursement = amountPaid - dirFeeAmount;

    return {
      id: claim.id,
      date: claim.createdAt,
      claimNumber: claim.claimNumber,
      patient: formatPatientName(claim.insurance?.patient) || "Unknown",
      drug: claim.fills[0]?.prescription?.item?.name || claim.fills[0]?.prescription?.formula?.name || "Unknown",
      originalPaid: amountPaid,
      dirFeeAmount,
      netReimbursement,
      pbm: pbmName,
    };
  });

  return {
    fees: dirFeesData,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

export async function getDIRStats(startDate: Date, endDate: Date) {
  const claims = await prisma.claim.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      fills: {
        include: {
          prescription: {
            include: {
              item: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  let totalDIRFees = 0;
  let claimsWithDIR = 0;
  const drugImpact: Record<string, number> = {};

  claims.forEach((claim) => {
    let dirFeeAmount = 0;

    if (claim.notes) {
      try {
        const noteData = JSON.parse(claim.notes);
        dirFeeAmount = noteData?.dirFeeAmount ? parseFloat(noteData.dirFeeAmount) : 0;
      } catch {
        // notes is plain text, not JSON - ignore
      }
    }

    if (dirFeeAmount > 0) {
      totalDIRFees += dirFeeAmount;
      claimsWithDIR++;

      const drug = claim.fills[0]?.prescription?.item?.name || "Unknown";
      drugImpact[drug] = (drugImpact[drug] || 0) + dirFeeAmount;
    }
  });

  const averageDIRFee = claimsWithDIR > 0 ? totalDIRFees / claimsWithDIR : 0;

  const mostImpactedDrugs = Object.entries(drugImpact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([drug, amount]) => ({
      drug,
      totalImpact: amount,
    }));

  return {
    totalDIRFees,
    claimsWithDIR,
    averageDIRFee,
    mostImpactedDrugs,
  };
}

export async function recordDIRFee(
  claimId: string,
  amount: number,
  pbmName: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error("Claim not found");

  // Parse existing notes as JSON if present
  let dirFeeData = { dirFeeAmount: amount, pbmName, recordedAt: new Date().toISOString(), recordedBy: user.id };
  if (claim.notes) {
    try {
      const existingData = JSON.parse(claim.notes);
      dirFeeData = { ...existingData, ...dirFeeData };
    } catch {
      // notes is plain text, start fresh
    }
  }

  await prisma.claim.update({
    where: { id: claimId },
    data: { notes: JSON.stringify(dirFeeData) },
  });

  revalidatePath("/billing/dir-fees");
}

export async function exportDIRFeesCSV(startDate: Date, endDate: Date) {
  const { fees } = await getDIRFees({ startDate, endDate, page: 1, limit: 10000 });

  const headers = ["Date", "Claim#", "Patient", "Drug", "Original Paid", "DIR Fee", "Net Reimbursement", "PBM/Plan"];
  const rows = fees.map((fee) => [
    fee.date.toLocaleDateString(),
    fee.claimNumber || "",
    fee.patient,
    fee.drug,
    fee.originalPaid.toFixed(2),
    fee.dirFeeAmount.toFixed(2),
    fee.netReimbursement.toFixed(2),
    fee.pbm,
  ]);

  return { headers, rows };
}
