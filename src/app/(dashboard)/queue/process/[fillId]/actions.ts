"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { advanceFillStatus, canTransition, getNextStatuses, getHappyPathNext } from "@/lib/workflow/fill-status";
import {
  runFullDUR,
  getDurAlertsForFill,
  overrideDurAlert,
  type DURAlert,
} from "@/lib/clinical/dur-engine";
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
    // Phase 1 (RxDocumentView): the source-of-truth fields the doc viewer
    // renders so a pharmacist can verify what the prescriber actually sent
    // us against the structured fill data.
    //   - source: "electronic" | "fax" | "paper" | "phone" | …
    //   - metadata: holds the polymorphic erxSource / faxSource / paperSource
    //     / phoneSource payloads stashed at intake-time (see ParsedNewRx in
    //     src/lib/erx/parser.ts and the seed-test-fixtures script).
    //   - directions / refillsAuthorized / dawCode / daysSupply /
    //     quantityPrescribed mirror the as-prescribed values so we can show
    //     them next to the fill values without joining metadata.
    source: string | null;
    metadata: Record<string, unknown>;
    directions: string | null;
    refillsAuthorized: number;
    dawCode: string | null;
    daysSupply: number | null;
    quantityPrescribed: number | null;
    prescriberNotes: string | null;
  };
  patient: {
    id: string;
    mrn: string | null;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    allergies: { allergen: string; severity: string | null }[];
    phoneNumbers: { number: string; type: string | null }[];
    addresses: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    }[];
    insurance: {
      id: string;
      planName: string | null;
      memberId: string | null;
      priority: string;
      isActive: boolean;
    }[];
  };
  prescriber: {
    firstName: string;
    lastName: string;
    suffix: string | null;
    npi: string | null;
    deaNumber: string | null;
    phone: string | null;
    fax: string | null;
    specialty: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  item: {
    id: string;
    name: string;
    genericName: string | null;
    ndc: string | null;
    strength: string | null;
    dosageForm: string | null;
    route: string | null;
    deaSchedule: number | null;
    isControlled: boolean;
  } | null;
  filler: { firstName: string; lastName: string } | null;
  verifier: { firstName: string; lastName: string } | null;
  /**
   * Who marked this fill Sold and when. R6-#21: surface in the FILL DETAILS
   * card so the cashier / pharmacist can see the dispense audit at a glance
   * without scrolling the activity log.
   *
   * Sourced from FillEvent (status_change → sold) joined to User. Falls back
   * to metadata.soldInfo when the event row is missing (legacy data).
   */
  soldBy: { firstName: string; lastName: string } | null;
  soldAt: string | null;

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

  // Latest claim — surfaced on the Adjudicating panel so the tech can see
  // status / paid amount / rejection codes without bouncing to /billing.
  latestClaim: {
    id: string;
    status: string;
    claimNumber: string | null;
    amountPaid: number | null;
    patientCopay: number | null;
    rejectionCodes: string[];
    rejectionMessages: Record<string, string>;
    submittedAt: string | null;
    adjudicatedAt: string | null;
  } | null;

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
              addresses: {
                select: { line1: true, line2: true, city: true, state: true, zip: true },
                orderBy: { isDefault: "desc" },
              },
              insurance: {
                where: { isActive: true },
                include: { thirdPartyPlan: { select: { planName: true } } },
                orderBy: { priority: "asc" },
              },
            },
          },
          prescriber: {
            select: {
              firstName: true, lastName: true, suffix: true, npi: true, deaNumber: true,
              phone: true, fax: true, specialty: true,
              addressLine1: true, city: true, state: true, zip: true,
            },
          },
          item: {
            select: {
              id: true, name: true, genericName: true, ndc: true,
              strength: true, dosageForm: true, route: true, deaSchedule: true, isControlled: true,
            },
          },
        },
      },
      item: {
        select: {
          id: true, name: true, genericName: true, ndc: true,
          strength: true, dosageForm: true, route: true, deaSchedule: true, isControlled: true,
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

  // Pull the most recent claim attempt for this fill so the Adjudicating
  // panel can render status / rejection codes / paid amount inline without
  // a round-trip to /billing. Excludes reversed claims so re-submissions
  // show the live attempt.
  const latestClaimRow = fill
    ? await prisma.claim.findFirst({
        where: { fillId: fill.id, status: { notIn: ["reversed"] } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          claimNumber: true,
          amountPaid: true,
          patientCopay: true,
          rejectionCodes: true,
          rejectionMessages: true,
          submittedAt: true,
          adjudicatedAt: true,
        },
      })
    : null;

  // R6-#21: For Sold fills, look up the most recent status_change → sold
  // FillEvent so the FILL DETAILS card can render "Sold by / at". The event
  // log is the source of truth; metadata.soldInfo is mirrored at write time
  // but the joined User name lives on the event row.
  const soldEventRow =
    fill && fill.status === "sold"
      ? await prisma.fillEvent.findFirst({
          where: {
            fillId: fill.id,
            eventType: "status_change",
            toValue: "sold",
          },
          orderBy: { createdAt: "desc" },
          include: {
            performer: { select: { firstName: true, lastName: true } },
          },
        })
      : null;

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
      // Phase 1 source viewer — surface the prescription-level fields used
      // by RxDocumentView so the pharmacist can verify what was sent by
      // the prescriber against the structured fill data.
      source: rx.source ?? null,
      metadata: (rx.metadata as Record<string, unknown>) || {},
      directions: rx.directions ?? null,
      refillsAuthorized: rx.refillsAuthorized ?? 0,
      dawCode: rx.dawCode ?? null,
      daysSupply: rx.daysSupply ?? null,
      quantityPrescribed: rx.quantityPrescribed != null
        ? Number(rx.quantityPrescribed)
        : null,
      prescriberNotes: rx.prescriberNotes ?? null,
    },
    patient: {
      id: patient.id,
      mrn: patient.mrn ?? null,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth?.toISOString() || null,
      gender: patient.gender ?? null,
      allergies: patient.allergies.map((a: any) => ({ allergen: a.allergen, severity: a.severity })),
      phoneNumbers: patient.phoneNumbers.map((p: any) => ({ number: p.number, type: p.phoneType })),
      addresses: (patient.addresses || []).map((a: any) => ({
        line1: a.line1 ?? null,
        line2: a.line2 ?? null,
        city: a.city ?? null,
        state: a.state ?? null,
        zip: a.zip ?? null,
      })),
      insurance: patient.insurance.map((i: any) => ({
        id: i.id,
        planName: i.thirdPartyPlan?.planName || null,
        memberId: i.memberId || null,
        priority: i.priority || "primary",
        isActive: i.isActive,
      })),
    },
    prescriber: rx.prescriber ? {
      firstName: rx.prescriber.firstName,
      lastName: rx.prescriber.lastName,
      suffix: rx.prescriber.suffix ?? null,
      npi: rx.prescriber.npi,
      deaNumber: rx.prescriber.deaNumber ?? null,
      phone: rx.prescriber.phone,
      fax: rx.prescriber.fax ?? null,
      specialty: rx.prescriber.specialty ?? null,
      addressLine1: rx.prescriber.addressLine1 ?? null,
      city: rx.prescriber.city ?? null,
      state: rx.prescriber.state ?? null,
      zip: rx.prescriber.zip ?? null,
    } : null,
    item: fill.item || rx.item || null,
    filler: fill.filler,
    verifier: fill.verifier,

    // soldBy/soldAt are populated only when the fill is sold AND we found an
    // associated FillEvent. Fall back to metadata.soldInfo for legacy rows
    // that pre-date the event-payload write — dispensedAt + the free-form
    // metadata is then the only sold record we have.
    soldBy: soldEventRow?.performer
      ? {
          firstName: soldEventRow.performer.firstName,
          lastName: soldEventRow.performer.lastName,
        }
      : null,
    soldAt: (() => {
      if (soldEventRow) return soldEventRow.createdAt.toISOString();
      // Legacy fallback: when the event log is missing, use dispensedAt or
      // the soldInfo payload mirrored on metadata (older fills).
      const meta = (fill.metadata as Record<string, unknown>) || {};
      const soldInfo = meta.soldInfo as { soldAt?: string } | undefined;
      if (soldInfo?.soldAt) return soldInfo.soldAt;
      return fill.dispensedAt?.toISOString() || null;
    })(),

    events: fill.events.map((e: any) => ({
      eventType: e.eventType,
      fromValue: e.fromValue,
      toValue: e.toValue,
      performedBy: e.performedBy,
      performerName: `${e.performer.firstName} ${e.performer.lastName}`.trim(),
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    })),

    latestClaim: latestClaimRow
      ? {
          id: latestClaimRow.id,
          status: latestClaimRow.status,
          claimNumber: latestClaimRow.claimNumber,
          amountPaid: latestClaimRow.amountPaid
            ? Number(latestClaimRow.amountPaid)
            : null,
          patientCopay: latestClaimRow.patientCopay
            ? Number(latestClaimRow.patientCopay)
            : null,
          rejectionCodes: Array.isArray(latestClaimRow.rejectionCodes)
            ? (latestClaimRow.rejectionCodes as string[])
            : [],
          rejectionMessages:
            latestClaimRow.rejectionMessages &&
            typeof latestClaimRow.rejectionMessages === "object"
              ? (latestClaimRow.rejectionMessages as Record<string, string>)
              : {},
          submittedAt: latestClaimRow.submittedAt?.toISOString() || null,
          adjudicatedAt: latestClaimRow.adjudicatedAt?.toISOString() || null,
        }
      : null,

    nextStatuses: getNextStatuses(fill.status),
    happyPathNext: getHappyPathNext(fill.status),
  };
}

