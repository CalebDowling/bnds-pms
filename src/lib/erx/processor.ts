import { Prisma } from "@prisma/client";
import { parseIncomingMessage, validateParsedRx } from "./parser";
import { matchAll, type MatchResult } from "./matcher";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { logCreate } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

/**
 * Process an incoming e-prescription message
 * Parses, validates, matches patient/prescriber/drug, and creates intake queue item
 */
export async function processIncomingErx(
  payload: unknown,
  source: string,
  format: "xml" | "json" | "auto" = "auto"
): Promise<{
  intakeId: string;
  status: string;
  matchResult: MatchResult;
}> {
  try {
    // Parse the incoming message
    const parsed = parseIncomingMessage(payload, format);

    // Validate parsed data
    const validation = validateParsedRx(parsed);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Run matching for patient, prescriber, and drug
    const matchResult = await matchAll(parsed);

    // Determine status based on match confidence
    const allExact =
      matchResult.patient.confidence === "exact" &&
      matchResult.prescriber.confidence === "exact" &&
      matchResult.drug.confidence === "exact";
    const status = allExact ? "matched" : "pending";

    // Determine priority (stat for controlled substances)
    const priority = parsed.medication.deaSchedule ? "stat" : "normal";

    // Get current user for audit trail (may be null for API-key-only requests)
    const user = await getCurrentUser();

    // Store parsed data + match results in rawData for the detail page
    // Use JSON round-trip to ensure Prisma-compatible InputJsonValue (no `unknown` types)
    const rawDataPayload = JSON.parse(JSON.stringify({
      _original: payload,
      _parsed: parsed,
      _matchResult: {
        patient: matchResult.patient,
        prescriber: matchResult.prescriber,
        drug: matchResult.drug,
      },
    }));

    // Create intake queue item
    const intakeItem = await prisma.intakeQueueItem.create({
      data: {
        source,
        messageId: parsed.messageId || undefined,
        rawData: rawDataPayload,
        patientId: matchResult.patient.patientId || undefined,
        prescriberId: matchResult.prescriber.prescriberId || undefined,
        status,
        patientName: `${parsed.patient.firstName} ${parsed.patient.lastName}`.trim(),
        prescriberName: `${parsed.prescriber.firstName} ${parsed.prescriber.lastName}`.trim(),
        drugName: parsed.medication.drugName,
        priority,
        createdBy: user?.id || undefined,
      },
    });

    // Audit log (non-blocking)
    if (user) {
      logCreate(user.id, "intake_queue", intakeItem.id, {
        source,
        messageId: parsed.messageId,
        patientName: intakeItem.patientName,
        prescriberName: intakeItem.prescriberName,
        drugName: intakeItem.drugName,
        status,
        priority,
      }).catch(() => {});
    }

    // Create notifications for pharmacy staff
    const pharmacyUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { isPharmacist: true },
          { roles: { some: { role: { name: { in: ["admin", "pharmacist", "technician"] } } } } },
        ],
      },
      select: { id: true },
      take: 10,
    });

    for (const pharmacyUser of pharmacyUsers) {
      createNotification(
        pharmacyUser.id,
        "new_erx",
        `New e-Prescription: ${intakeItem.drugName}`,
        `From: ${intakeItem.prescriberName} | Patient: ${intakeItem.patientName}`,
        {
          prescriptionId: intakeItem.id,
          patientName: intakeItem.patientName || undefined,
        }
      ).catch(() => {});
    }

    // Auto-convert to prescription if all matches are exact
    let prescriptionId: string | null = null;
    if (allExact) {
      try {
        prescriptionId = await convertToPrescription(intakeItem.id);
      } catch (err) {
        console.error("Failed to auto-convert to prescription:", getErrorMessage(err));
        // Non-blocking — intake item remains in queue for manual review
      }
    }

    return {
      intakeId: intakeItem.id,
      status: prescriptionId ? "complete" : status,
      matchResult,
    };
  } catch (error) {
    throw new Error(`Failed to process incoming eRx: ${getErrorMessage(error)}`);
  }
}

/**
 * Convert an intake queue item to a prescription
 * Generates RX number, creates prescription, updates intake item status
 */
