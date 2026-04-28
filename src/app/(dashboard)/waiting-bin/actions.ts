"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  formatPatientName,
  formatItemDisplayName,
  formatDrugWithStrength,
} from "@/lib/utils/formatters";

export interface WaitingBinItem {
  id: string;
  binLocation: string;
  patient: string;
  rxNumber: string;
  drug: string;
  dateAdded: Date;
  daysInBin: number;
  status: "in_bin" | "picked_up" | "returned_to_stock";
  statusColor: "green" | "yellow" | "red";
}

export interface WaitingBinStats {
  totalInBin: number;
  overdue: number;
  addedToday: number;
  pickedUpToday: number;
}

// ═══════════════════════════════════════════════
// WAITING BIN ITEMS
// ═══════════════════════════════════════════════

export async function getWaitingBinItems({
  sortBy = "binLocation",
  searchTerm = "",
}: {
  sortBy?: "binLocation" | "patientName" | "daysInBin";
  searchTerm?: string;
} = {}) {
  // Canonical filter: status = 'waiting_bin'. Previously this query
  // filtered on `metadata.waitingBin` IS NOT NULL, which silently hid
  // every fill that didn't go through the modern Save-Bin path. Result
  // (caught in the 04/28 walkthrough): the dashboard sidebar reported
  // "18 in Waiting Bin", /pickup showed 14 cards, but /waiting-bin
  // rendered "No items in waiting bin". Three views, three counts.
  //
  // Now every view agrees on `status = 'waiting_bin'`. Enrichment
  // (dateAdded, location) falls through metadata.waitingBin (modern
  // path) → fill.binLocation + fill.verifiedAt (legacy / DRX) →
  // fill.createdAt as a last resort. We never drop a row just because
  // its enrichment is incomplete.
  const fills = await prisma.prescriptionFill.findMany({
    where: { status: "waiting_bin" },
    include: {
      prescription: {
        include: {
          patient: { select: { firstName: true, lastName: true, middleName: true } },
          item: {
            select: { name: true, genericName: true, brandName: true, ndc: true, strength: true },
          },
          formula: { select: { name: true } },
        },
      },
      item: {
        select: { name: true, genericName: true, brandName: true, ndc: true, strength: true },
      },
    },
  });

  const items: WaitingBinItem[] = fills
    .map((fill) => {
      const metadata = fill.metadata as Record<string, any> | null;
      const waitingBinData = metadata?.waitingBin ?? null;

      // dateAdded resolution chain: modern metadata → verifiedAt
      // (legacy fills that hit verify but never had Save Bin clicked)
      // → filledAt → createdAt. Same chain as /pickup uses for ageMs
      // so the two pages agree on "days in bin".
      const dateAddedSource =
        waitingBinData?.dateAdded ?? fill.verifiedAt ?? fill.filledAt ?? fill.createdAt;
      const dateAdded = new Date(dateAddedSource);
      const daysInBin = Math.floor(
        (new Date().getTime() - dateAdded.getTime()) / (1000 * 60 * 60 * 24)
      );

      let statusColor: "green" | "yellow" | "red" = "green";
      if (daysInBin > 14) statusColor = "red";
      else if (daysInBin >= 7) statusColor = "yellow";

      // formatPatientName cleans DRX import artifacts ("- white" suffix
      // and "*SP**GROUP*" markers) and title-cases the all-caps DRX
      // values. Without this, the cashier sees "BRIDGET RICHIE-WHITE"
      // and similar legacy-import noise on the waiting-bin row.
      const patient = formatPatientName(fill.prescription.patient) || "Unknown";

      // Drug name: route through formatItemDisplayName so the fallback
      // chain (name → genericName → brandName → NDC → Unknown drug)
      // matches /pickup and /prescriptions exactly. formatDrugWithStrength
      // appends the strength when it's not already embedded in the name.
      const itemForDisplay = fill.item ?? fill.prescription.item ?? null;
      const drug = itemForDisplay
        ? formatDrugWithStrength(
            formatItemDisplayName(itemForDisplay),
            (fill.item as { strength?: string | null } | null)?.strength
              ?? (fill.prescription.item as { strength?: string | null } | null)?.strength
          )
        : (fill.prescription.formula?.name || "Unknown drug");

      // binLocation resolution: modern metadata → fill.binLocation
      // column (set by Save Bin pre-metadata) → "—". Never throw away
      // the row just because the location is missing — the operator
      // still needs to see "this Rx is somewhere in the bin and is N
      // days old, please figure out where" rather than "no items".
      const binLocation =
        waitingBinData?.location ?? fill.binLocation ?? "—";

      return {
        id: fill.id,
        binLocation,
        patient,
        rxNumber: fill.prescription.rxNumber,
        drug,
        dateAdded,
        daysInBin,
        status: "in_bin" as const,
        statusColor,
      };
    })
    .filter((item) => item !== null) as WaitingBinItem[];

  // Filter by search term
  let filtered = items;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = items.filter(
      (item) =>
        item.patient.toLowerCase().includes(term) || item.rxNumber.includes(term)
    );
  }

  // Sort
  const sorted = [...filtered];
  if (sortBy === "binLocation") {
    sorted.sort((a, b) => a.binLocation.localeCompare(b.binLocation));
  } else if (sortBy === "patientName") {
    sorted.sort((a, b) => a.patient.localeCompare(b.patient));
  } else if (sortBy === "daysInBin") {
    sorted.sort((a, b) => b.daysInBin - a.daysInBin);
  }

  return sorted;
}

