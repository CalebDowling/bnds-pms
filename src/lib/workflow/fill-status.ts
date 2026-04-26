/**
 * Fill Status Lifecycle — canonical fill statuses and valid transitions.
 *
 * This replaces the DRX-dependent queue system with a local state machine.
 * Each fill moves through these statuses as technicians and pharmacists
 * process it. Status changes are atomic (transactional) with audit trail.
 *
 * DRX workflow:  Pre-Check → Adjudicating → Print → Scan → Verify → Waiting Bin → Sold
 * BNDS statuses: intake    → adjudicating → print → scan → verify → waiting_bin → sold
 */

import { prisma } from "@/lib/prisma";

// ─── Canonical Fill Statuses ──────────────────────────────────────

export const FILL_STATUSES = {
  // Core workflow (happy path)
  intake: "intake",
  adjudicating: "adjudicating",
  print: "print",
  scan: "scan",
  verify: "verify",
  waiting_bin: "waiting_bin",
  sold: "sold",

  // Exception states
  hold: "hold",
  oos: "oos",
  rejected: "rejected",
  // Pharmacist rejected at verify — separate from `rejected` (which is
  // insurance-claim rejection). Added per pharmacist review so RPh-rejected
  // fills don't get lost in the high-volume Print queue.
  rph_rejected: "rph_rejected",

  // Custom queues (tag-based, but can also be a status for routing)
  price_check: "price_check",
  prepay: "prepay",
  ok_to_charge: "ok_to_charge",
  decline: "decline",
  ok_to_charge_clinic: "ok_to_charge_clinic",
  // Pharmacist QA/QC of compounds finalized by compounding technicians.
  // Replaces the catch-all "mochi" queue per pharmacist review.
  compound_qa: "compound_qa",
  // Centralized queue for telehealth integrations (Lumi, Mochi, etc.).
  telehealth: "telehealth",
  // Legacy — kept so existing data still maps; new fills should use
  // compound_qa or telehealth as appropriate.
  mochi: "mochi",

  // Terminal
  cancelled: "cancelled",

  // Legacy (from DRX sync — these are mapped to the above on sync)
  pending: "pending",
} as const;

export type FillStatus = (typeof FILL_STATUSES)[keyof typeof FILL_STATUSES];

// ─── Status Metadata ──────────────────────────────────────────────

export interface FillStatusMeta {
  label: string;
  color: string;       // Tailwind-compatible color for badges
  icon: string;        // Lucide icon name
  isTerminal: boolean; // No further transitions allowed
  isException: boolean; // Off the happy path
  queueKey: string;    // Maps to dashboard queue key
}