export async function convertToPrescription(
  intakeId: string,
  overrides?: {
    patientId?: string;
    prescriberId?: string;
    itemId?: string;
    formulaId?: string;
  }
): Promise<string> {
  try {
    // Load the intake queue item
    const intakeItem = await prisma.intakeQueueItem.findUnique({
      where: { id: intakeId },
    });

    if (!intakeItem) {
      throw new Error(`Intake item not found: ${intakeId}`);
    }

    if (!intakeItem.rawData) {
      throw new Error(`No raw data available for intake: ${intakeId}`);
    }

    // rawData is Prisma Json — already a JS object, extract the original payload
    const rawData = intakeItem.rawData as Record<string, unknown>;
    const originalPayload = rawData._original ?? rawData;
    const parsed = parseIncomingMessage(originalPayload, "auto");

    // Use overrides → intake matched IDs → fail
    const patientId = overrides?.patientId || intakeItem.patientId;
    const prescriberId = overrides?.prescriberId || intakeItem.prescriberId;

    if (!patientId || !prescriberId) {
      throw new Error("Patient and prescriber IDs are required to create a prescription");
    }

    // Generate sequential RX number
    const lastRx = await prisma.prescription.findFirst({
      orderBy: { rxNumber: "desc" },
      select: { rxNumber: true },
    });

    let nextNumber = 100001;
    if (lastRx?.rxNumber) {
      const num = parseInt(lastRx.rxNumber, 10);
      if (!isNaN(num)) nextNumber = num + 1;
    }
    const rxNumber = nextNumber.toString();

    // Determine item vs formula
    const itemId = overrides?.itemId || null;
    const formulaId = overrides?.formulaId || null;

    // ── DAW-code resolution ─────────────────────────────────────────
    // NCPDP SCRIPT treats absent DAWCode as "0" — "no product selection
    // indicated by prescriber" (i.e. generic substitution allowed). We
    // apply that default here so the structured Prescription.dawCode
    // column matches what the RxDocumentView eRx panel renders from
    // metadata.erxSource.medication.dawCode. Without the default the
    // panel shows "0" (default) while the column shows null → "—",
    // and the two views drift visibly on the detail page.
    const resolvedDawCode = parsed.medication.dawCode ?? "0";

    // ── eRx source-channel metadata ──────────────────────────────────
    // RxDocumentView reads metadata.erxSource off the Prescription to
    // render the patient/prescriber/medication summary. ParsedNewRx is
    // shape-compatible with ErxSourcePayload, so we stash the whole
    // parsed object verbatim — the renderer is the single consumer of
    // the format and tolerates extra fields. We also pin dawCode to
    // the resolved value so the panel and the column stay in sync.
    const erxSourcePayload = {
      ...parsed,
      medication: { ...parsed.medication, dawCode: resolvedDawCode },
    };
    const prescriptionMetadata: Prisma.InputJsonValue = {
      erxSource: JSON.parse(JSON.stringify(erxSourcePayload)),
    };

    // Create prescription + initial Fill in a transaction. The Fill at
    // status="intake" surfaces the Rx in the Workflow Queue's Intake stage
    // (DRX parity). IntakeQueueItem stays as the SureScripts staging buffer
    // but is no longer the user-facing intake surface.
    const [prescription] = await prisma.$transaction([
      prisma.prescription.create({
        data: {
          rxNumber,
          patientId,
          prescriberId,
          status: "intake",
          source: intakeItem.source,
          priority: intakeItem.priority || "normal",
          itemId,
          formulaId,
          isCompound: parsed.medication.isCompound,
          quantityPrescribed: parsed.medication.quantity || null,
          daysSupply: parsed.medication.daysSupply || null,
          directions: parsed.medication.directions || null,
          dawCode: resolvedDawCode,
          refillsAuthorized: parsed.medication.refillsAuthorized || 0,
          refillsRemaining: parsed.medication.refillsAuthorized || 0,
          dateWritten: new Date(parsed.dateWritten),
          expirationDate: parsed.effectiveDate ? new Date(parsed.effectiveDate) : null,
          prescriberNotes: parsed.prescriberNotes || null,
          internalNotes: intakeItem.notes || null,
          metadata: prescriptionMetadata,
          fills: {
            create: {
              fillNumber: 0,
              status: "intake",
              quantity: parsed.medication.quantity || 0,
              daysSupply: parsed.medication.daysSupply || null,
              itemId: itemId,
            },
          },
        },
      }),
      prisma.intakeQueueItem.update({
        where: { id: intakeId },
        data: {
          status: "complete",
          processedAt: new Date(),
        },
      }),
    ]);

    // Create status log entry (uses correct field names: fromStatus, toStatus, changedBy, notes)
    const user = await getCurrentUser();
    await prisma.prescriptionStatusLog.create({
      data: {
        prescriptionId: prescription.id,
        fromStatus: null,
        toStatus: "intake",
        changedBy: user?.id || intakeItem.createdBy || patientId, // fallback chain
        notes: `Auto-converted from eRx intake: ${intakeItem.messageId || intakeId}`,
      },
    });

    // Link prescription back to intake item
    await prisma.intakeQueueItem.update({
      where: { id: intakeId },
      data: { prescriptionId: prescription.id },
    });

    // Audit log (non-blocking)
    if (user) {
      logCreate(user.id, "prescription", prescription.id, {
        rxNumber,
        patientId,
        prescriberId,
        source: intakeItem.source,
        fromIntake: intakeId,
      }).catch(() => {});
    }

    return prescription.id;
  } catch (error) {
    throw new Error(`Failed to convert intake to prescription: ${getErrorMessage(error)}`);
  }
}

export type { MatchResult };