// ─── Process Fill (advance status) ────────────────────────────────

/**
 * Result envelope returned by the {@link processFill} server action.
 *
 * We intentionally return `{ success, error }` instead of throwing so the
 * Next.js production runtime doesn't strip the message to the generic
 * "An error occurred in the Server Components render" — which hides the
 * actionable detail (e.g. "Pickup checklist incomplete — Counseling not
 * offered, Signature missing") that the workflow guard computes for
 * the user.
 *
 * The client reads `result.success` and renders `result.error` directly
 * in the soldGateError / inline error banners.
 */
export interface ProcessFillResult {
  success: boolean;
  fill?: { id: string; status: string };
  error?: string;
}

export async function processFill(
  fillId: string,
  newStatus: string,
  notes?: string,
  options?: { override?: boolean; overrideReason?: string }
): Promise<ProcessFillResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await advanceFillStatus(
    fillId,
    newStatus,
    user.id,
    notes,
    options
  );

  if (!result.success) {
    // Pass the workflow-layer message through verbatim so the client can
    // render "Pickup checklist incomplete — Counseling not offered,
    // Signature missing" instead of a sanitized server-component error.
    return { success: false, error: result.error || "Failed to advance fill" };
  }

  // Invalidate every surface that shows live fill counts. The Process page
  // uses 'layout' to bust its parent dynamic segments too, otherwise the
  // back-link to /queue can render stale counts.
  revalidatePath("/dashboard");
  revalidatePath("/queue");
  revalidatePath(`/queue/process/${fillId}`, "layout");

  return { success: true, fill: result.fill };
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

