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

            const patient = drx.patient as any;
            const patientName = patient
              ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim()
              : "Unknown";

            // Phone: first phone number from patient record
            let phone: string | null = null;
            if (patient?.phone_numbers && Array.isArray(patient.phone_numbers) && patient.phone_numbers.length > 0) {
              phone = patient.phone_numbers[0].number || null;
            }

            // Tags: DRX may have prescription_fill_tags on the fill or top-level drx object
            const rawTags =
              (fill as any).prescription_fill_tags ||
              (fill as any).tags ||
              (drx as any).prescription_fill_tags ||
              (drx as any).tags ||
              [];
            const tags: string[] = Array.isArray(rawTags)
              ? rawTags.map((t: any) => (typeof t === "string" ? t : t?.name || t?.tag || t?.prescription_fill_tag?.name || "")).filter(Boolean)
              : [];

            // Method: DRX uses delivery_method_override on fill, or delivery_method on patient
            const method: string | null =
              (fill as any).delivery_method_override ||
              (fill as any).delivery_method ||
              patient?.delivery_method ||
              null;

            fills.push({
              fillId: String(fill.id),
              rxId: drx.prescription?.id ? String(drx.prescription.id) : "—",
              patientName,
              phone,
              itemName: drx.dispensed_item?.name || "Unknown",
              status: fill.status || drxStatus,
              fillDate: fill.fill_date || fill.created_at || null,
              quantity: fill.dispensed_quantity || 0,
              daysSupply: fill.days_supply || null,
              tags,
              method,
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
        orderBy: { requestedAt: "desc" },
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