export const FILL_STATUS_META: Record<string, FillStatusMeta> = {
  intake:               { label: "Intake",              color: "#3b82f6", icon: "Inbox",          isTerminal: false, isException: false, queueKey: "intake" },
  adjudicating:         { label: "Adjudicating",        color: "#06b6d4", icon: "ArrowDownUp",    isTerminal: false, isException: false, queueKey: "sync" },
  print:                { label: "Print",               color: "#a855f7", icon: "Printer",        isTerminal: false, isException: false, queueKey: "print" },
  scan:                 { label: "Scan",                color: "#6366f1", icon: "ScanLine",       isTerminal: false, isException: false, queueKey: "scan" },
  verify:               { label: "Verify",              color: "#10b981", icon: "CheckCircle2",   isTerminal: false, isException: false, queueKey: "verify" },
  waiting_bin:          { label: "Waiting Bin",         color: "#f59e0b", icon: "Clock",          isTerminal: false, isException: false, queueKey: "waiting_bin" },
  sold:                 { label: "Sold",                color: "#22c55e", icon: "DollarSign",     isTerminal: true,  isException: false, queueKey: "sold" },
  hold:                 { label: "Hold",                color: "#f97316", icon: "Pause",          isTerminal: false, isException: true,  queueKey: "hold" },
  oos:                  { label: "Out of Stock",        color: "#f97316", icon: "AlertTriangle",  isTerminal: false, isException: true,  queueKey: "oos" },
  rejected:             { label: "Rejected",            color: "#ef4444", icon: "XCircle",        isTerminal: false, isException: true,  queueKey: "reject" },
  rph_rejected:         { label: "Rejected by RPh",     color: "#dc2626", icon: "ShieldAlert",    isTerminal: false, isException: true,  queueKey: "rph_rejected" },
  price_check:          { label: "Price Check",         color: "#ec4899", icon: "BadgeDollarSign",isTerminal: false, isException: true,  queueKey: "price_check" },
  prepay:               { label: "Prepay",              color: "#0ea5e9", icon: "CreditCard",     isTerminal: false, isException: true,  queueKey: "prepay" },
  ok_to_charge:         { label: "OK to Charge",        color: "#22c55e", icon: "DollarSign",     isTerminal: false, isException: true,  queueKey: "ok_to_charge" },
  decline:              { label: "Decline",             color: "#dc2626", icon: "ThumbsDown",     isTerminal: false, isException: true,  queueKey: "decline" },
  ok_to_charge_clinic:  { label: "OK to Charge Clinic", color: "#16a34a", icon: "Building2",      isTerminal: false, isException: true,  queueKey: "ok_to_charge_clinic" },
  compound_qa:          { label: "Compound QA",         color: "#7c3aed", icon: "FlaskConical",   isTerminal: false, isException: true,  queueKey: "compound_qa" },
  telehealth:           { label: "Telehealth",          color: "#0891b2", icon: "Stethoscope",    isTerminal: false, isException: true,  queueKey: "telehealth" },
  mochi:                { label: "Mochi (legacy)",      color: "#d946ef", icon: "Cherry",         isTerminal: false, isException: true,  queueKey: "mochi" },
  cancelled:            { label: "Cancelled",           color: "#6b7280", icon: "X",              isTerminal: true,  isException: true,  queueKey: "cancelled" },
  pending:              { label: "Pending",             color: "#9ca3af", icon: "Clock",          isTerminal: false, isException: false, queueKey: "pending" },
};

// ─── Valid Transitions ────────────────────────────────────────────

/**
 * For each fill status, defines which statuses it can transition to.
 * This is the fill-level state machine (distinct from the prescription-level one).
 */
export const FILL_TRANSITIONS: Record<string, string[]> = {
  // Core workflow (happy path, forward only + exception branches)
  pending:       ["intake", "cancelled"],
  intake:        ["adjudicating", "hold", "oos", "rejected", "price_check", "cancelled"],
  adjudicating:  ["print", "rejected", "hold", "price_check", "prepay", "cancelled"],
  print:         ["scan", "hold", "cancelled"],
  scan:          ["verify", "hold", "cancelled"],
  // Verify can now route to a dedicated rph_rejected queue when the pharmacist
  // rejects the fill — keeps RPh-rejected fills from getting lost in Print on
  // high-volume days (per pharmacist review #3.2).
  verify:        ["waiting_bin", "hold", "scan", "rph_rejected"],
  waiting_bin:   ["sold", "hold", "cancelled"], // cancelled = return to stock (RTS)

  // Exception states can return to the workflow
  hold:          ["intake", "adjudicating", "print", "scan", "verify", "cancelled"],
  oos:           ["intake", "adjudicating", "cancelled"],
  rejected:      ["adjudicating", "price_check", "cancelled"], // rebill after fix
  rph_rejected:  ["print", "scan", "hold", "cancelled"], // tech follow-up after RPh reject

  // Custom queues return to the main workflow after resolution
  price_check:   ["adjudicating", "hold", "cancelled"],
  prepay:        ["adjudicating", "ok_to_charge", "decline", "cancelled"],
  ok_to_charge:  ["adjudicating", "print", "cancelled"],
  decline:       ["cancelled", "adjudicating"],
  ok_to_charge_clinic: ["adjudicating", "print", "cancelled"],
  compound_qa:   ["waiting_bin", "rph_rejected", "hold", "cancelled"], // RPh QA gate
  telehealth:    ["intake", "adjudicating", "cancelled"], // route to standard flow once triaged
  mochi:         ["intake", "adjudicating", "compound_qa", "telehealth", "cancelled"], // legacy route

  // Terminal — no transitions out
  sold:          [],
  cancelled:     [],
};