/**
 * Result envelope for the verify-checklist save. Mirrors {@link ProcessFillResult}
 * — we return `{ success, error }` instead of throwing because Next.js production
 * sanitizes server-action throws to the generic "Server Components render" error,
 * which hides the actionable validation message ("PDMP check is required for
 * controlled substances", etc.) from the pharmacist.
 */
export interface RecordChecklistResult {
  success: boolean;
  error?: string;
}

export async function recordVerifyChecklist(
  fillId: string,
  checklist: VerifyChecklistInput
): Promise<RecordChecklistResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    select: { metadata: true, item: { select: { isControlled: true, deaSchedule: true } } },
  });

  if (!fill) return { success: false, error: "Fill not found" };

  // For controlled substances the PDMP check is required. `deaSchedule` is a
  // VARCHAR in the DB ("II", "III", "II"), not a number — so just treating any
  // non-null schedule as "controlled" is the right call here.
  const isControlled =
    !!fill.item?.isControlled || fill.item?.deaSchedule != null;
  if (isControlled && !checklist.pdmpChecked) {
    return {
      success: false,
      error: "PDMP check is required for controlled substances",
    };
  }

  const allChecked =
    checklist.drugCorrect &&
    checklist.quantityCorrect &&
    checklist.sigCorrect &&
    checklist.noInteractions &&
    checklist.ndcVerified &&
    (!isControlled || checklist.pdmpChecked);

  if (!allChecked) {
    return {
      success: false,
      error: "All review items must be checked before verification",
    };
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

/**
 * Persist a partial / in-progress verify checklist without recording an
 * "all_checked" attestation. Used by the per-toggle save on the Process page
 * so the pharmacist can step away and come back without losing state, and
 * so the UI can show a "Last saved at HH:MM" indicator.
 *
 * Deliberately does NOT append a FillEvent — drafts shouldn't pollute the
 * audit trail. The immutable attestation event is still written by
 * recordVerifyChecklist() at advance time.
 */
export async function saveVerifyChecklistDraft(
  fillId: string,
  checklist: Partial<VerifyChecklistInput>
): Promise<{ success: boolean; savedAt: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    select: { metadata: true },
  });
  if (!fill) throw new Error("Fill not found");

  const existingMetadata = (fill.metadata as Record<string, unknown>) || {};
  const savedAt = new Date().toISOString();

  await prisma.prescriptionFill.update({
    where: { id: fillId },
    data: {
      metadata: {
        ...existingMetadata,
        verifyChecklist: {
          ...((existingMetadata.verifyChecklist as Record<string, unknown>) || {}),
          ...checklist,
          performedBy: user.id,
          performedAt: savedAt,
          draft: true,
        },
      },
    },
  });

  return { success: true, savedAt };
}

