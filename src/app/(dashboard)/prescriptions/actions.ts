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

async function generateRxNumber(): Promise<string> {
  const lastRx = await prisma.prescription.findFirst({
    orderBy: { rxNumber: "desc" },
    select: { rxNumber: true },
  });

  let nextNumber = 100001;
  if (lastRx?.rxNumber) {
    const num = parseInt(lastRx.rxNumber, 10);
    if (!isNaN(num)) nextNumber = num + 1;
  }

  return nextNumber.toString();
}

// ─── LIST / SEARCH ───────────────────────────

export async function getPrescriptions({
  search = "",
  status = "",
  page = 1,
  limit = 25,
}: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.PrescriptionWhereInput = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { rxNumber: { contains: search, mode: "insensitive" } },
      { patient: { lastName: { contains: search, mode: "insensitive" } } },
      { patient: { firstName: { contains: search, mode: "insensitive" } } },
      { patient: { mrn: { contains: search, mode: "insensitive" } } },
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
  const rxNumber = await generateRxNumber();

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
    },
  });

  revalidatePath("/prescriptions");
  return prescription;
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
) {
  const rx = await prisma.prescription.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!rx) throw new Error("Prescription not found");

  const allowed = VALID_TRANSITIONS[rx.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot move from "${rx.status}" to "${newStatus}"`);
  }

  const [prescription] = await prisma.$transaction([
    prisma.prescription.update({
      where: { id },
      data: { status: newStatus },
    }),
    prisma.prescriptionStatusLog.create({
      data: {
        prescriptionId: id,
        fromStatus: rx.status,
        toStatus: newStatus,
        changedBy: userId,
        notes: notes || null,
      },
    }),
  ]);

  revalidatePath("/prescriptions");
  revalidatePath(`/prescriptions/${id}`);
  return prescription;
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
    select: { refillsRemaining: true, fills: { select: { fillNumber: true }, orderBy: { fillNumber: "desc" }, take: 1 } },
  });

  if (!rx) throw new Error("Prescription not found");

  const nextFillNumber = rx.fills.length > 0 ? rx.fills[0].fillNumber + 1 : 0;

  if (nextFillNumber > 0 && rx.refillsRemaining <= 0) {
    throw new Error("No refills remaining");
  }

  // ─── Server-side lot validation ───
  if (data.itemLotId) {
    const lot = await prisma.itemLot.findUnique({
      where: { id: data.itemLotId },
      select: { quantityOnHand: true, expirationDate: true, status: true },
    });
    if (!lot) throw new Error("Inventory lot not found");
    if (lot.status !== "available") throw new Error("This lot is no longer available");
    if (lot.expirationDate < new Date()) throw new Error("Cannot dispense from an expired lot");
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
    if (batch.budDate && batch.budDate < new Date()) {
      throw new Error("Cannot dispense from a batch past its Beyond Use Date");
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
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      dateOfBirth: true,
    },
    take: 10,
    orderBy: { lastName: "asc" },
  });
}
