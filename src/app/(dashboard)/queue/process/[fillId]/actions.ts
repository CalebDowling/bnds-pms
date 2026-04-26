"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { advanceFillStatus, canTransition, getNextStatuses, getHappyPathNext } from "@/lib/workflow/fill-status";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────

export interface FillDetail {
  id: string;
  fillNumber: number;
  status: string;
  quantity: number;
  daysSupply: number | null;
  ndc: string | null;
  binLocation: string | null;
  copayAmount: number | null;
  totalPrice: number | null;
  filledAt: string | null;
  verifiedAt: string | null;
  dispensedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;

  // Related
  prescription: {
    id: string;
    rxNumber: string;
    status: string;
    sig: string | null;
    refillsRemaining: number;
    dateWritten: string | null;
    expirationDate: string | null;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    allergies: { allergen: string; severity: string | null }[];
    phoneNumbers: { number: string; type: string | null }[];
    insurance: { planName: string | null; memberId: string | null; isActive: boolean }[];
  };
  prescriber: {
    firstName: string;
    lastName: string;
    npi: string | null;
    phone: string | null;
  } | null;
  item: {
    id: string;
    name: string;
    genericName: string | null;
    ndc: string | null;
    strength: string | null;
    dosageForm: string | null;
    deaSchedule: number | null;
    isControlled: boolean;
  } | null;
  filler: { firstName: string; lastName: string } | null;
  verifier: { firstName: string; lastName: string } | null;

  // Events (audit trail)
  events: {
    eventType: string;
    fromValue: string | null;
    toValue: string | null;
    performedBy: string;
    performerName: string;
    notes: string | null;
    createdAt: string;
  }[];

  // Workflow info
  nextStatuses: string[];
  happyPathNext: string | null;
}

// ─── Fetch Fill Detail ────────────────────────────────────────────

export async function getFillDetail(fillId: string): Promise<FillDetail | null> {
  const fill: any = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: {
            include: {
              allergies: {
                where: { status: "active" },
                select: { allergen: true, severity: true },
              },
              phoneNumbers: {
                select: { number: true, phoneType: true },
                orderBy: { isPrimary: "desc" },
              },
              insurance: {
                where: { isActive: true },
                include: { thirdPartyPlan: { select: { planName: true } } },
                orderBy: { priority: "asc" },
              },
            },
          },
          prescriber: {
            select: { firstName: true, lastName: true, npi: true, phone: true },
          },
          item: {
            select: {
              id: true, name: true, genericName: true, ndc: true,
              strength: true, dosageForm: true, deaSchedule: true, isControlled: true,
            },
          },
        },
      },
      item: {
        select: {
          id: true, name: true, genericName: true, ndc: true,
          strength: true, dosageForm: true, deaSchedule: true, isControlled: true,
        },
      },
      filler: { select: { firstName: true, lastName: true } },
      verifier: { select: { firstName: true, lastName: true } },
      events: {
        include: { performer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!fill) return null;

  const rx = fill.prescription;
  const patient = rx.patient;

  return {
    id: fill.id,
    fillNumber: fill.fillNumber,
    status: fill.status,
    quantity: Number(fill.quantity),
    daysSupply: fill.daysSupply,
    ndc: fill.ndc,
    binLocation: fill.binLocation,
    copayAmount: fill.copayAmount ? Number(fill.copayAmount) : null,
    totalPrice: fill.totalPrice ? Number(fill.totalPrice) : null,
    filledAt: fill.filledAt?.toISOString() || null,
    verifiedAt: fill.verifiedAt?.toISOString() || null,
    dispensedAt: fill.dispensedAt?.toISOString() || null,
    createdAt: fill.createdAt.toISOString(),
    metadata: (fill.metadata as Record<string, unknown>) || {},

    prescription: {
      id: rx.id,
      rxNumber: rx.rxNumber || "—",
      status: rx.status,
      sig: rx.sig,
      refillsRemaining: rx.refillsRemaining,
      dateWritten: rx.dateWritten?.toISOString() || null,
      expirationDate: rx.expirationDate?.toISOString() || null,
    },
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth?.toISOString() || null,
      allergies: patient.allergies.map((a: any) => ({ allergen: a.allergen, severity: a.severity })),
      phoneNumbers: patient.phoneNumbers.map((p: any) => ({ number: p.number, type: p.phoneType })),
      insurance: patient.insurance.map((i: any) => ({
        planName: i.thirdPartyPlan?.planName || null,
        memberId: i.memberId || null,
        isActive: i.isActive,
      })),
    },
    prescriber: rx.prescriber ? {
      firstName: rx.prescriber.firstName,
      lastName: rx.prescriber.lastName,
      npi: rx.prescriber.npi,
      phone: rx.prescriber.phone,
    } : null,
    item: fill.item || rx.item || null,
    filler: fill.filler,
    verifier: fill.verifier,

    events: fill.events.map((e: any) => ({
      eventType: e.eventType,
      fromValue: e.fromValue,
      toValue: e.toValue,
      performedBy: e.performedBy,
      performerName: `${e.performer.firstName} ${e.performer.lastName}`.trim(),
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    })),

    nextStatuses: getNextStatuses(fill.status),
    happyPathNext: getHappyPathNext(fill.status),
  };
}