// ─── Pickup Checklist (Waiting Bin → Sold) ────────────────────────

/**
 * Items that must be attested to before a fill is dispensed (waiting_bin → sold).
 * These are the regulated handoff steps a real pharmacy performs at the
 * register: counseling offer (OBRA-90), HIPAA acknowledgement / signature,
 * payment received. We persist the attestation on the fill's metadata and
 * mirror it to a FillEvent for the audit log.
 *
 * SMS notify is tracked separately because it can run before the patient
 * even arrives — see notifyPatientReady().
 */
export interface PickupChecklistInput {
  /** Pharmacist offered counseling per OBRA-90. Required regardless of accept/decline. */
  counselOffered: boolean;
  /** Patient accepted counseling (true) or declined (false). */
  counselAccepted: boolean;
  /** Patient signed for the prescription / HIPAA ack. */
  signatureCaptured: boolean;
  /** Payment was collected (copay, cash, account, etc.). */
  paymentReceived: boolean;
  /**
   * Government-issued ID was checked. Required for controlled substances
   * (DEA Schedule II–V). Tracked here so the waiting_bin → sold gate can
   * verify it; non-controlled fills can leave this false.
   */
  idVerified?: boolean;
  /** Free-text note for declined counseling, signature on file, etc. */
  pickupNotes?: string;
}

/**
 * Persist the pickup checklist as fill metadata + a FillEvent audit row.
 *
 * Returns {@link RecordChecklistResult} — `{ success, error }` envelope. We
 * intentionally don't throw for validation failures because Next.js production
 * sanitizes server-action throws to the generic "Server Components render"
 * error, hiding the actionable message ("Counseling must be offered before
 * dispense (OBRA-90).") from the pharmacist. The caller (Process page) reads
 * `result.error` and surfaces it in the soldGateError banner.
 *
 * Validation here is a UI-friendly gate; the workflow guard
 * (advanceFillStatus → "Pickup checklist incomplete — Counseling not offered,
 * Signature missing") is the authoritative gate at the transition layer and
 * also returns the same envelope shape.
 */
