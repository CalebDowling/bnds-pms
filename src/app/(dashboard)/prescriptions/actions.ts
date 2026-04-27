"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

// ─── Types ──────────────────────────────────

export type PrescriptionFormData = {
  patientId: string;
  prescriberId: string;
  source: string;
  priority: string;
  itemId?: string;
  formulaId?: string;
  isCompound: boolean;
  quantityPrescribed?: number;
  daysSupply?: number;
  directions?: string;
  dawCode?: string;
  refillsAuthorized: number;
  dateWritten: string;
  expirationDate?: string;
  prescriberNotes?: string;
  internalNotes?: string;
  insuranceId?: string;
};

// ─── RX NUMBER GENERATOR ────────────────────

/**
 * Allocate the next Rx number atomically via a Postgres SEQUENCE.
 *
 * Replaces the older "read MAX(rx_number) + 1, retry on P2002" pattern.
 * That worked at low volume but had two failure modes:
 *
 *   1. Concurrent createPrescription() calls both read the same MAX and
 *      both tried to insert the same rxNumber — one succeeded, the other
 *      retried (handled).
 *   2. The retry re-read MAX, got the same value, and looped until it
 *      timed out — only the local-increment fallback rescued it.
 *
 * `nextval()` on a SEQUENCE is atomic by construction and collision-free
 * even at thousands of allocations per second, so the retry loop in
 * `createPrescription` collapses to a simple "call once, insert, done."
 *
 * The sequence is created and seeded by the migration at
 * `prisma/migrations/20260427_rx_number_sequence.sql`. If somehow the
 * sequence falls behind existing data (e.g. someone restored a backup
 * without re-running the migration), the defensive setval at the bottom
 * of that migration nudges it forward on the next deploy.
 */
async function nextRxNumber(): Promise<string> {
  const rows = await prisma.$queryRaw<{ next: bigint }[]>`
    SELECT nextval('rx_number_seq') AS next
  `;
  return rows[0].next.toString();
}

// ─── LIST / SEARCH ───────────────────────────

// BNDS PMS Redesign — high-level filter buckets shown as tabs in the
// Prescriptions list. We translate a simple bucket name into the more
// granular set of `status` values that map to it. Keeping the mapping
// here (instead of hard-coding statuses on the page) means a future
// status migration only needs to update this one table.
const STATUS_BUCKETS = {
  active: ["intake", "pending_review", "in_progress", "ready_to_fill", "compounding", "ready_for_verification", "verified", "ready", "filling", "pending_fill"],
  completed: ["dispensed", "delivered"],
  transferred: ["transferred"],
  expired: ["expired", "cancelled", "on_hold"],
} as const satisfies Record<string, readonly string[]>;

export type PrescriptionFilter = keyof typeof STATUS_BUCKETS | "all";

function buildPrescriptionWhere(
  filter: PrescriptionFilter,
  legacyStatus?: string,
): Prisma.PrescriptionWhereInput {
  // Legacy `?status=...` URLs (older saved exports / bookmarks) get the
  // exact-match behavior they originally had — pre-tab filtering.
  if (legacyStatus) {
    if (legacyStatus === "all") return {};
    return { status: legacyStatus };
  }

  if (filter === "all") return {};
  const bucket = STATUS_BUCKETS[filter];
  return { status: { in: [...bucket] } };
}

export async function getPrescriptions({
  search = "",
  status = "",
  filter = "all",
  page = 1,
  limit = 25,
}: {
  search?: string;
  /** @deprecated use `filter` for tab-style buckets. Kept for back-compat. */
  status?: string;
  filter?: PrescriptionFilter;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.PrescriptionWhereInput = buildPrescriptionWhere(
    filter,
    status || undefined,
  );

  if (search) {
    where.OR = [
      { rxNumber: { contains: search, mode: "insensitive" } },
      { patient: { lastName: { contains: search, mode: "insensitive" } } },
      { patient: { firstName: { contains: search, mode: "insensitive" } } },
      { patient: { mrn: { contains: search, mode: "insensitive" } } },
      { item: { name: { contains: search, mode: "insensitive" } } },
      { formula: { name: { contains: search, mode: "insensitive" } } },
      { prescriber: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true },
        },
        prescriber: {
          select: { id: true, firstName: true, lastName: true, suffix: true, npi: true },
        },
        item: { select: { name: true, strength: true, dosageForm: true } },
        formula: { select: { name: true, dosageForm: true } },
        fills: { select: { id: true, fillNumber: true, status: true } },
      },
      orderBy: { dateReceived: "desc" },
      skip,
      take: limit,
    }),
    prisma.prescription.count({ where }),
  ]);

  return { prescriptions, total, pages: Math.ceil(total / limit), page };
}