// ─── Process Fill (advance status) ────────────────────────────────

export async function processFill(
  fillId: string,
  newStatus: string,
  notes?: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const result = await advanceFillStatus(fillId, newStatus, user.id, notes);

  if (!result.success) {
    throw new Error(result.error || "Failed to advance fill");
  }

  revalidatePath("/queue");
  revalidatePath(`/queue/process/${fillId}`);

  return result.fill;
}

// ─── Update Fill Financials / Bin Location ────────────────────────

export interface FillFinancialsInput {
  binLocation?: string | null;
  copayAmount?: number | null;
  totalPrice?: number | null;
  /**
   * Convenience field — when set we update the dispense quantity. Useful for
   * the Process page where qty=0 fills currently can't advance because of the
   * quantity guard in advanceFillStatus().
   */
  quantity?: number | null;
}

/**
 * Update fill-level financial / fulfillment metadata. Wired into the Process
 * page so a tech can capture bin location at Waiting Bin, and copay / total
 * price at the Sold step.
 *
 * Each change is recorded as a FillEvent so we have an audit trail for the
 * pharmacist (who set what bin, what copay was charged, etc.).
 */
export async function setFillFinancials(
  fillId: string,
  input: FillFinancialsInput,
  notes?: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const updates: Record<string, unknown> = {};
  const changeSummary: string[] = [];

  if (input.binLocation !== undefined) {
    updates.binLocation = input.binLocation;
    changeSummary.push(`bin=${input.binLocation || "(cleared)"}`);
  }
  if (input.copayAmount !== undefined) {
    updates.copayAmount = input.copayAmount;
    changeSummary.push(`copay=${input.copayAmount ?? "(cleared)"}`);
  }
  if (input.totalPrice !== undefined) {
    updates.totalPrice = input.totalPrice;
    changeSummary.push(`total=${input.totalPrice ?? "(cleared)"}`);
  }
  if (input.quantity !== undefined && input.quantity !== null) {
    updates.quantity = input.quantity;
    changeSummary.push(`qty=${input.quantity}`);
  }

  if (Object.keys(updates).length === 0) {
    return { success: true, message: "No changes" };
  }

  await prisma.$transaction([
    prisma.prescriptionFill.update({
      where: { id: fillId },
      data: updates,
    }),
    prisma.fillEvent.create({
      data: {
        fillId,
        eventType: "metadata_update",
        fromValue: null,
        toValue: changeSummary.join(", "),
        performedBy: user.id,
        notes: notes || null,
      },
    }),
  ]);

  revalidatePath(`/queue/process/${fillId}`);

  return { success: true, message: "Saved" };
}

