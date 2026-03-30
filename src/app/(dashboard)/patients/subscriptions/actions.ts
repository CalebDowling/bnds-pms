"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type SubscriptionEntry = {
  prescriptionId: string;
  interval: "30" | "60" | "90";
  isActive: boolean;
  enrolledAt: string;
  lastRefillDate?: string;
  nextRefillDate?: string;
};

export type SubscriptionRow = {
  id: string;
  patientId: string;
  patientName: string;
  drugName: string;
  strength?: string;
  interval: "30" | "60" | "90";
  status: "ACTIVE" | "PAUSED";
  lastRefillDate?: string;
  nextRefillDate?: string;
  prescriptionId: string;
};

export type SubscriptionStats = {
  activeCount: number;
  enrolledPatients: number;
  dueThisWeek: number;
};

export type ProcessRefillResult = {
  success: boolean;
  fillsCreated: number;
  errors: string[];
};

/**
 * Get all subscriptions with patient and prescription data.
 */
export async function getSubscriptions({
  search = "",
  status = "all", // all | active | paused
  sortBy = "patient", // patient | next_refill | drug
}: {
  search?: string;
  status?: string;
  sortBy?: string;
} = {}): Promise<SubscriptionRow[]> {
  await requireUser();

  const patients = await prisma.patient.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrn: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      metadata: true,
      prescriptions: {
        select: {
          id: true,
          item: { select: { name: true, strength: true } },
          formula: { select: { name: true } },
        },
      },
    },
  });

  const rows: SubscriptionRow[] = [];

  for (const patient of patients) {
    const subscriptions = (patient.metadata?.subscriptions as SubscriptionEntry[] | undefined) || [];

    for (const sub of subscriptions) {
      // Find the prescription data
      const prescription = patient.prescriptions.find((p) => p.id === sub.prescriptionId);
      if (!prescription) continue;

      const drugName = prescription.item?.name || prescription.formula?.name || "Compound";
      const strength = prescription.item?.strength;

      // Filter by status
      if (status === "active" && !sub.isActive) continue;
      if (status === "paused" && sub.isActive) continue;

      rows.push({
        id: `${patient.id}-${sub.prescriptionId}`,
        patientId: patient.id,
        patientName: `${patient.lastName}, ${patient.firstName}`,
        drugName,
        strength,
        interval: sub.interval,
        status: sub.isActive ? "ACTIVE" : "PAUSED",
        lastRefillDate: sub.lastRefillDate,
        nextRefillDate: sub.nextRefillDate,
        prescriptionId: sub.prescriptionId,
      });
    }
  }

  // Sort
  if (sortBy === "patient") {
    rows.sort((a, b) => a.patientName.localeCompare(b.patientName));
  } else if (sortBy === "next_refill") {
    rows.sort((a, b) => {
      const dateA = a.nextRefillDate ? new Date(a.nextRefillDate) : new Date(9999, 11, 31);
      const dateB = b.nextRefillDate ? new Date(b.nextRefillDate) : new Date(9999, 11, 31);
      return dateA.getTime() - dateB.getTime();
    });
  } else if (sortBy === "drug") {
    rows.sort((a, b) => a.drugName.localeCompare(b.drugName));
  }

  return rows;
}

/**
 * Enroll a prescription in a subscription.
 */
export async function enrollSubscription(
  patientId: string,
  prescriptionId: string,
  interval: "30" | "60" | "90"
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();

  try {
    // Verify prescription exists and belongs to patient
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: { patientId: true },
    });

    if (!prescription || prescription.patientId !== patientId) {
      return { success: false, error: "Prescription not found or does not belong to patient" };
    }

    // Get patient and update subscriptions in metadata
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { metadata: true },
    });

    if (!patient) {
      return { success: false, error: "Patient not found" };
    }

    const subscriptions = (patient.metadata?.subscriptions as SubscriptionEntry[] | undefined) || [];

    // Check if already subscribed
    if (subscriptions.some((s) => s.prescriptionId === prescriptionId)) {
      return { success: false, error: "Prescription is already subscribed" };
    }

    // Calculate next refill date
    const today = new Date();
    const nextRefillDate = new Date(today);
    const intervalDays = parseInt(interval);
    nextRefillDate.setDate(nextRefillDate.getDate() + intervalDays);

    // Add new subscription
    const newSubscription: SubscriptionEntry = {
      prescriptionId,
      interval,
      isActive: true,
      enrolledAt: today.toISOString(),
      nextRefillDate: nextRefillDate.toISOString(),
    };

    subscriptions.push(newSubscription);

    // Update patient metadata
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        metadata: {
          ...patient.metadata,
          subscriptions,
        },
      },
    });

    revalidatePath("/patients/subscriptions");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Cancel a subscription by setting isActive to false.
 */
