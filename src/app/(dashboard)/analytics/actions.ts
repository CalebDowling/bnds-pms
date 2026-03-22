"use server";

export async function getDailyFills(days: number) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const fills = await prisma.prescriptionFill.groupBy({
    by: ["filledAt"],
    where: {
      filledAt: {
        gte: startDate,
      },
      status: "dispensed",
    },
    _count: true,
  });

  // Build date-indexed map for all days
  const dateMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dateMap[dateStr] = 0;
  }

  fills.forEach((f) => {
    if (f.filledAt) {
      const dateStr = f.filledAt.toISOString().split("T")[0];
      dateMap[dateStr] = f._count;
    }
  });

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
    }));
}

export async function getRevenueTrend(days: number) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get all POS transactions and payments
  const posTransactions = await prisma.posTransaction.groupBy({
    by: ["processedAt"],
    where: {
      processedAt: {
        gte: startDate,
      },
    },
    _sum: {
      total: true,
    },
  });

  const payments = await prisma.payment.groupBy({
    by: ["processedAt"],
    where: {
      processedAt: {
        gte: startDate,
      },
      status: "completed",
    },
    _sum: {
      amount: true,
    },
  });

  // Build date-indexed map
  const dateMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dateMap[dateStr] = 0;
  }

  posTransactions.forEach((t) => {
    const dateStr = t.processedAt.toISOString().split("T")[0];
    dateMap[dateStr] = (dateMap[dateStr] || 0) + (Number(t._sum?.total ?? 0) || 0);
  });

  payments.forEach((p) => {
    const dateStr = p.processedAt.toISOString().split("T")[0];
    dateMap[dateStr] = (dateMap[dateStr] || 0) + (Number(p._sum?.amount ?? 0) || 0);
  });

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value: parseFloat(value.toFixed(2)),
    }));
}

export async function getTopDrugs(limit: number = 10) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const topDrugs = await prisma.prescriptionFill.groupBy({
    by: ["itemId"],
    where: {
      itemId: {
        not: null,
      },
    },
    _count: { id: true },
    orderBy: {
      _count: { id: "desc" },
    },
    take: limit,
  });

  const results = await Promise.all(
    topDrugs.map(async (drug) => {
      const item = await prisma.item.findUnique({
        where: { id: drug.itemId! },
        select: { name: true, strength: true },
      });
      return {
        name: item ? `${item.name}${item.strength ? ` ${item.strength}` : ""}` : "Unknown",
        count: drug._count.id,
      };
    })
  );

  return results;
}

export async function getStatusBreakdown() {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const statusCounts = await prisma.prescriptionFill.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  return statusCounts.map((s) => ({
    status: s.status,
    count: s._count.id,
  }));
}

export async function getTurnaroundTrend(days: number) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const fills = await prisma.prescriptionFill.findMany({
    where: {
      dispensedAt: {
        gte: startDate,
      },
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      dispensedAt: true,
    },
  });

  // Group by date and calculate average turnaround
  const dateMap: Record<string, { total: number; count: number }> = {};

  fills.forEach((fill) => {
    if (fill.dispensedAt) {
      const dateStr = fill.dispensedAt.toISOString().split("T")[0];
      const turnaroundMs = fill.dispensedAt.getTime() - fill.createdAt.getTime();
      const turnaroundDays = turnaroundMs / (1000 * 60 * 60 * 24);

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { total: 0, count: 0 };
      }
      dateMap[dateStr].total += turnaroundDays;
      dateMap[dateStr].count += 1;
    }
  });

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      value: parseFloat((data.total / data.count).toFixed(2)),
    }));
}

export async function getClaimsPerformance(days: number) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const claims = await prisma.claim.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      status: true,
    },
  });

  const approved = claims.filter((c) => c.status === "approved").length;
  const rejected = claims.filter((c) => c.status === "rejected").length;
  const total = claims.length || 1;

  return {
    approvalRate: Math.round((approved / total) * 100),
    rejectionRate: Math.round((rejected / total) * 100),
    approved,
    rejected,
    pending: claims.filter((c) => c.status === "pending").length,
  };
}