// ─── TAB COUNTS ─────────────────────────────
// Used by the Prescriptions list tabs. Each query runs in parallel so the
// page render isn't bottlenecked on the slowest one.
export async function getPrescriptionCounts(): Promise<{
  all: number;
  active: number;
  completed: number;
  transferred: number;
  expired: number;
}> {
  const [allCount, activeCount, completedCount, transferredCount, expiredCount] =
    await Promise.all([
      prisma.prescription.count(),
      prisma.prescription.count({ where: { status: { in: [...STATUS_BUCKETS.active] } } }),
      prisma.prescription.count({ where: { status: { in: [...STATUS_BUCKETS.completed] } } }),
      prisma.prescription.count({ where: { status: { in: [...STATUS_BUCKETS.transferred] } } }),
      prisma.prescription.count({ where: { status: { in: [...STATUS_BUCKETS.expired] } } }),
    ]);

  return {
    all: allCount,
    active: activeCount,
    completed: completedCount,
    transferred: transferredCount,
    expired: expiredCount,
  };
}

// ─── GET SINGLE ─────────────────────────────

export async function getPrescription(id: string) {
  const rx = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          phoneNumbers: true,
          addresses: true,
          allergies: { where: { status: "active" } },
          insurance: { where: { isActive: true }, include: { thirdPartyPlan: true } },
        },
      },
      prescriber: true,
      item: true,
      formula: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } } },
      insurance: { include: { thirdPartyPlan: true } },
      fills: {
        orderBy: { fillNumber: "desc" },
        include: {
          filler: { select: { firstName: true, lastName: true } },
          verifier: { select: { firstName: true, lastName: true } },
          events: { orderBy: { createdAt: "desc" } },
        },
      },
      statusLog: {
        orderBy: { changedAt: "desc" },
        include: { changer: { select: { firstName: true, lastName: true } } },
      },
      renewals: { orderBy: { createdAt: "desc" } },
      refillRequests: { orderBy: { requestedAt: "desc" } },
      transfers: { orderBy: { createdAt: "desc" } },
    },
  });

  // Audit PHI access
  try {
    const user = await getCurrentUser();
    if (user) {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({ userId: user.id, action: "VIEW", resource: "prescription", resourceId: id, details: { source: "getPrescription" } });
    }
  } catch {}

  // Convert Decimal objects to numbers for React serialization
  return rx ? JSON.parse(JSON.stringify(rx, (_, v) =>
    typeof v === "object" && v !== null && "toFixed" in v ? Number(v) : v
  )) : null;
}

// ─── CREATE ─────────────────────────────────