// ─── Pharmacist Verify Checklist ──────────────────────────────────

/**
 * Items the pharmacist must explicitly attest to before a fill leaves Verify.
 * Stored on the FillEvent.notes column as JSON so we can audit later who
 * checked what; also stamped into PrescriptionFill.metadata so the panel
 * reflects the current state on reload.
 */
export interface VerifyChecklistInput {
  drugCorrect: boolean;
  quantityCorrect: boolean;
  sigCorrect: boolean;
  noInteractions: boolean;
  ndcVerified: boolean;
  pdmpChecked?: boolean; // only required for controlled substances
}

export async function recordVerifyChecklist(
  fillId: string,
  checklist: VerifyChecklistInput
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    select: { metadata: true, item: { select: { isControlled: true, deaSchedule: true } } },
  });

  if (!fill) throw new Error("Fill not found");

  // For controlled substances the PDMP check is required. `deaSchedule` is a
  // VARCHAR in the DB ("II", "III", "II"), not a number — so just treating any
  // non-null schedule as "controlled" is the right call here.
  const isControlled =
    !!fill.item?.isControlled || fill.item?.deaSchedule != null;
  if (isControlled && !checklist.pdmpChecked) {
    throw new Error("PDMP check is required for controlled substances");
  }

  const allChecked =
    checklist.drugCorrect &&
    checklist.quantityCorrect &&
    checklist.sigCorrect &&
    checklist.noInteractions &&
    checklist.ndcVerified &&
    (!isControlled || checklist.pdmpChecked);

  if (!allChecked) {
    throw new Error("All review items must be checked before verification");
  }

  const existingMetadata = (fill.metadata as Record<string, unknown>) || {};

  await prisma.$transaction([
    prisma.prescriptionFill.update({
      where: { id: fillId },
      data: {
        metadata: {
          ...existingMetadata,
          verifyChecklist: {
            ...checklist,
            performedBy: user.id,
            performedAt: new Date().toISOString(),
          },
        },
      },
    }),
    prisma.fillEvent.create({
      data: {
        fillId,
        eventType: "verify_checklist",
        fromValue: null,
        toValue: "all_checked",
        performedBy: user.id,
        notes: JSON.stringify(checklist),
      },
    }),
  ]);

  revalidatePath(`/queue/process/${fillId}`);

  return { success: true };
}

// ─── Verify Barcode Scan ──────────────────────────────────────────

export async function verifyScan(
  fillId: string,
  scannedNdc: string
): Promise<{ match: boolean; expected: string | null; scanned: string; message: string }> {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      item: { select: { ndc: true, name: true } },
      prescription: { include: { item: { select: { ndc: true, name: true } } } },
    },
  });

  if (!fill) {
    return { match: false, expected: null, scanned: scannedNdc, message: "Fill not found" };
  }

  // Expected NDC from the fill's item or the prescription's item
  const expectedNdc = fill.ndc || fill.item?.ndc || fill.prescription?.item?.ndc || null;

  if (!expectedNdc) {
    return { match: false, expected: null, scanned: scannedNdc, message: "No NDC on file for this fill — manual verification required" };
  }

  // Normalize NDCs: strip dashes and leading zeros for comparison
  const normalize = (ndc: string) => ndc.replace(/[-\s]/g, "").replace(/^0+/, "");
  const normalizedExpected = normalize(expectedNdc);
  const normalizedScanned = normalize(scannedNdc);

  const match = normalizedExpected === normalizedScanned;

  return {
    match,
    expected: expectedNdc,
    scanned: scannedNdc,
    message: match
      ? `NDC match confirmed: ${expectedNdc}`
      : `NDC MISMATCH — Expected: ${expectedNdc}, Scanned: ${scannedNdc}`,
  };
}
