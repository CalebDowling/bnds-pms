/**
 * Return to Stock (RTS) Automation Engine
 *
 * Scans the waiting bin for fills that have exceeded the configurable threshold
 * (default 14 days). Generates RTS candidate lists, processes returns by
 * updating fill status, reversing insurance claims, re-incrementing inventory
 * lots, and sending patient SMS notifications via Twilio.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { reverseClaim } from "@/lib/claims/adjudicator";
import { twilioClient } from "@/lib/integrations/twilio";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface RtsCandidate {
  fillId: string;
  prescriptionId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  drug: string;
  ndc: string | null;
  quantity: number;
  daysInBin: number;
  binLocation: string;
  copayAmount: number;
  claimId: string | null;
  insuranceId: string | null;
  itemLotId: string | null;
  dateAdded: string;
}

export interface RtsProcessResult {
  success: boolean;
  fillId: string;
  claimReversed: boolean;
  inventoryRestocked: boolean;
  patientNotified: boolean;
  error?: string;
}

export interface RtsBatchResult {
  total: number;
  succeeded: number;
  failed: number;
  results: RtsProcessResult[];
}

export interface RtsHistoryEntry {
  id: string;
  fillId: string;
  rxNumber: string;
  patientName: string;
  drug: string;
  binLocation: string;
  copayAmount: number;
  claimReversed: boolean;
  processedBy: string;
  processedAt: string;
}

// ═══════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════

const DEFAULT_RTS_THRESHOLD_DAYS = 14;
const RTS_SMS_TEMPLATE = (patientFirst: string, drug: string, pharmacyPhone: string) =>
  `Hi ${patientFirst}, your prescription for ${drug} at Boudreaux's Pharmacy has been returned to stock after being in our waiting bin for over 14 days. Please call us at ${pharmacyPhone} if you would like us to refill it. Thank you!`;

// ═══════════════════════════════════════════════
// RTS CANDIDATES
// ═══════════════════════════════════════════════

/**
 * Scan the waiting bin for fills past the configurable threshold.
 * Returns a list of RTS candidates with patient, drug, days-in-bin, and copay info.
 */