export async function createPrescription(data: PrescriptionFormData) {
  // Rx number allocation is atomic via the `rx_number_seq` Postgres SEQUENCE
  // (see `nextRxNumber` above). nextval() is collision-free under arbitrary
  // concurrency, so a happy-path insert needs no retry loop.
  //
  // We DO keep a tiny defensive backstop for one corner case: a P2002 on
  // `rxNumber` after the sequence handed us a value would only happen if
  // the sequence somehow fell behind existing data — for example, after a
  // database restore from a backup that missed the sequence reset, or a
  // manual INSERT that bypassed nextval(). The migration's setval() block
  // is idempotent and runs again on deploy, so this is unlikely in
  // production, but a 3-attempt re-allocation is cheap insurance.
  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rxNumber = await nextRxNumber();

    try {
      // Atomic: Prescription + initial Fill (status="intake") so the Rx
      // immediately surfaces in the Workflow Queue's Intake stage. Mirrors
      // the DRX flow where every Rx — whether keyed in here, sent in via
      // the prescriber portal, or imported from SureScripts — starts at
      // Intake and walks the same pipeline. fillNumber=0 is the original
      // dispense; refills create fills 1, 2, ...
      //
      // We `select: { id, rxNumber }` rather than returning the full row so
      // the response is plain JSON — Prisma `Decimal` and `Date` values
      // returned across the server-action boundary have caused intermittent
      // hangs in the past (the client-side React state never settles).
      const prescription = await prisma.prescription.create({
        data: {
          rxNumber,
          patientId: data.patientId,
          prescriberId: data.prescriberId,
          status: "intake",
          source: data.source,
          priority: data.priority || "normal",
          itemId: data.itemId || null,
          formulaId: data.formulaId || null,
          isCompound: data.isCompound,
          quantityPrescribed: data.quantityPrescribed || null,
          daysSupply: data.daysSupply || null,
          directions: data.directions?.trim() || null,
          dawCode: data.dawCode || null,
          refillsAuthorized: data.refillsAuthorized || 0,
          refillsRemaining: data.refillsAuthorized || 0,
          dateWritten: new Date(data.dateWritten),
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
          prescriberNotes: data.prescriberNotes?.trim() || null,
          internalNotes: data.internalNotes?.trim() || null,
          insuranceId: data.insuranceId || null,
          fills: {
            create: {
              fillNumber: 0,
              status: "intake",
              quantity: data.quantityPrescribed || 0,
              daysSupply: data.daysSupply || null,
              itemId: data.itemId || null,
            },
          },
        },
        select: { id: true, rxNumber: true },
      });

      revalidatePath("/prescriptions");
      revalidatePath("/queue");
      revalidatePath("/dashboard");
      return prescription;
    } catch (err) {
      lastError = err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Sequence handed out a number that already exists in the table.
        // Log it loudly — this should be near-impossible — then advance
        // the sequence past current MAX and retry once or twice.
        console.warn("[createPrescription] P2002 despite sequence allocation", {
          rxNumber,
          attempt,
          target: err.meta?.target,
        });
        try {
          // Nudge the sequence past whatever's already in the table.
          await prisma.$executeRaw`
            SELECT setval(
              'rx_number_seq',
              GREATEST(
                (SELECT last_value FROM rx_number_seq),
                COALESCE(
                  (SELECT MAX(NULLIF(REGEXP_REPLACE(rx_number, '[^0-9]', '', 'g'), '')::BIGINT) FROM prescriptions),
                  100000
                ) + 1
              ),
              false
            )
          `;
        } catch (resetErr) {
          console.error("[createPrescription] failed to nudge rx_number_seq", resetErr);
        }
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to allocate a unique Rx number after retries");
}

// ─── UPDATE STATUS ──────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  intake: ["pending_review", "cancelled"],
  pending_review: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["compounding", "ready_to_fill", "on_hold", "cancelled"],
  compounding: ["ready_to_fill", "on_hold", "cancelled"],
  ready_to_fill: ["filling", "on_hold", "cancelled"],
  filling: ["ready_for_verification", "on_hold"],
  ready_for_verification: ["verified", "filling"],
  verified: ["ready", "filling"],
  ready: ["dispensed", "shipped", "delivered"],
  on_hold: ["pending_review", "in_progress", "cancelled"],
  dispensed: [],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export async function updatePrescriptionStatus(
  id: string,
  newStatus: string,
  userId: string,
  notes?: string
): Promise<void> {
  const rx = await prisma.prescription.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!rx) throw new Error("Prescription not found");

  const allowed = VALID_TRANSITIONS[rx.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot move from "${rx.status}" to "${newStatus}"`);
  }

  // Returning `void` rather than the Prisma row keeps the server-action
  // response plain JSON. Prisma `Decimal` and `Date` values returned across
  // the server-action boundary cause "An unexpected response was received
  // from the server" hangs (mirrors commit 01bfde1's fix in
  // `createPrescription`). The sole caller discards the return value.
  await prisma.$transaction([
    prisma.prescription.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true },
    }),
    prisma.prescriptionStatusLog.create({
      data: {
        prescriptionId: id,
        fromStatus: rx.status,
        toStatus: newStatus,
        changedBy: userId,
        notes: notes || null,
      },
      select: { id: true },
    }),
  ]);

  revalidatePath("/prescriptions");
  revalidatePath(`/prescriptions/${id}`);
}

// ─── CREATE FILL ────────────────────────────

export async function createFill(
  prescriptionId: string,
  data: {
    quantity: number;
    daysSupply?: number;
    itemId?: string;
    itemLotId?: string;
    ndc?: string;
    batchId?: string;
  }
) {
  const user = await getCurrentUser();

  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: {
      refillsRemaining: true,
      fills: { select: { fillNumber: true }, orderBy: { fillNumber: "desc" }, take: 1 },
      // Pulled in for the C-II refill guard. The DEA Schedule on the
      // dispensing item (or the parent Rx's item if no fill-level override)
      // tells us whether this drug is C-II and therefore non-refillable.
      item: { select: { deaSchedule: true, isControlled: true } },
    },
  });

  if (!rx) throw new Error("Prescription not found");

  const nextFillNumber = rx.fills.length > 0 ? rx.fills[0].fillNumber + 1 : 0;

  if (nextFillNumber > 0 && rx.refillsRemaining <= 0) {
    throw new Error("No refills remaining");
  }

  // ─── C-II refill guard ───
  // Schedule II controlled substances cannot be refilled under federal law
  // (21 CFR 1306.12). A new written prescription is required for each
  // dispense. Reject any fillNumber > 0 if the drug is C-II so we don't
  // accidentally dispense an unauthorized refill.
  if (nextFillNumber > 0) {
    const dispensingItemId = data.itemId ?? null;
    let deaSchedule: string | null = rx.item?.deaSchedule ?? null;
    let isControlled = !!rx.item?.isControlled;
    // If the fill specifies a different itemId (e.g. brand vs. generic
    // selection at the bench), check that item's schedule too.
    if (dispensingItemId && dispensingItemId !== undefined) {
      const fillItem = await prisma.item.findUnique({
        where: { id: dispensingItemId },
        select: { deaSchedule: true, isControlled: true },
      });
      if (fillItem?.deaSchedule) deaSchedule = fillItem.deaSchedule;
      if (fillItem?.isControlled) isControlled = true;
    }
    const sched = deaSchedule?.toUpperCase().trim() ?? "";
    const isCII =
      sched === "II" ||
      sched === "C-II" ||
      sched === "CII" ||
      sched === "SCHEDULE II";
    if (isCII || (isControlled && sched.includes("II") && !sched.includes("III"))) {
      throw new Error(
        "Schedule II controlled substances cannot be refilled — a new prescription is required for each dispense."
      );
    }
  }

  // ─── Server-side lot validation ───
  if (data.itemLotId) {
    const lot = await prisma.itemLot.findUnique({
      where: { id: data.itemLotId },
      select: { quantityOnHand: true, expirationDate: true, status: true },
    });
    if (!lot) throw new Error("Inventory lot not found");
    if (lot.status !== "available") throw new Error("This lot is no longer available");
    // expirationDate is stored as a date column (no time component) but Prisma
    // hydrates it as a Date at midnight UTC. A lot that expires "today" is
    // still good through end-of-day per USP convention; a strict <new Date()
    // would reject any time after midnight UTC on the expiration day, which
    // is hours earlier than the pharmacy's local-time end-of-day. Compare
    // against end-of-day local so an item dated 04/27 is still dispensable
    // anywhere on 04/27.
    if (lot.expirationDate) {
      const endOfToday = new Date();
      endOfToday.setHours(0, 0, 0, 0);
      // Treat the lot as expired only if its expirationDate is strictly
      // before the start of today — i.e. the date has already passed.
      if (lot.expirationDate.getTime() < endOfToday.getTime()) {
        throw new Error("Cannot dispense from an expired lot");
      }
    }
    if (Number(lot.quantityOnHand) < data.quantity) {
      throw new Error(`Insufficient lot quantity: ${Number(lot.quantityOnHand)} available, ${data.quantity} requested`);
    }
  }

  // ─── Server-side batch validation ───
  if (data.batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
      select: { status: true, quantityPrepared: true, budDate: true },
    });
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== "verified" && batch.status !== "completed") {
      throw new Error("Only verified or completed batches can be used for fills");
    }
    // Same date-only normalization as the lot expiration guard — a BUD of
    // "today" is still good through end-of-day, not invalid at 00:00:01.
    if (batch.budDate) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (batch.budDate.getTime() < startOfToday.getTime()) {
        throw new Error("Cannot dispense from a batch past its Beyond Use Date");
      }
    }
  }

  // ─── Transactional fill creation ───
  const newQtyOnHand = data.itemLotId
    ? await prisma.itemLot.findUnique({ where: { id: data.itemLotId }, select: { quantityOnHand: true } })
        .then(l => l ? Number(l.quantityOnHand) - data.quantity : 0)
    : null;

  const [fill] = await prisma.$transaction([
    prisma.prescriptionFill.create({
      data: {
        prescriptionId,
        fillNumber: nextFillNumber,
        quantity: data.quantity,
        daysSupply: data.daysSupply || null,
        itemId: data.itemId || null,
        itemLotId: data.itemLotId || null,
        ndc: data.ndc || null,
        batchId: data.batchId || null,
        status: "pending",
        filledBy: user?.id || null,
        filledAt: new Date(),
      },
    }),
    ...(nextFillNumber > 0
      ? [
          prisma.prescription.update({
            where: { id: prescriptionId },
            data: { refillsRemaining: { decrement: 1 } },
          }),
        ]
      : []),
    // Decrement inventory lot quantity and auto-deplete if empty
    ...(data.itemLotId
      ? [
          prisma.itemLot.update({
            where: { id: data.itemLotId },
            data: {
              quantityOnHand: { decrement: data.quantity },
              ...(newQtyOnHand !== null && newQtyOnHand <= 0 ? { status: "depleted" } : {}),
            },
          }),
        ]
      : []),
  ]);

  // ─── Log inventory transaction (non-blocking) ───
  if (data.itemLotId && user) {
    prisma.inventoryTransaction.create({
      data: {
        itemLotId: data.itemLotId,
        transactionType: "used_fill",
        quantity: data.quantity,
        referenceType: "prescription_fill",
        referenceId: fill.id,
        performedBy: user.id,
        notes: `Fill #${nextFillNumber} for Rx ${prescriptionId}`,
      },
    }).catch(() => { /* non-critical */ });
  }

  revalidatePath(`/prescriptions/${prescriptionId}`);
  return fill;
}

