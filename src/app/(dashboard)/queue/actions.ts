"use server";

/**
 * Queue Actions — fetches fills from LOCAL database by status.
 *
 * This replaces the previous DRX API-dependent implementation.
 * All queue data now comes from the prescription_fills table,
 * using the canonical fill statuses defined in lib/workflow/fill-status.ts.
 */

import { QUEUE_LABELS, type QueueFill } from "./constants";

export async function getQueueFills({
  status,
  page = 1,
  limit = 50,
}: {
  status: string;
  page?: number;
  limit?: number;
}): Promise<{
  fills: QueueFill[];
  total: number;
  drxStatus: string;
  label: string;
}> {
  const label = QUEUE_LABELS[status] || status;

  // Renewals come from refill requests, not fills
  if (status === "renewals") {
    return getRefillRenewals(page, limit, label);
  }

  // Todo is not fill-status-based
  if (status === "todo") {
    return { fills: [], total: 0, drxStatus: "todo", label };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { QUEUE_TO_FILL_STATUS } = await import("@/lib/workflow/fill-status");

    const fillStatuses = QUEUE_TO_FILL_STATUS[status];
    if (!fillStatuses || fillStatuses.length === 0) {
      return { fills: [], total: 0, drxStatus: status, label };
    }

    const skip = (page - 1) * limit;

    const [dbFills, total] = await Promise.all([
      prisma.prescriptionFill.findMany({
        where: { status: { in: fillStatuses } },
        include: {
          prescription: {
            // rxNumber is the human-facing Rx# (e.g. "725366") — must be
            // selected explicitly so QueueTable can display it instead of
            // the row UUID, which is what techs were seeing before.
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
              item: { select: { name: true, ndc: true } },
              prescriber: { select: { firstName: true, lastName: true } },
            },
          },
          item: { select: { name: true, ndc: true } },
          verifier: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.prescriptionFill.count({
        where: { status: { in: fillStatuses } },
      }),
    ]);

    const fills: QueueFill[] = dbFills.map((f: any) => {
      const patient = f.prescription?.patient;
      const patientName = patient
        ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
        : "Unknown";

      const phone = patient?.phoneNumbers?.[0]?.number || null;

      const itemName =
        f.item?.name || f.prescription?.item?.name || "Unknown";

      const pharmacist = f.verifier
        ? `${f.verifier.firstName || ""} ${f.verifier.lastName || ""}`.trim()
        : null;

      return {
        fillId: f.id,
        // Display the pharmacy-facing Rx# (e.g. "725366"), not the row UUID.
        rxId: f.prescription?.rxNumber || "—",
        patientName,
        phone,
        itemName,
        status: f.status,
        fillDate: f.filledAt?.toISOString() || f.createdAt?.toISOString() || null,
        quantity: f.quantity ? Number(f.quantity) : 0,
        daysSupply: f.daysSupply || null,
        tags: [], // TODO: implement local tag support via entity_tags
        method: (f.metadata as any)?.deliveryMethod || null,
        pharmacist,
        binLocation: f.binLocation || null,
      };
    });

    return { fills, total, drxStatus: status, label };
  } catch (e) {
    console.error(`[Queue] Error fetching local fills for "${status}":`, e);
    return { fills: [], total: 0, drxStatus: status, label };
  }
}

async function getRefillRenewals(page: number, limit: number, label: string) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.refillRequest.findMany({
        where: { status: "pending" },
        include: {
          prescription: {
            include: {
              patient: { select: { firstName: true, lastName: true } },
              item: { select: { name: true, ndc: true } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.refillRequest.count({ where: { status: "pending" } }),
    ]);

    const fills: QueueFill[] = requests.map((r: any) => ({
      fillId: r.id,
      // Show the pharmacy-facing Rx# rather than the UUID.
      rxId: r.prescription?.rxNumber || "—",
      patientName: r.prescription?.patient
        ? `${r.prescription.patient.firstName} ${r.prescription.patient.lastName}`
        : "Unknown",
      phone: null,
      itemName: r.prescription?.item?.name || "Unknown",
      status: "Renewal Pending",
      fillDate: r.requestedAt?.toISOString() || null,
      quantity: 0,
      daysSupply: null,
      tags: [],
      method: null,
      pharmacist: null,
      binLocation: null,
    }));

    return { fills, total, drxStatus: "renewals", label };
  } catch {
    return { fills: [], total: 0, drxStatus: "renewals", label };
  }
}