export async function getRtsCandidates(
  daysThreshold: number = DEFAULT_RTS_THRESHOLD_DAYS
): Promise<RtsCandidate[]> {
  // Fetch all fills currently in waiting_bin status that have waitingBin metadata
  const fills = await prisma.prescriptionFill.findMany({
    where: {
      status: "waiting_bin",
      metadata: {
        path: ["waitingBin"],
        not: Prisma.DbNull,
      },
    },
    include: {
      prescription: {
        include: {
          patient: {
            include: {
              phoneNumbers: { where: { isPrimary: true }, take: 1 },
            },
          },
          item: { select: { name: true, genericName: true } },
          formula: { select: { name: true } },
        },
      },
    },
  });

  const now = new Date();
  const candidates: RtsCandidate[] = [];

  for (const fill of fills) {
    const metadata = fill.metadata as Record<string, any>;
    const waitingBin = metadata?.waitingBin;
    if (!waitingBin?.dateAdded) continue;

    const dateAdded = new Date(waitingBin.dateAdded);
    const daysInBin = Math.floor(
      (now.getTime() - dateAdded.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysInBin < daysThreshold) continue;

    const patient = fill.prescription.patient;
    const primaryPhone = patient.phoneNumbers?.[0]?.number || null;
    const drug =
      fill.prescription.item?.name ||
      fill.prescription.item?.genericName ||
      fill.prescription.formula?.name ||
      "Unknown Drug";

    candidates.push({
      fillId: fill.id,
      prescriptionId: fill.prescriptionId,
      rxNumber: fill.prescription.rxNumber,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientPhone: primaryPhone,
      drug,
      ndc: fill.ndc,
      quantity: fill.quantity.toNumber(),
      daysInBin,
      binLocation: waitingBin.location || "N/A",
      copayAmount: fill.copayAmount?.toNumber() || 0,
      claimId: fill.claimId,
      insuranceId: fill.prescription.insuranceId,
      itemLotId: fill.itemLotId,
      dateAdded: waitingBin.dateAdded,
    });
  }

  // Sort by days in bin descending (longest first)
  candidates.sort((a, b) => b.daysInBin - a.daysInBin);

  return candidates;
}

// ═══════════════════════════════════════════════
// PROCESS RTS
// ═══════════════════════════════════════════════

/**
 * Full RTS workflow for a single fill:
 * 1. Update fill status to "returned" (cancelled)
 * 2. Reverse insurance claim if one exists
 * 3. Re-increment inventory lot quantity
 * 4. Clear waiting bin metadata
 * 5. Log fill event + audit trail
 * 6. Send patient SMS notification
 */
export async function processRts(
  fillId: string,
  userId: string
): Promise<RtsProcessResult> {
  const result: RtsProcessResult = {
    success: false,
    fillId,
    claimReversed: false,
    inventoryRestocked: false,
    patientNotified: false,
  };

  try {
    // Load the fill with all needed relations
    const fill = await prisma.prescriptionFill.findUnique({
      where: { id: fillId },
      include: {
        prescription: {
          include: {
            patient: {
              include: {
                phoneNumbers: { where: { isPrimary: true }, take: 1 },
              },
            },
            item: { select: { name: true, genericName: true } },
            formula: { select: { name: true } },
          },
        },
        itemLot: true,
      },
    });

    if (!fill) {
      result.error = "Fill not found";
      return result;
    }

    if (fill.status !== "waiting_bin") {
      result.error = `Fill is not in waiting_bin status (current: ${fill.status})`;
      return result;
    }

    const metadata = fill.metadata as Record<string, any>;
    const waitingBin = metadata?.waitingBin;
    const binLocation = waitingBin?.location || "unknown";

    const patient = fill.prescription.patient;
    const drug =
      fill.prescription.item?.name ||
      fill.prescription.item?.genericName ||
      fill.prescription.formula?.name ||
      "Unknown Drug";

    // ── Step 1: Reverse insurance claim ──
    if (fill.claimId) {
      try {
        await reverseClaim(fill.claimId, "Return to Stock - exceeded waiting bin threshold", userId);
        result.claimReversed = true;
        logger.info(`[RTS] Reversed claim ${fill.claimId} for fill ${fillId}`);
      } catch (claimErr) {
        logger.error(`[RTS] Failed to reverse claim ${fill.claimId}:`, claimErr);
        // Continue processing even if claim reversal fails — log the issue
      }
    }

    // ── Step 2: Re-increment inventory lot ──
    if (fill.itemLotId && fill.quantity) {
      try {
        await prisma.itemLot.update({
          where: { id: fill.itemLotId },
          data: {
            quantityOnHand: {
              increment: fill.quantity,
            },
          },
        });
        result.inventoryRestocked = true;
        logger.info(
          `[RTS] Restocked ${fill.quantity} units to lot ${fill.itemLotId}`
        );
      } catch (invErr) {
        logger.error(`[RTS] Failed to restock inventory for lot ${fill.itemLotId}:`, invErr);
      }
    }

    // ── Step 3: Update fill status + clear waiting bin metadata ──
    const updatedMetadata = {
      ...metadata,
      waitingBin: null,
      rts: {
        processedAt: new Date().toISOString(),
        processedBy: userId,
        previousBinLocation: binLocation,
        claimReversed: result.claimReversed,
        inventoryRestocked: result.inventoryRestocked,
      },
    };

    await prisma.$transaction([
      // Update fill status to cancelled (RTS terminal state)
      prisma.prescriptionFill.update({
        where: { id: fillId },
        data: {
          status: "cancelled",
          metadata: updatedMetadata,
        },
      }),
      // Create fill event for RTS
      prisma.fillEvent.create({
        data: {
          fillId,
          eventType: "return_to_stock",
          fromValue: "waiting_bin",
          toValue: "cancelled",
          performedBy: userId,
          notes: `RTS: Returned to stock from bin ${binLocation}. Claim reversed: ${result.claimReversed}. Inventory restocked: ${result.inventoryRestocked}.`,
        },
      }),
    ]);

    // ── Step 4: Audit log ──
    await logAudit({
      userId,
      action: "UPDATE",
      resource: "prescription_fills",
      resourceId: fillId,
      details: {
        action: "return_to_stock",
        binLocation,
        claimReversed: result.claimReversed,
        inventoryRestocked: result.inventoryRestocked,
        drug,
        patientName: `${patient.firstName} ${patient.lastName}`,
      },
    });

    // ── Step 5: Send patient notification ──
    const primaryPhone = patient.phoneNumbers?.[0]?.number;
    if (primaryPhone) {
      try {
        const pharmacyPhone = process.env.PHARMACY_PHONE || "(337) 233-1234";
        const smsBody = RTS_SMS_TEMPLATE(patient.firstName, drug, pharmacyPhone);
        const smsResult = await twilioClient.sendSMS(primaryPhone, smsBody);

        if (smsResult.success) {
          result.patientNotified = true;
          logger.info(`[RTS] Sent SMS to ${primaryPhone} for fill ${fillId}`);
        } else {
          logger.warn(`[RTS] SMS failed for ${primaryPhone}: ${smsResult.error}`);
        }
      } catch (smsErr) {
        logger.error(`[RTS] SMS error for fill ${fillId}:`, smsErr);
      }
    }

    result.success = true;
    logger.info(
      `[RTS] Processed fill ${fillId} — claim: ${result.claimReversed}, inventory: ${result.inventoryRestocked}, sms: ${result.patientNotified}`
    );

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`[RTS] Failed to process fill ${fillId}:`, error);
    result.error = msg;
    return result;
  }
}

