/**
 * POST /api/messaging/refill-reminders
 * Scan for prescriptions due for refill and send reminder notifications
 * Called by cron job / Vercel cron
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyBatch } from "@/lib/messaging/dispatcher";

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret if configured (simple auth for Vercel cron)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Find prescriptions due for refill
    // Criteria:
    // - refillsRemaining > 0
    // - Not expired
    // - Last fill was > (daysSupply - 3) days ago
    // - Status is "filled" or "dispensed"

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const now = new Date();

    // Get all fills to identify which prescriptions to refill
    const prescriptionsToNotify = await prisma.prescription.findMany({
      where: {
        refillsRemaining: { gt: 0 },
        expirationDate: { gt: now },
        isActive: true,
        status: { in: ["filled", "dispensed"] },
      },
      include: {
        patient: {
          include: {
            phoneNumbers: {
              where: { isPrimary: true },
            },
          },
        },
        fills: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const patientIdsToNotify: string[] = [];
    const prescriptionDetails: Record<
      string,
      { rxNumber: string; drugName: string }
    > = {};

    for (const rx of prescriptionsToNotify) {
      const lastFill = rx.fills[0];

      if (!lastFill || !rx.daysSupply) {
        continue;
      }

      // Check if enough days have passed since last fill
      const daysSinceLastFill = Math.floor(
        (now.getTime() - lastFill.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      );
      const daysUntilRunsOut = rx.daysSupply - 3;

      if (daysSinceLastFill >= daysUntilRunsOut) {
        patientIdsToNotify.push(rx.patientId);
        prescriptionDetails[rx.patientId] = {
          rxNumber: rx.rxNumber,
          drugName: "", // We'll look this up from the item if needed
        };
      }
    }

    if (patientIdsToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No prescriptions due for refill",
        count: 0,
      });
    }

    // Send refill reminder notifications
    const result = await notifyBatch(
      patientIdsToNotify,
      "refillDue",
      {
        refillsRemaining: 0, // Will be updated per patient in the dispatcher if needed
      },
      {
        channels: ["email", "sms"],
      }
    );

    return NextResponse.json({
      success: true,
      message: "Refill reminders sent",
      count: result.successful,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error("Error processing refill reminders:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process refill reminders" },
      { status: 500 }
    );
  }
}