export async function recordPickupChecklist(
  fillId: string,
  checklist: PickupChecklistInput
): Promise<RecordChecklistResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    select: {
      metadata: true,
      status: true,
      item: { select: { isControlled: true, deaSchedule: true } },
      prescription: {
        select: { item: { select: { isControlled: true, deaSchedule: true } } },
      },
    },
  });

  if (!fill) return { success: false, error: "Fill not found" };
  if (fill.status !== "waiting_bin") {
    return {
      success: false,
      error: `Cannot record pickup checklist for a fill in "${fill.status}" — must be in Waiting Bin first.`,
    };
  }

  // Aggregate missing items into a single readable banner — same shape as the
  // workflow guard's "Pickup checklist incomplete — Counseling not offered,
  // Signature missing, Payment not collected." so the regex in
  // surfaceWorkflowError() routes the message into the sold-gate banner with
  // an override path instead of the generic error toast.
  const missing: string[] = [];
  if (!checklist.counselOffered) missing.push("Counseling not offered");
  if (!checklist.signatureCaptured) missing.push("Signature missing");
  if (!checklist.paymentReceived) missing.push("Payment not collected");

  // Controlled-substance ID gate (R6-#20). DEA Schedule II–V drugs require
  // a government-issued ID check at the register before dispense. Fall back
  // to the parent Rx's item when the fill itself doesn't override the drug.
  const drug = fill.item ?? fill.prescription?.item ?? null;
  const schedule = drug?.deaSchedule?.toUpperCase().trim() ?? null;
  const isControlled =
    !!drug?.isControlled ||
    (schedule != null &&
      (schedule.startsWith("C") ||
        ["II", "III", "IV", "V"].includes(schedule)));
  if (isControlled && !checklist.idVerified) {
    missing.push("ID not verified (controlled substance)");
  }

  if (missing.length > 0) {
    return {
      success: false,
      error: `Pickup checklist incomplete — ${missing.join(", ")}.`,
    };
  }

  const existingMetadata = (fill.metadata as Record<string, unknown>) || {};

  await prisma.$transaction([
    prisma.prescriptionFill.update({
      where: { id: fillId },
      data: {
        metadata: {
          ...existingMetadata,
          pickupChecklist: {
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
        eventType: "pickup_checklist",
        fromValue: null,
        toValue: "all_checked",
        performedBy: user.id,
        notes: JSON.stringify({
          counselOffered: checklist.counselOffered,
          counselAccepted: checklist.counselAccepted,
          signatureCaptured: checklist.signatureCaptured,
          paymentReceived: checklist.paymentReceived,
          idVerified: !!checklist.idVerified,
          pickupNotes: checklist.pickupNotes || null,
        }),
      },
    }),
  ]);

  revalidatePath(`/queue/process/${fillId}`);

  return { success: true };
}

// ─── Notify Patient (SMS pickup-ready) ────────────────────────────

/**
 * Sends a pickup-ready SMS to the patient's primary phone and stamps the
 * notification on the fill metadata so the panel can show "notified" state.
 *
 * Idempotent — calling again resends and updates the timestamp; useful when
 * the patient hasn't arrived in a few hours and the cashier wants to nudge.
 */
export async function notifyPatientReady(fillId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        select: {
          rxNumber: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumbers: {
                where: { isPrimary: true },
                select: { number: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!fill) throw new Error("Fill not found");

  const phone = fill.prescription?.patient?.phoneNumbers?.[0]?.number;
  if (!phone) {
    throw new Error("No primary phone on file for this patient.");
  }

  // Use the SMS helper directly so we don't have to make an internal HTTP
  // round-trip (server-action → API route → server-action would just stack
  // serialization layers).
  const { sendSMS } = await import("@/lib/messaging/sms");
  const rxNumber = fill.prescription?.rxNumber || "";
  const message = `Boudreaux's Pharmacy: Your prescription${rxNumber ? ` (Rx #${rxNumber})` : ""} is ready for pickup. Please visit us at your convenience. Reply STOP to opt out.`;

  const result = await sendSMS(phone, message);
  if (!result.success) {
    throw new Error(result.error || "Failed to send SMS");
  }

  const existingMetadata = (fill.metadata as Record<string, unknown>) || {};

  await prisma.$transaction([
    prisma.prescriptionFill.update({
      where: { id: fillId },
      data: {
        metadata: {
          ...existingMetadata,
          pickupNotification: {
            sentBy: user.id,
            sentAt: new Date().toISOString(),
            phone,
            messageId: result.messageId || null,
          },
        },
      },
    }),
    prisma.fillEvent.create({
      data: {
        fillId,
        eventType: "patient_notified",
        fromValue: null,
        toValue: phone,
        performedBy: user.id,
        notes: `Pickup-ready SMS sent to ${phone}`,
      },
    }),
  ]);

  revalidatePath(`/queue/process/${fillId}`);

  return { success: true, phone, messageId: result.messageId };
}

// ─── DUR (Drug Utilization Review) ────────────────────────────────

/**
 * Runs the full DUR engine for this fill. Idempotent — calling it again
 * recomputes the alerts and replaces any prior set for this fill in the
 * StoreSetting JSON store (see dur-engine.ts).
 *
 * The Verify-stage UI auto-fires this when the fill enters Verify so the
 * pharmacist sees interaction / allergy / duplication / dose-range / age-gender
 * alerts inline. Pre-existing overridden alerts stay overridden.
 */
export async function runDurForFill(fillId: string): Promise<DURAlert[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Run the engine — it persists the alerts as a side effect.
  await runFullDUR(fillId);
  return getDurAlertsForFill(fillId);
}

/** Read current DUR alerts (no recompute). Used on page hydration. */
export async function getDurAlertsForCurrentFill(
  fillId: string
): Promise<DURAlert[]> {
  return getDurAlertsForFill(fillId);
}

/**
 * Pharmacist override for a DUR alert. Wraps the engine helper so the
 * Process page can call it directly without going through the /clinical/dur
 * page. Audit / authorization happens inside overrideDurAlert (only users
 * with isPharmacist=true are allowed).
 */
export async function overrideDurAlertOnFill(
  fillId: string,
  alertId: string,
  reasonCode: string,
  notes?: string
): Promise<{ success: boolean; error?: string; alerts?: DURAlert[] }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const result = await overrideDurAlert(alertId, user.id, reasonCode, notes);
  if (!result.success) return result;

  revalidatePath(`/queue/process/${fillId}`);
  const alerts = await getDurAlertsForFill(fillId);
  return { success: true, alerts };
}

// ─── Verify Barcode Scan ──────────────────────────────────────────

/**
 * Expand a 10-digit NDC into the three possible 11-digit "billing" forms.
 *
 * The 10-digit NDC printed on FDA-registered drug labeling can come in three
 * segment layouts (per FDA NDC directory conventions):
 *
 *   4-4-2  →  pad zero in segment 1: 0XXXX-XXXX-XX
 *   5-3-2  →  pad zero in segment 2: XXXXX-0XXX-XX
 *   5-4-1  →  pad zero in segment 3: XXXXX-XXXX-0X
 *
 * Once digits are stripped of hyphens, the three formats are
 * indistinguishable, so we emit all three candidate 11-digit forms and let
 * the comparison match any of them. The 11-digit "5-4-2" format is the
 * canonical billing NDC stored in our DB and submitted on NCPDP claims.
 */
function expand10DigitNdc(core: string, into: Set<string>): void {
  if (core.length !== 10) return;
  into.add("0" + core); // 4-4-2  → 5-4-2
  into.add(core.slice(0, 5) + "0" + core.slice(5)); // 5-3-2 → 5-4-2
  into.add(core.slice(0, 9) + "0" + core.slice(9)); // 5-4-1 → 5-4-2
}

/**
 * Returns every reasonable 11-digit canonical NDC that the given raw barcode
 * input could represent. Two NDCs match if their candidate sets intersect.
 *
 * Handles the three barcode formats we see at the bench:
 *   - 10-digit NDC (often hyphenated, sometimes plain digits)
 *   - 11-digit NDC (canonical billing form, already stored in the item table)
 *   - 12-digit UPC-A (retail OTC bottles: 1 system digit + 10-digit NDC + check)
 *   - 14-digit GTIN (GS1-DataBar / GS1-128 from unit-of-use packaging)
 *
 * Anything that doesn't match a known length falls through to "compare the
 * raw digits as-is" so the caller still gets a deterministic answer instead
 * of a silent false-negative.
 */
function ndcCandidates(raw: string): Set<string> {
  const digits = raw.replace(/[^0-9]/g, "");
  const out = new Set<string>();
  if (!digits) return out;

  switch (digits.length) {
    case 11:
      // Canonical billing NDC — accept directly. Also expand the trailing
      // 10 digits because some legacy systems store an NDC with a stray
      // leading zero that doesn't correspond to any of the 3 segment
      // layouts; the expansion catches "01234567890" vs "12345067890".
      out.add(digits);
      expand10DigitNdc(digits.slice(1), out);
      break;
    case 10:
      expand10DigitNdc(digits, out);
      break;
    case 12:
      // UPC-A: 1 system digit (typically "3" for US prescription drugs,
      // "0" for many OTC) + 10-digit NDC + 1 check digit.
      expand10DigitNdc(digits.slice(1, 11), out);
      break;
    case 13:
      // EAN-13 wrapping a UPC-A: leading "0" + 12-digit UPC-A.
      expand10DigitNdc(digits.slice(2, 12), out);
      break;
    case 14:
      // GTIN-14: 1 packaging-indicator + 13-digit EAN body. For US drugs
      // this is typically "0" + "0" + UPC-A. Strip the indicator and the
      // EAN leading zero, then the UPC system digit is at slice(3) and
      // the 10-digit NDC is at slice(3, 13).
      expand10DigitNdc(digits.slice(3, 13), out);
      break;
    default:
      // Unknown wrapper — best-effort: try the digits literally and try
      // expanding from any trailing 10 digits in case it's UPC-A nested
      // inside an unrecognized GS1 envelope.
      out.add(digits);
      if (digits.length > 10) expand10DigitNdc(digits.slice(-11, -1), out);
  }

  return out;
}

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

  // Expected NDC from the fill's item or the prescription's item.
  const expectedNdc = fill.ndc || fill.item?.ndc || fill.prescription?.item?.ndc || null;

  if (!expectedNdc) {
    return {
      match: false,
      expected: null,
      scanned: scannedNdc,
      message: "No NDC on file for this fill — manual verification required",
    };
  }

  // Compare candidate-set intersection so a UPC-A scan ("3001234567891")
  // still matches the 11-digit NDC stored in the DB ("00123456789"), and
  // a 10-digit hyphenated NDC ("1234-5678-90") matches the same row
  // regardless of which 3-segment layout the original used.
  const expectedSet = ndcCandidates(expectedNdc);
  const scannedSet = ndcCandidates(scannedNdc);

  let match = false;
  for (const candidate of scannedSet) {
    if (expectedSet.has(candidate)) {
      match = true;
      break;
    }
  }

  return {
    match,
    expected: expectedNdc,
    scanned: scannedNdc,
    message: match
      ? `NDC match confirmed: ${expectedNdc}`
      : `NDC MISMATCH — Expected: ${expectedNdc}, Scanned: ${scannedNdc}`,
  };
}

// ─── Adjudication (claim submission from the Process page) ────────

/**
 * Submit (or resubmit) an insurance claim for a fill currently sitting in
 * the Adjudicating queue. Wraps the existing /api/claims/submit pipeline
 * so the Process page can fire it inline without bouncing to /billing.
 *
 * Picks the patient's primary active insurance unless `insuranceId` is
 * passed explicitly. Override codes are forwarded verbatim — used for the
 * "submit with NCPDP override" flow when a payer wants prior auth /
 * step therapy bypass codes.
 */
export async function submitAdjudicationForFill(
  fillId: string,
  options?: { insuranceId?: string; overrideCodes?: string[] }
): Promise<{
  success: boolean;
  error?: string;
  status?: string;
  rejectionCodes?: string[];
  rejectionMessages?: Record<string, string>;
  paidAmount?: number;
  copayAmount?: number;
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Resolve the patient + active insurance for this fill so we can pick
  // the primary plan when the caller doesn't specify one.
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    select: {
      id: true,
      prescription: {
        select: {
          patient: {
            select: {
              insurance: {
                where: { isActive: true },
                orderBy: { priority: "asc" },
                select: { id: true, priority: true },
              },
            },
          },
        },
      },
    },
  });

  if (!fill) return { success: false, error: "Fill not found" };

  const insurance =
    options?.insuranceId
      ? fill.prescription.patient.insurance.find(
          (i) => i.id === options.insuranceId
        )
      : fill.prescription.patient.insurance[0];

  if (!insurance) {
    return {
      success: false,
      error:
        "No active insurance on file. Add an insurance card before submitting a claim, or send to Prepay.",
    };
  }

  // Lazy-load the adjudicator so the action file doesn't pull in NCPDP code
  // when this action isn't called.
  const { submitClaim } = await import("@/lib/claims/adjudicator");
  try {
    const response = await submitClaim(
      {
        fillId,
        insuranceId: insurance.id,
        overrideCodes: options?.overrideCodes,
      },
      user.id
    );
    revalidatePath("/dashboard");
    revalidatePath("/queue");
    revalidatePath(`/queue/process/${fillId}`, "layout");
    return {
      success: true,
      status: response.status,
      rejectionCodes: response.rejectionCodes,
      rejectionMessages: response.rejectionMessages,
      paidAmount: response.paidAmount,
      copayAmount: response.copayAmount,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Adjudication failed";
    return { success: false, error: msg };
  }
}
