"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { submitClaim, reverseClaim } from "@/lib/claims/adjudicator";
import { getErrorMessage } from "@/lib/errors";

// ═══════════════════════════════════════════════
// CLAIM QUERIES
// ═══════════════════════════════════════════════

/**
 * Get paginated list of claims with optional search and status filtering
 */
export async function getClaims({
  search = "",
  status = "all",
  page = 1,
  limit = 25,
}: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const skip = Math.max(0, (page - 1) * limit);
  const where: Prisma.ClaimWhereInput = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { claimNumber: { contains: search, mode: "insensitive" } },
      {
        insurance: {
          patient: {
            firstName: { contains: search, mode: "insensitive" },
          },
        },
      },
      {
        insurance: {
          patient: {
            lastName: { contains: search, mode: "insensitive" },
          },
        },
      },
      {
        fills: {
          some: {
            prescription: {
              rxNumber: { contains: search, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: {
        insurance: {
          include: {
            thirdPartyPlan: {
              select: { id: true, planName: true, bin: true, pcn: true },
            },
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
        fills: {
          take: 1,
          include: {
            prescription: {
              select: {
                id: true,
                rxNumber: true,
                item: { select: { id: true, name: true } },
                formula: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);

  return {
    claims,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

/**
 * Get a single claim with full details
 */
export async function getClaim(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.claim.findUnique({
    where: { id },
    include: {
      insurance: {
        include: {
          thirdPartyPlan: true,
          patient: true,
        },
      },
      fills: {
        include: {
          prescription: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                  dateOfBirth: true,
                },
              },
              item: true,
              formula: {
                select: { id: true, name: true },
              },
              prescriber: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  npi: true,
                  deaNumber: true,
                },
              },
            },
          },
          itemLot: true,
          filler: {
            select: { id: true, firstName: true, lastName: true },
          },
          verifier: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
}

// ═══════════════════════════════════════════════
// CLAIM SUBMISSIONS
// ═══════════════════════════════════════════════

/**
 * Submit a new claim for a prescription fill
 */
export async function submitClaimAction(
  fillId: string,
  insuranceId: string,
  overrideCodes?: string[]
) {
  const user = await requireUser();

  try {
    const response = await submitClaim(
      {
        fillId,
        insuranceId,
        overrideCodes,
      },
      user.id
    );

    revalidatePath("/dashboard/billing/claims");

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Reverse a paid claim
 */
export async function reverseClaimAction(claimId: string, reason?: string) {
  const user = await requireUser();

  try {
    const response = await reverseClaim(claimId, reason, user.id);

    revalidatePath("/dashboard/billing/claims");
    revalidatePath(`/dashboard/billing/claims/${claimId}`);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Resubmit a rejected claim with optional override codes
 */
export async function resubmitClaim(claimId: string, overrideCodes?: string[]) {
  const user = await requireUser();

  try {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        fills: {
          select: { id: true },
        },
      },
    });

    if (!claim) {
      return {
        success: false,
        error: "Claim not found",
      };
    }

    if (claim.status !== "rejected") {
      return {
        success: false,
        error: "Only rejected claims can be resubmitted",
      };
    }

    const fillId = claim.fills[0]?.id;
    if (!fillId) {
      return {
        success: false,
        error: "No fill associated with claim",
      };
    }

    // Delete old claim to allow resubmission
    await prisma.claim.delete({ where: { id: claimId } });

    const response = await submitClaim(
      {
        fillId,
        insuranceId: claim.insuranceId,
        overrideCodes,
      },
      user.id
    );

    revalidatePath("/dashboard/billing/claims");

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      success: false,
      error: message,
    };
  }
}

// ═══════════════════════════════════════════════
// CLAIM STATISTICS
// ═══════════════════════════════════════════════

/**
 * Get claim statistics for dashboard
 */
export async function getClaimStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const [pending, submitted, paid, rejected, reversed, total] = await Promise.all([
    prisma.claim.count({ where: { status: "pending" } }),
    prisma.claim.count({ where: { status: "submitted" } }),
    prisma.claim.count({ where: { status: "paid" } }),
    prisma.claim.count({ where: { status: "rejected" } }),
    prisma.claim.count({ where: { status: "reversed" } }),
    prisma.claim.count(),
  ]);

  return {
    pending,
    submitted,
    paid,
    rejected,
    reversed,
    total,
  };
}

/**
 * Get total amounts by status
 */
export async function getClaimAmounts() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const claims = await prisma.claim.findMany({
    select: {
      status: true,
      amountBilled: true,
      amountPaid: true,
    },
  });

  const stats: Record<string, { billed: number; paid: number }> = {
    pending: { billed: 0, paid: 0 },
    submitted: { billed: 0, paid: 0 },
    paid: { billed: 0, paid: 0 },
    rejected: { billed: 0, paid: 0 },
    reversed: { billed: 0, paid: 0 },
  };

  for (const claim of claims) {
    const billed = claim.amountBilled.toNumber();
    const paid = claim.amountPaid?.toNumber() || 0;

    if (stats[claim.status]) {
      stats[claim.status].billed += billed;
      stats[claim.status].paid += paid;
    }
  }

  return stats;
}

/**
 * Get recent claims (for dashboard widget)
 */
export async function getRecentClaims(limit: number = 10) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.claim.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      insurance: {
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      fills: {
        take: 1,
        include: {
          prescription: {
            select: {
              id: true,
              rxNumber: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get claims grouped by status for analytics
 */
export async function getClaimsGroupedByStatus() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const results = await prisma.claim.groupBy({
    by: ["status"],
    _count: true,
    _sum: {
      amountBilled: true,
      amountPaid: true,
    },
  });

  return results.map((group) => ({
    status: group.status,
    count: group._count,
    totalBilled: group._sum.amountBilled?.toNumber() || 0,
    totalPaid: group._sum.amountPaid?.toNumber() || 0,
  }));
}

/**
 * Get most common rejection codes for the period
 */
export async function getTopRejectionCodes(limit: number = 10) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const claims = await prisma.claim.findMany({
    where: { status: "rejected" },
    select: { rejectionCodes: true },
  });

  const codeMap = new Map<string, number>();

  for (const claim of claims) {
    if (claim.rejectionCodes && Array.isArray(claim.rejectionCodes)) {
      for (const code of claim.rejectionCodes as string[]) {
        codeMap.set(code as string, (codeMap.get(code as string) || 0) + 1);
      }
    }
  }

  return Array.from(codeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([code, count]) => ({ code, count }));
}
