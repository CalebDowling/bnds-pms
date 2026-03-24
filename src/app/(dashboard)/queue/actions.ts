"use server";

/**
 * Queue Actions — fetches fills live from DRX API by status.
 * Used by the /queue page when clicking a queue item from the dashboard.
 */

// Map QueueBar status keys → DRX API status filter values
const STATUS_TO_DRX: Record<string, string> = {
  intake: "Pre-Check",
  sync: "Adjudicating",
  reject: "Rejected",
  print: "Print",
  scan: "Scan",
  verify: "Verify",
  oos: "OOS",
  waiting_bin: "Waiting Bin",
  price_check: "price check",
  prepay: "prepay",
  ok_to_charge: "ok to charge",
  decline: "Decline",
  ok_to_charge_clinic: "ok to charge clinic",
  mochi: "mochi",
};

// Friendly labels for each queue
export const QUEUE_LABELS: Record<string, string> = {
  intake: "Intake",
  sync: "Sync",
  reject: "Reject",
  print: "Print",
  scan: "Scan",
  verify: "Verify",
  oos: "Out of Stock",
  waiting_bin: "Waiting Bin",
  renewals: "Renewals",
  todo: "Todo",
  price_check: "Price Check",
  prepay: "Prepay",
  ok_to_charge: "OK to Charge",
  decline: "Decline",
  ok_to_charge_clinic: "OK to Charge Clinic",
  mochi: "Mochi",
};

export interface QueueFill {
  fillId: string;
  rxId: string;
  patientName: string;
  itemName: string;
  ndc: string | null;
  status: string;
  fillDate: string | null;
  quantity: number;
  daysSupply: number | null;
  refillNumber: number;
  pharmacist: string | null;
  binLocation: string | null;
}

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
  const drxStatus = STATUS_TO_DRX[status];
  const label = QUEUE_LABELS[status] || status;

  // Renewals come from our DB, not DRX
  if (status === "renewals") {
    return getRefillRenewals(page, limit, label);
  }

  // Todo is DRX-internal, not exposed via API
  if (status === "todo") {
    return { fills: [], total: 0, drxStatus: "todo", label };
  }

  if (!drxStatus) {
    return { fills: [], total: 0, drxStatus: status, label };
  }

  try {
    const drxClient = await import("@/lib/drx/client");

    // Get total count + one page of fills in parallel
    const offset = (page - 1) * limit;
    const fills: QueueFill[] = [];

    const [total] = await Promise.all([
      drxClient.fetchFillCountByStatus(drxStatus),
      drxClient.fetchAllPages(
        "/prescription-fills",
        limit,
        async (batch: any[]) => {
          for (const drx of batch) {
            const fill = drx.fill;
            if (!fill?.id) continue;

            const patientName = drx.patient
              ? `${(drx.patient as any).first_name || ""} ${(drx.patient as any).last_name || ""}`.trim()
              : "Unknown";

            fills.push({
              fillId: String(fill.id),
              rxId: drx.prescription?.id ? String(drx.prescription.id) : "—",
              patientName,
              itemName: drx.dispensed_item?.name || "Unknown",
              ndc: drx.dispensed_item?.ndc || null,
              status: fill.status || drxStatus,
              fillDate: fill.fill_date || fill.created_at || null,
              quantity: fill.dispensed_quantity || 0,
              daysSupply: fill.days_supply || null,
              refillNumber: fill.refill || 0,
              pharmacist: fill.pharmacist || null,
              binLocation: fill.will_call_location || null,
            });
          }
        },
        { status: drxStatus, offset },
        // Stop after one page — we only need `limit` records
        () => fills.length < limit
      ),
    ]);

    return { fills, total, drxStatus, label };
  } catch (e) {
    console.error(`[Queue] Error fetching ${drxStatus}:`, e);
    return { fills: [], total: 0, drxStatus, label };
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.refillRequest.count({ where: { status: "pending" } }),
    ]);

    const fills: QueueFill[] = requests.map((r: any) => ({
      fillId: r.id,
      rxId: r.prescription?.id ? String(r.prescription.id) : "—",
      patientName: r.prescription?.patient
        ? `${r.prescription.patient.firstName} ${r.prescription.patient.lastName}`
        : "Unknown",
      itemName: r.prescription?.item?.name || "Unknown",
      ndc: r.prescription?.item?.ndc || null,
      status: "Renewal Pending",
      fillDate: r.createdAt?.toISOString() || null,
      quantity: 0,
      daysSupply: null,
      refillNumber: 0,
      pharmacist: null,
      binLocation: null,
    }));

    return { fills, total, drxStatus: "renewals", label };
  } catch {
    return { fills: [], total: 0, drxStatus: "renewals", label };
  }
}
