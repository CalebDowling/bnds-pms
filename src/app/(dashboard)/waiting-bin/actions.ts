"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

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
  const fills = await prisma.prescriptionFill.findMany({
    where: {
      metadata: {
        path: ["waitingBin"],
        not: Prisma.DbNull,
      },
    },
    include: {
      prescription: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
          item: { select: { name: true } },
          formula: { select: { name: true } },
        },
      },
    },
  });

  const items: WaitingBinItem[] = fills
    .map((fill) => {
      const metadata = fill.metadata as Record<string, any>;
      const waitingBinData = metadata?.waitingBin;

      if (!waitingBinData) return null;

      const dateAdded = new Date(waitingBinData.dateAdded);
      const daysInBin = Math.floor((new Date().getTime() - dateAdded.getTime()) / (1000 * 60 * 60 * 24));

      let statusColor: "green" | "yellow" | "red" = "green";
      if (daysInBin > 14) statusColor = "red";
      else if (daysInBin >= 7) statusColor = "yellow";

      const patient = fill.prescription.patient
        ? `${fill.prescription.patient.firstName} ${fill.prescription.patient.lastName}`
        : "Unknown";

      const drug = fill.prescription.item?.name || fill.prescription.formula?.name || "Unknown";

      return {
        id: fill.id,
        binLocation: waitingBinData.location,
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