export async function cancelSubscription(
  patientId: string,
  prescriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { metadata: true },
    });

    if (!patient) {
      return { success: false, error: "Patient not found" };
    }

    const subscriptions = (patient.metadata?.subscriptions as SubscriptionEntry[] | undefined) || [];
    const subscription = subscriptions.find((s) => s.prescriptionId === prescriptionId);

    if (!subscription) {
      return { success: false, error: "Subscription not found" };
    }

    // Mark as inactive
    subscription.isActive = false;

    // Update patient metadata
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        metadata: {
          ...patient.metadata,
          subscriptions,
        },
      },
    });

    revalidatePath("/patients/subscriptions");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get subscription statistics.
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  await requireUser();

  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  let activeCount = 0;
  let enrolledPatients = new Set<string>();
  let dueThisWeek = 0;

  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      metadata: true,
    },
  });

  for (const patient of patients) {
    const subscriptions = (patient.metadata?.subscriptions as SubscriptionEntry[] | undefined) || [];

    for (const sub of subscriptions) {
      if (sub.isActive) {
        activeCount++;
        enrolledPatients.add(patient.id);

        // Check if due within 7 days
        if (sub.nextRefillDate) {
          const nextDate = new Date(sub.nextRefillDate);
          if (nextDate <= weekFromNow) {
            dueThisWeek++;
          }
        }
      }
    }
  }

  return {
    activeCount,
    enrolledPatients: enrolledPatients.size,
    dueThisWeek,
  };
}

/**
 * Process upcoming subscriptions - create PrescriptionFill records for those due today.
 */
export async function processUpcomingSubscriptions(): Promise<ProcessRefillResult> {
  const user = await requireUser();

  const result: ProcessRefillResult = {
    success: true,
    fillsCreated: 0,
    errors: [],
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      metadata: true,
    },
  });

  for (const patient of patients) {
    const subscriptions = (patient.metadata?.subscriptions as SubscriptionEntry[] | undefined) || [];

    for (const sub of subscriptions) {
      // Skip inactive subscriptions
      if (!sub.isActive) continue;

      // Check if due today or earlier
      const nextDate = sub.nextRefillDate ? new Date(sub.nextRefillDate) : null;
      if (!nextDate || nextDate > now) continue;

      try {
        // Get prescription details
        const prescription = await prisma.prescription.findUnique({
          where: { id: sub.prescriptionId },
          include: {
            fills: {
              orderBy: { fillNumber: "desc" },
              take: 1,
              select: { fillNumber: true },
            },
          },
        });

        if (!prescription) {
          result.errors.push(`Prescription ${sub.prescriptionId} not found`);
          continue;
        }

        // Check prescription can be filled
        if (prescription.refillsRemaining <= 0) {
          result.errors.push(`Prescription ${prescription.rxNumber} has no refills remaining`);
          continue;
        }

        if (prescription.expirationDate && new Date(prescription.expirationDate) < now) {
          result.errors.push(`Prescription ${prescription.rxNumber} is expired`);
          continue;
        }

        // Create fill
        const nextFillNumber = (prescription.fills[0]?.fillNumber || 0) + 1;

        await prisma.$transaction([
          prisma.prescriptionFill.create({
            data: {
              prescriptionId: sub.prescriptionId,
              fillNumber: nextFillNumber,
              quantity: prescription.quantityPrescribed || 0,
              daysSupply: prescription.daysSupply,
              status: "pending",
            },
          }),
          prisma.prescription.update({
            where: { id: sub.prescriptionId },
            data: {
              refillsRemaining: { decrement: 1 },
              status: "intake",
            },
          }),
        ]);

        // Update subscription with new dates
        const intervalDays = parseInt(sub.interval);
        const newNextDate = new Date(nextDate);
        newNextDate.setDate(newNextDate.getDate() + intervalDays);

        sub.lastRefillDate = now.toISOString();
        sub.nextRefillDate = newNextDate.toISOString();

        result.fillsCreated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Error processing subscription: ${message}`);
        result.success = false;
      }
    }

    // Save updated subscriptions back to metadata
    try {
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          metadata: {
            ...patient.metadata,
            subscriptions,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Error updating patient metadata: ${message}`);
      result.success = false;
    }
  }

  revalidatePath("/patients/subscriptions");
  revalidatePath("/queue");
  revalidatePath("/refills");

  return result;
}

/**
 * Get active prescriptions for a patient (for enrollment).
 */
export async function getPatientPrescriptions(patientId: string): Promise<
  Array<{
    id: string;
    rxNumber: string;
    drugName: string;
    strength?: string;
    isSubscribed: boolean;
  }>
> {
  await requireUser();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      metadata: true,
      prescriptions: {
        where: {
          status: { in: ["active", "on_hold", "ready", "verified", "dispensed"] },
        },
        select: {
          id: true,
          rxNumber: true,
          item: { select: { name: true, strength: true } },
          formula: { select: { name: true } },
        },
      },
    },
  });

  if (!patient) return [];

  const subscriptions = (patient.metadata?.subscriptions as SubscriptionEntry[] | undefined) || [];
  const subscribedIds = new Set(subscriptions.map((s) => s.prescriptionId));

  return patient.prescriptions.map((rx) => ({
    id: rx.id,
    rxNumber: rx.rxNumber,
    drugName: rx.item?.name || rx.formula?.name || "Compound",
    strength: rx.item?.strength,
    isSubscribed: subscribedIds.has(rx.id),
  }));
}