// ─── SEARCH PATIENTS (for Rx form) ──────────

export async function searchPatients(query: string) {
  if (!query || query.length < 2) return [];

  return prisma.patient.findMany({
    where: {
      status: "active",
      OR: [
        { lastName: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { mrn: { contains: query, mode: "insensitive" } },
        // Match phone digits too so techs entering "337555…" find the right
        // patient. We only check phone if the query looks numeric — a name
        // like "Hebert" shouldn't waste the phoneNumbers index lookup.
        ...(/^\d{3,}$/.test(query.replace(/\D/g, ""))
          ? [
              {
                phoneNumbers: {
                  some: { number: { contains: query.replace(/\D/g, "") } },
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      dateOfBirth: true,
      // Primary phone surfaces in the picker so two "James Hebert" rows are
      // distinguishable at a glance (DOB + last 4 digits is usually enough).
      phoneNumbers: {
        select: { number: true, isPrimary: true, phoneType: true },
        orderBy: { isPrimary: "desc" },
      },
    },
    take: 10,
    orderBy: { lastName: "asc" },
  });
}

/**
 * Fetch one patient in the same shape `searchPatients` returns. Used by
 * /prescriptions/new?patientId=... so the form can pre-fill the patient
 * picker server-side without re-using the search index.
 */
export async function getPatientForRx(patientId: string) {
  if (!patientId) return null;
  return prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      dateOfBirth: true,
      // Match searchPatients shape so the picker has the same primary phone
      // available when the form is pre-filled via ?patientId=...
      phoneNumbers: {
        select: { number: true, isPrimary: true, phoneType: true },
        orderBy: { isPrimary: "desc" },
      },
    },
  });
}