// ═══════════════════════════════════════════════
// WAITING BIN STATS
// ═══════════════════════════════════════════════

export async function getWaitingBinStats(): Promise<WaitingBinStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = await getWaitingBinItems();

  const totalInBin = items.length;
  const overdue = items.filter((item) => item.daysInBin > 14).length;

  // Count items added today
  const addedToday = items.filter((item) => {
    const itemDate = new Date(item.dateAdded);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.getTime() === today.getTime();
  }).length;

  // Count items picked up today (from status logs)
  const pickedUpToday = await prisma.fillEvent.count({
    where: {
      eventType: "bin_removed",
      createdAt: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
    totalInBin,
    overdue,
    addedToday,
    pickedUpToday,
  };
}

// ═══════════════════════════════════════════════
// ADD/REMOVE FROM BIN
// ═══════════════════════════════════════════════

export async function addToBin(fillId: string, binLocation: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const fill = await prisma.prescriptionFill.findUnique({ where: { id: fillId } });
  if (!fill) throw new Error("Prescription fill not found");

  // Validate bin location format
  if (!/^[A-Z]\d+$/.test(binLocation)) {
    throw new Error("Invalid bin location format (use A1, B2, Z99, etc.)");
  }

  const metadata = fill.metadata as Record<string, any>;
  const updatedMetadata = {
    ...metadata,
    waitingBin: {
      location: binLocation,
      dateAdded: new Date().toISOString(),
      addedBy: user.id,
    },
  };

  await Promise.all([
    prisma.prescriptionFill.update({
      where: { id: fillId },
      data: { metadata: updatedMetadata },
    }),
    prisma.fillEvent.create({
      data: {
        fillId,
        eventType: "bin_added",
        toValue: binLocation,
        performedBy: user.id,
      },
    }),
  ]);

  revalidatePath("/waiting-bin");
}

export async function removeFromBin(fillId: string, reason: "pickup" | "return_to_stock") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const fill = await prisma.prescriptionFill.findUnique({ where: { id: fillId } });
  if (!fill) throw new Error("Prescription fill not found");

  const metadata = fill.metadata as Record<string, any>;
  const wasBinLocation = metadata?.waitingBin?.location;

  const updatedMetadata = {
    ...metadata,
    waitingBin: null,
  };

  await Promise.all([
    prisma.prescriptionFill.update({
      where: { id: fillId },
      data: { metadata: updatedMetadata },
    }),
    prisma.fillEvent.create({
      data: {
        fillId,
        eventType: "bin_removed",
        fromValue: wasBinLocation || "unknown",
        toValue: reason === "pickup" ? "picked_up" : "returned_to_stock",
        performedBy: user.id,
        notes: reason === "pickup" ? "Patient picked up" : "Returned to stock",
      },
    }),
  ]);

  revalidatePath("/waiting-bin");
}
