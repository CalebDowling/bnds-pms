"use server";

interface RealTimeStatsData {
  paidClaims: number;
  rxSold: number;
  grossProfit: number;
  efficiency: number;
  postEdits: number;
  packagesShipped: number;
}

export async function getRealTimeStats(): Promise<RealTimeStatsData> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Get paid claims today
    const paidClaims = await prisma.claim.count({
      where: {
        status: "paid",
        paidAt: { gte: today },
      },
    });

    // Get Rx sold today
    const rxSold = await prisma.prescriptionFill.count({
      where: {
        dispensedAt: { gte: today },
      },
    });

    // Get gross profit today
    const profitData = await prisma.prescriptionFill.aggregate({
      where: {
        dispensedAt: { gte: today },
      },
      _sum: {
        totalPrice: true,
        ingredientCost: true,
      },
    });

    const totalPrice = profitData._sum?.totalPrice?.toNumber() || 0;
    const totalCost = profitData._sum?.ingredientCost?.toNumber() || 0;
    const grossProfit = totalPrice - totalCost;

    // Get efficiency (fills per hour)
    const startOfDay = new Date(today);
    const now = new Date();
    const hoursSinceStart = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    const efficiency = hoursSinceStart > 0 ? Math.round(rxSold / hoursSinceStart) : 0;

    // Get post edits (prescription status log changes) today
    const postEdits = await prisma.prescriptionStatusLog.count({
      where: {
        changedAt: { gte: today },
      },
    });

    // Get packages shipped today
    const packagesShipped = await prisma.shipment.count({
      where: {
        shipDate: { gte: today },
      },
    });

    return {
      paidClaims,
      rxSold,
      grossProfit: Math.max(0, grossProfit),
      efficiency,
      postEdits,
      packagesShipped,
    };
  } catch (error) {
    console.error("Error fetching real-time stats:", error);
    return {
      paidClaims: 0,
      rxSold: 0,
      grossProfit: 0,
      efficiency: 0,
      postEdits: 0,
      packagesShipped: 0,
    };
  }
}