// ─── Transition Validation ────────────────────────────────────────

export function canTransition(fromStatus: string, toStatus: string): boolean {
  const allowed = FILL_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

export function getNextStatuses(currentStatus: string): string[] {
  return FILL_TRANSITIONS[currentStatus] || [];
}

/**
 * Returns the single "happy path" next status for a fill, if there is one.
 * Used for the primary "Advance" button in the processing UI.
 */
export function getHappyPathNext(currentStatus: string): string | null {
  const map: Record<string, string> = {
    pending: "intake",
    intake: "adjudicating",
    adjudicating: "print",
    print: "scan",
    scan: "verify",
    verify: "waiting_bin",
    waiting_bin: "sold",
  };
  return map[currentStatus] || null;
}

// ─── Advance Fill Status (Server Action) ──────────────────────────

export interface AdvanceFillResult {
  success: boolean;
  fill?: { id: string; status: string };
  error?: string;
}

/**
 * Maps a fill status to the prescription-level status that should be
 * reflected on the parent Rx so search/list views stay in sync.
 *
 * The Rx status is intentionally coarser than the fill status — pharmacists
 * filtering "in progress" Rxs don't need to know whether the fill is in
 * Print vs Scan vs Verify. We collapse those into a single `in_progress`.
 */
const FILL_TO_RX_STATUS: Record<string, string> = {
  intake:               "intake",
  adjudicating:         "in_progress",
  print:                "in_progress",
  scan:                 "in_progress",
  verify:               "in_progress",
  waiting_bin:          "ready",
  sold:                 "dispensed",
  hold:                 "on_hold",
  oos:                  "on_hold",
  rejected:             "on_hold",
  rph_rejected:         "on_hold",
  price_check:          "on_hold",
  prepay:               "on_hold",
  ok_to_charge:         "in_progress",
  decline:              "on_hold",
  ok_to_charge_clinic:  "in_progress",
  compound_qa:          "compounding",
  telehealth:           "in_progress",
  mochi:                "in_progress",
  cancelled:            "cancelled",
  pending:              "intake",
};

/**
 * Atomically advance a fill to a new status with audit trail.
 *
 * - Validates the transition is allowed
 * - Blocks advance past "intake" if the fill has zero quantity (no drug to dispense)
 * - Updates the fill status in a transaction
 * - Creates a FillEvent for the audit log
 * - Sets filledBy/filledAt when entering "scan" (the tech filled the bottle)
 * - Sets verifiedBy/verifiedAt when entering "verify" → "waiting_bin"
 * - Sets dispensedAt when entering "sold"
 * - Syncs the parent Prescription.status via FILL_TO_RX_STATUS so list views
 *   don't show stale rx_status='intake' for an Rx that's already been sold
 */
export async function advanceFillStatus(
  fillId: string,
  newStatus: string,
  userId: string,
  notes?: string
): Promise<AdvanceFillResult> {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    select: {
      id: true,
      status: true,
      prescriptionId: true,
      quantity: true,
      filledBy: true,
      filledAt: true,
    },
  });

  if (!fill) {
    return { success: false, error: "Fill not found" };
  }

  if (!canTransition(fill.status, newStatus)) {
    return {
      success: false,
      error: `Cannot move from "${fill.status}" to "${newStatus}". Allowed: ${getNextStatuses(fill.status).join(", ") || "none"}`,
    };
  }

  // ── Quantity guard ────────────────────────────────────────────
  // A fill with quantity=0 has nothing to dispense. Allow the operator to
  // route it to an exception queue (hold, oos, rejected, cancelled), but
  // block the happy-path workflow until the quantity is set. Without this
  // guard a tech could print a label and "dispense" zero pills.
  const qty = Number(fill.quantity);
  const exceptionTargets = new Set([
    "hold",
    "oos",
    "rejected",
    "rph_rejected",
    "price_check",
    "cancelled",
  ]);
  const isHappyPath =
    !exceptionTargets.has(newStatus) && newStatus !== fill.status;
  if ((!qty || qty <= 0) && isHappyPath && fill.status !== "intake") {
    // Allow movement out of intake (so the tech can put it on hold), but
    // don't let it advance further along the happy path until quantity is set.
    return {
      success: false,
      error:
        "Fill quantity is 0 — set a dispense quantity before advancing this fill.",
    };
  }
  if ((!qty || qty <= 0) && newStatus === "adjudicating") {
    // Even from intake, you shouldn't claim against insurance for 0 qty.
    return {
      success: false,
      error:
        "Fill quantity is 0 — set a dispense quantity before sending the claim.",
    };
  }

  // Build additional data updates based on the target status
  const additionalData: Record<string, unknown> = {};

  // Tech filled the bottle when they hand off to the scan stage.
  // Stamp filledBy/filledAt the first time we cross that boundary so the
  // audit trail records the tech, not just the verifying pharmacist.
  if (newStatus === "scan" && !fill.filledAt) {
    additionalData.filledBy = userId;
    additionalData.filledAt = new Date();
  }

  if (newStatus === "waiting_bin" && fill.status === "verify") {
    // Pharmacist verified — record who and when
    additionalData.verifiedBy = userId;
    additionalData.verifiedAt = new Date();
  }

  if (newStatus === "sold") {
    additionalData.dispensedAt = new Date();
  }

  // Compute the new prescription-level status. If the fill is moving forward
  // along the happy path we want the Rx to follow; if it's diverging into an
  // exception state (e.g. on_hold), we follow that too. Only skip the sync if
  // the mapping doesn't have an entry (defensive — every status should map).
  const newRxStatus = FILL_TO_RX_STATUS[newStatus];

  try {
    // Use the interactive ($transaction(callback)) form so we can branch the
    // statements without fighting Prisma's tuple-typed array overload.
    const updated = await prisma.$transaction(async (tx) => {
      const updatedFill = await tx.prescriptionFill.update({
        where: { id: fillId },
        data: {
          status: newStatus,
          ...additionalData,
        },
      });

      await tx.fillEvent.create({
        data: {
          fillId,
          eventType: "status_change",
          fromValue: fill.status,
          toValue: newStatus,
          performedBy: userId,
          notes: notes || null,
        },
      });

      if (newRxStatus) {
        const rxData: Record<string, unknown> = { status: newRxStatus };
        // When the final fill is sold, also stamp the Rx-level dateFilled so
        // reports keyed off the parent record see the dispense date.
        if (newStatus === "sold") {
          rxData.dateFilled = new Date();
        }
        await tx.prescription.update({
          where: { id: fill.prescriptionId },
          data: rxData,
        });
      }

      return updatedFill;
    });

    return { success: true, fill: { id: updated.id, status: updated.status } };
  } catch (err) {
    console.error("[advanceFillStatus] Transaction failed:", err);
    return { success: false, error: "Database error — please try again" };
  }
}

