import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { Decimal } from "@prisma/client/runtime/library";

export interface AutomationResult {
  checkName: string;
  alertsGenerated: number;
  itemsProcessed: number;
  errors: string[];
}

/**
 * Check for low stock items and create notifications
 */
export async function checkLowStock(): Promise<AutomationResult> {
  const result: AutomationResult = {
    checkName: "checkLowStock",
    alertsGenerated: 0,
    itemsProcessed: 0,
    errors: [],
  };

  try {
    // Get all items with their lots grouped by item
    const items = await prisma.item.findMany({
      include: {
        lots: {
          where: {
            status: "available",
          },
        },
      },
      where: {
        reorderPoint: { not: null },
        isActive: true,
      },
    });

    result.itemsProcessed = items.length;

    for (const item of items) {
      try {
        // Calculate total quantity on hand
        const totalQty = item.lots.reduce(
          (sum, lot) => sum + (lot.quantityOnHand?.toNumber?.() || 0),
          0
        );

        const reorderPoint = item.reorderPoint?.toNumber?.() || 0;

        if (totalQty < reorderPoint) {
          // Find all users with inventory management permissions
          const users = await prisma.user.findMany({
            where: {
              roles: {
                some: {
                  role: {
                    name: {
                      in: ["admin", "inventory_manager"],
                    },
                  },
                },
              },
              isActive: true,
            },
          });

          for (const user of users) {
            await createNotification(
              user.id,
              "low_stock",
              `Low Stock Alert: ${item.name}`,
              `${item.name} has fallen below reorder point. Current quantity: ${totalQty}, Reorder point: ${reorderPoint}`,
              {
                itemId: item.id,
                itemName: item.name,
                currentQuantity: totalQty,
                reorderPoint,
              }
            );
          }

          result.alertsGenerated++;
        }
      } catch (error) {
        const errorMsg = `Error processing item ${item.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `checkLowStock failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Check for expiring lots and create notifications
 */
export async function checkExpiringLots(): Promise<AutomationResult> {
  const result: AutomationResult = {
    checkName: "checkExpiringLots",
    alertsGenerated: 0,
    itemsProcessed: 0,
    errors: [],
  };

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringLots = await prisma.itemLot.findMany({
      where: {
        status: "available",
        expirationDate: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      include: {
        item: true,
      },
    });

    result.itemsProcessed = expiringLots.length;

    // Group by timeframe
    const thisWeek: typeof expiringLots = [];
    const thisMonth: typeof expiringLots = [];

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const lot of expiringLots) {
      if (lot.expirationDate <= sevenDaysFromNow) {
        thisWeek.push(lot);
      } else {
        thisMonth.push(lot);
      }
    }

    // Find all users with inventory management permissions
    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: ["admin", "inventory_manager"],
              },
            },
          },
        },
        isActive: true,
      },
    });

    // Create notifications for this week expiring
    for (const lot of thisWeek) {
      const daysUntilExpiry = Math.ceil(
        (lot.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const user of users) {
        await createNotification(
          user.id,
          "expiring_lot",
          `URGENT: ${lot.item.name} expires in ${daysUntilExpiry} days`,
          `Lot ${lot.lotNumber} of ${lot.item.name} expires on ${lot.expirationDate.toDateString()}. Quantity on hand: ${lot.quantityOnHand}`,
          {
            itemId: lot.itemId,
            itemName: lot.item.name,
            lotNumber: lot.lotNumber,
            daysUntilExpiry,
            expirationDate: lot.expirationDate.toISOString(),
            quantityOnHand: lot.quantityOnHand.toNumber?.(),
          }
        );
      }

      result.alertsGenerated++;
    }

    // Create notifications for this month expiring (less urgent)
    for (const lot of thisMonth) {
      const daysUntilExpiry = Math.ceil(
        (lot.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const user of users) {
        await createNotification(
          user.id,
          "expiring_lot",
          `Upcoming expiration: ${lot.item.name}`,
          `Lot ${lot.lotNumber} of ${lot.item.name} will expire in ${daysUntilExpiry} days (${lot.expirationDate.toDateString()})`,
          {
            itemId: lot.itemId,
            itemName: lot.item.name,
            lotNumber: lot.lotNumber,
            daysUntilExpiry,
            expirationDate: lot.expirationDate.toISOString(),
            quantityOnHand: lot.quantityOnHand.toNumber?.(),
          }
        );
      }

      result.alertsGenerated++;
    }
  } catch (error) {
    const errorMsg = `checkExpiringLots failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Check for refills due and create notifications
 */
export async function checkRefillsDue(): Promise<AutomationResult> {
  const result: AutomationResult = {
    checkName: "checkRefillsDue",
    alertsGenerated: 0,
    itemsProcessed: 0,
    errors: [],
  };

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find prescriptions with refills remaining where fill is approaching
    const prescriptions = await prisma.prescription.findMany({
      where: {
        refillsRemaining: { gt: 0 },
        isActive: true,
      },
      include: {
        patient: true,
        fills: {
          orderBy: { filledAt: "desc" },
          take: 1,
        },
      },
    });

    result.itemsProcessed = prescriptions.length;

    for (const rx of prescriptions) {
      try {
        const lastFill = rx.fills[0];
        if (!lastFill || !lastFill.filledAt || !rx.daysSupply) continue;

        // Calculate when refill is due
        const refillDueDate = new Date(lastFill.filledAt.getTime() + rx.daysSupply * 24 * 60 * 60 * 1000);

        if (refillDueDate <= sevenDaysFromNow && refillDueDate >= now) {
          // Find the patient's primary contact or associated pharmacy user
          const pharmacyUsers = await prisma.user.findMany({
            where: {
              roles: {
                some: {
                  role: {
                    name: {
                      in: ["admin", "pharmacist"],
                    },
                  },
                },
              },
              isActive: true,
            },
            take: 5, // Notify up to 5 staff members
          });

          const daysUntilDue = Math.ceil(
            (refillDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          for (const user of pharmacyUsers) {
            await createNotification(
              user.id,
              "refill_due",
              `Refill Due: ${rx.patient.firstName} ${rx.patient.lastName} - Rx #${rx.rxNumber}`,
              `Patient refill will be due in ${daysUntilDue} days. Refills remaining: ${rx.refillsRemaining}`,
              {
                prescriptionId: rx.id,
                rxNumber: rx.rxNumber,
                patientId: rx.patientId,
                patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
                daysUntilDue,
                refillsRemaining: rx.refillsRemaining,
              }
            );
          }

          result.alertsGenerated++;
        }
      } catch (error) {
        const errorMsg = `Error processing prescription ${rx.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `checkRefillsDue failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Check for rejected claims and create notifications
 */
export async function checkRejectedClaims(): Promise<AutomationResult> {
  const result: AutomationResult = {
    checkName: "checkRejectedClaims",
    alertsGenerated: 0,
    itemsProcessed: 0,
    errors: [],
  };

  try {
    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

    const rejectedClaims = await prisma.claim.findMany({
      where: {
        status: "rejected",
        createdAt: { gte: oneDayAgo },
      },
      include: {
        fills: {
          include: {
            prescription: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    result.itemsProcessed = rejectedClaims.length;

    for (const claim of rejectedClaims) {
      try {
        const fill = claim.fills[0];
        if (!fill?.prescription) continue;

        const rejectionCodes = claim.rejectionCodes as string[] | null;
        const rejectionMessages = claim.rejectionMessages as Record<string, string> | null;
        const codeDisplay = rejectionCodes?.[0] || "Unknown";
        const messageDisplay = rejectionMessages?.[codeDisplay] || "No message available";

        // Notify pharmacy staff
        const pharmacyUsers = await prisma.user.findMany({
          where: {
            roles: {
              some: {
                role: {
                  name: {
                    in: ["admin", "pharmacist", "billing_specialist"],
                  },
                },
              },
            },
            isActive: true,
          },
          take: 5,
        });

        for (const user of pharmacyUsers) {
          await createNotification(
            user.id,
            "claim_rejected",
            `Claim Rejected: ${fill.prescription.patient.firstName} ${fill.prescription.patient.lastName}`,
            `Claim #${claim.claimNumber || "N/A"} for Rx #${fill.prescription.rxNumber} was rejected. Code: ${codeDisplay}. ${messageDisplay}`,
            {
              claimNumber: claim.claimNumber || undefined,
              claimId: claim.id,
              patientId: fill.prescription.patientId,
              patientName: `${fill.prescription.patient.firstName} ${fill.prescription.patient.lastName}`,
              rxNumber: fill.prescription.rxNumber,
              rejectionCode: codeDisplay,
              rejectionMessage: messageDisplay,
            }
          );
        }

        result.alertsGenerated++;
      } catch (error) {
        const errorMsg = `Error processing claim ${claim.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `checkRejectedClaims failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Run multiple automation checks
 */
export async function runAutomationChecks(
  checksToRun?: Array<"low_stock" | "expiring_lots" | "refills_due" | "rejected_claims" | "batch_expiring">
) {
  const allChecks = [
    { name: "low_stock" as const, fn: checkLowStock },
    { name: "expiring_lots" as const, fn: checkExpiringLots },
    { name: "refills_due" as const, fn: checkRefillsDue },
    { name: "rejected_claims" as const, fn: checkRejectedClaims },
  ];

  const results: AutomationResult[] = [];
  const checksToExecute = checksToRun
    ? allChecks.filter((check) => checksToRun.includes(check.name))
    : allChecks;

  for (const check of checksToExecute) {
    const result = await check.fn();
    results.push(result);
  }

  return results;
}
