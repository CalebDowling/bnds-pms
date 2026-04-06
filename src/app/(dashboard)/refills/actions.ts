"use server";

interface RefillRequest {
  id: string;
  patientName: string;
  rxNumber: string;
  drugName: string;
  lastFillDate: string | null;
  requestedDate: string;
  status: "pending" | "approved" | "rejected";
  refillsRemaining: number;
  daysSupply: number | null;
  prescriberName?: string;
  source?: "internal" | "prescriber_portal";
}

interface RefillStats {
  pending: number;
  approved: number;
  rejected: number;
}

export async function getRefillRequests(
  status?: "pending" | "approved" | "rejected"
): Promise<RefillRequest[]> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const requests = await prisma.refillRequest.findMany({
    where,
    select: {
      id: true,
      status: true,
      requestedAt: true,
      source: true,
      patient: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      prescription: {
        select: {
          rxNumber: true,
          dateFilled: true,
          daysSupply: true,
          refillsRemaining: true,
          prescriber: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          item: {
            select: {
              name: true,
            },
          },
          formula: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    patientName: `${r.patient.firstName} ${r.patient.lastName}`,
    rxNumber: r.prescription.rxNumber,
    drugName: r.prescription.item?.name || r.prescription.formula?.name || "Unknown",
    lastFillDate: r.prescription.dateFilled?.toISOString() || null,
    requestedDate: r.requestedAt.toISOString(),
    status: r.status as "pending" | "approved" | "rejected",
    refillsRemaining: r.prescription.refillsRemaining,
    daysSupply: r.prescription.daysSupply,
    prescriberName: r.prescription.prescriber
      ? `${r.prescription.prescriber.firstName} ${r.prescription.prescriber.lastName}`
      : undefined,
    source: r.source as "internal" | "prescriber_portal",
  }));
}

export async function getRefillStats(): Promise<RefillStats> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const [pending, approved, rejected] = await Promise.all([
    prisma.refillRequest.count({ where: { status: "pending" } }),
    prisma.refillRequest.count({ where: { status: "approved" } }),
    prisma.refillRequest.count({ where: { status: "rejected" } }),
  ]);

  return { pending, approved, rejected };
}

export async function approveRefill(requestId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const refillRequest = await prisma.refillRequest.findUnique({
    where: { id: requestId },
    include: { prescription: true },
  });

  if (!refillRequest) throw new Error("Refill request not found");

  await prisma.refillRequest.update({
    where: { id: requestId },
    data: {
      status: "approved",
      processedAt: new Date(),
      processedBy: user.id,
    },
  });

  const lastFill = await prisma.prescriptionFill.findFirst({
    where: { prescriptionId: refillRequest.prescription.id },
    orderBy: { fillNumber: "desc" },
    select: { fillNumber: true },
  });

  const nextFillNumber = (lastFill?.fillNumber || 0) + 1;

  await prisma.prescriptionFill.create({
    data: {
      prescriptionId: refillRequest.prescription.id,
      fillNumber: nextFillNumber,
      quantity: refillRequest.prescription.quantityPrescribed || 0,
      daysSupply: refillRequest.prescription.daysSupply,
      status: "pending",
    },
  });
}

export async function rejectRefill(
  requestId: string,
  reason: string
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!reason.trim()) throw new Error("Rejection reason is required");

  await prisma.refillRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      notes: reason,
      processedAt: new Date(),
      processedBy: user.id,
    },
  });
}