// ─── Queue Status Mapping ─────────────────────────────────────────

/**
 * Maps dashboard queue keys to the fill statuses they should show.
 * This is used by getQueueCounts() and getQueueFills() for local DB queries.
 */
export const QUEUE_TO_FILL_STATUS: Record<string, string[]> = {
  intake:               ["intake"],
  sync:                 ["adjudicating"],
  reject:               ["rejected"],
  print:                ["print"],
  scan:                 ["scan"],
  verify:               ["verify"],
  rph_rejected:         ["rph_rejected"],
  oos:                  ["oos"],
  waiting_bin:          ["waiting_bin"],
  price_check:          ["price_check"],
  prepay:               ["prepay"],
  ok_to_charge:         ["ok_to_charge"],
  decline:              ["decline"],
  ok_to_charge_clinic:  ["ok_to_charge_clinic"],
  compound_qa:          ["compound_qa"],
  telehealth:           ["telehealth"],
  mochi:                ["mochi"], // legacy — kept for backwards compat
  // "renewals" and "todo" are handled separately (not fill-status-based)
};

/**
 * All fill statuses that represent "active" fills (not terminal).
 * Used for queue count queries.
 */
export const ACTIVE_FILL_STATUSES = Object.keys(FILL_TRANSITIONS).filter(
  (s) => !FILL_STATUS_META[s]?.isTerminal
);