// ═══════════════════════════════════════════════
// BATCH RTS
// ═══════════════════════════════════════════════

/**
 * Process multiple fills for RTS in sequence.
 * Returns aggregate results.
 */
export async function processBatchRts(
  fillIds: string[],
  userId: string
): Promise<RtsBatchResult> {
  const results: RtsProcessResult[] = [];

  for (const fillId of fillIds) {
    const result = await processRts(fillId, userId);
    results.push(result);
  }

  const succeeded = results.filter((r) => r.success).length;

  return {
    total: fillIds.length,
    succeeded,
    failed: fillIds.length - succeeded,
    results,
  };
}

// ═══════════════════════════════════════════════
// RTS HISTORY
// ═══════════════════════════════════════════════

/**
 * Get history of RTS events within a date range.
 * Queries fill events of type "return_to_stock".
 */
export async function getRtsHistory(
  dateRange?: { from: Date; to: Date }
): Promise<RtsHistoryEntry[]> {
  const where: Prisma.FillEventWhereInput = {
    eventType: "return_to_stock",
  };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.from,
      lte: dateRange.to,
    };
  }

  const events = await prisma.fillEvent.findMany({
    where,
    include: {
      fill: {
        include: {
          prescription: {
            include: {
              patient: { select: { firstName: true, lastName: true } },
              item: { select: { name: true, genericName: true } },
              formula: { select: { name: true } },
            },
          },
        },
      },
      performer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return events.map((event) => {
    const fill = event.fill;
    const rx = fill.prescription;
    const rtsMetadata = (fill.metadata as Record<string, any>)?.rts;

    return {
      id: event.id,
      fillId: fill.id,
      rxNumber: rx.rxNumber,
      patientName: rx.patient
        ? `${rx.patient.firstName} ${rx.patient.lastName}`
        : "Unknown",
      drug:
        rx.item?.name ||
        rx.item?.genericName ||
        rx.formula?.name ||
        "Unknown",
      binLocation: rtsMetadata?.previousBinLocation || "N/A",
      copayAmount: fill.copayAmount?.toNumber() || 0,
      claimReversed: rtsMetadata?.claimReversed ?? false,
      processedBy: `${event.performer.firstName} ${event.performer.lastName}`,
      processedAt: event.createdAt.toISOString(),
    };
  });
}
