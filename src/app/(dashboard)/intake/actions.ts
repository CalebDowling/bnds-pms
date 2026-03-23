"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/errors";
import { logCreate, logUpdate } from "@/lib/audit";
import { convertToPrescription } from "@/lib/erx/processor";

// ─── LIST / SEARCH ──────────────────────────

export async function getIntakeQueue({
  search = "",
  status = "",
  source = "",
  sort = "received",
  page = 1,
  limit = 25,
}: {
  search?: string;
  status?: string;
  source?: string;
  sort?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();
  const skip = (page - 1) * limit;

  const where: Prisma.IntakeQueueItemWhereInput = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (source && source !== "all") {
    where.source = source;
  }

  if (search) {
    where.OR = [
      { patientName: { contains: search, mode: "insensitive" } },
      { prescriberName: { contains: search, mode: "insensitive" } },
      { drugName: { contains: search, mode: "insensitive" } },
      { messageId: { contains: search, mode: "insensitive" } },
    ];
  }

  // Determine sort order
  let orderBy: Prisma.IntakeQueueItemOrderByWithRelationInput | Prisma.IntakeQueueItemOrderByWithRelationInput[] = { receivedAt: "desc" };
  if (sort === "priority") {
    orderBy = [
      { priority: "asc" }, // STAT first, then urgent, then normal
      { receivedAt: "desc" },
    ];
  } else if (sort === "patient") {
    orderBy = [
      { patientName: "asc" },
      { receivedAt: "desc" },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.intakeQueueItem.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.intakeQueueItem.count({ where }),
  ]);

  return {
    items,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

// ─── GET STATS BY SOURCE ────────────────────

export async function getIntakeStatsBySource(): Promise<{
  prescriber_portal: number;
  walk_in: number;
  phone: number;
  fax: number;
  erx: number;
  surescripts: number;
  patient_portal: number;
  [key: string]: number;
}> {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  // Get counts for each source
  const items = await prisma.intakeQueueItem.groupBy({
    by: ["source"],
    _count: true,
  });

  // Build result object with default zeros
  const stats: Record<string, number> = {
    prescriber_portal: 0,
    walk_in: 0,
    phone: 0,
    fax: 0,
    erx: 0,
    surescripts: 0,
    patient_portal: 0,
  };

  // Fill in actual counts
  items.forEach((item) => {
    stats[item.source] = item._count;
  });

  return stats;
}

// ─── GET SINGLE ─────────────────────────────

export async function getIntakeItem(id: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  const item = await prisma.intakeQueueItem.findUnique({
    where: { id },
    include: {
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!item) {
    throw new Error(`Intake item not found: ${id}`);
  }

  return item;
}

// ─── ASSIGN ────────────────────────────────

export async function assignIntakeItem(
  id: string,
  userId: string
): Promise<void> {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  // "self" means assign to the current user
  const assignToId = userId === "self" ? user.id : userId;

  try {
    // Verify the user to assign exists
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToId },
    });

    if (!targetUser) {
      throw new Error(`User not found: ${assignToId}`);
    }

    // Verify the intake item exists
    const intakeItem = await prisma.intakeQueueItem.findUnique({
      where: { id },
      select: { assignedTo: true },
    });

    if (!intakeItem) {
      throw new Error(`Intake item not found: ${id}`);
    }

    const oldValues = { assignedTo: intakeItem.assignedTo };

    // Update assignment
    await prisma.intakeQueueItem.update({
      where: { id },
      data: { assignedTo: assignToId },
    });

    // Audit log
    await logUpdate(
      user.id,
      "intake_queue_item",
      id,
      oldValues,
      { assignedTo: assignToId }
    );

    revalidatePath("/intake");
  } catch (error) {
    throw new Error(
      `Failed to assign intake item: ${getErrorMessage(error)}`
    );
  }
}

// ─── UPDATE STATUS ─────────────────────────

export async function updateIntakeStatus(
  id: string,
  newStatus: string,
  notes?: string
): Promise<void> {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  try {
    // Verify status is valid
    const validStatuses = ["pending", "matched", "processing", "complete", "error"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Get current item
    const intakeItem = await prisma.intakeQueueItem.findUnique({
      where: { id },
      select: { status: true, notes: true },
    });

    if (!intakeItem) {
      throw new Error(`Intake item not found: ${id}`);
    }

    const oldValues = {
      status: intakeItem.status,
      notes: intakeItem.notes,
    };

    // Update item
    await prisma.intakeQueueItem.update({
      where: { id },
      data: {
        status: newStatus,
        notes,
      },
    });

    // Audit log
    await logUpdate(
      user.id,
      "intake_queue_item",
      id,
      oldValues,
      { status: newStatus, notes }
    );

    revalidatePath("/intake");
  } catch (error) {
    throw new Error(
      `Failed to update intake status: ${getErrorMessage(error)}`
    );
  }
}

// ─── PROCESS INTAKE ────────────────────────

export async function processIntakeItem(
  id: string,
  data: {
    patientId: string;
    prescriberId: string;
    itemId?: string;
    formulaId?: string;
  }
): Promise<string> {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  try {
    // Verify intake item exists
    const intakeItem = await prisma.intakeQueueItem.findUnique({
      where: { id },
    });

    if (!intakeItem) {
      throw new Error(`Intake item not found: ${id}`);
    }

    // Convert to prescription
    const prescriptionId = await convertToPrescription(id, {
      patientId: data.patientId,
      prescriberId: data.prescriberId,
      itemId: data.itemId,
      formulaId: data.formulaId,
    });

    revalidatePath("/intake");
    revalidatePath("/prescriptions");

    return prescriptionId;
  } catch (error) {
    throw new Error(
      `Failed to process intake item: ${getErrorMessage(error)}`
    );
  }
}

// ─── REJECT ────────────────────────────────

export async function rejectIntakeItem(
  id: string,
  reason: string
): Promise<void> {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  try {
    // Verify item exists
    const intakeItem = await prisma.intakeQueueItem.findUnique({
      where: { id },
      select: { status: true, notes: true },
    });

    if (!intakeItem) {
      throw new Error(`Intake item not found: ${id}`);
    }

    if (!reason || reason.trim() === "") {
      throw new Error("Rejection reason is required");
    }

    const oldValues = {
      status: intakeItem.status,
      notes: intakeItem.notes,
    };

    // Update to rejected status
    const notes = `Rejected: ${reason}`;
    await prisma.intakeQueueItem.update({
      where: { id },
      data: {
        status: "error",
        notes,
      },
    });

    // Audit log
    await logUpdate(
      user.id,
      "intake_queue_item",
      id,
      oldValues,
      { status: "error", notes, rejectedBy: user.id }
    );

    revalidatePath("/intake");
  } catch (error) {
    throw new Error(
      `Failed to reject intake item: ${getErrorMessage(error)}`
    );
  }
}

// ─── STATS ────────────────────────────────

export async function getIntakeStats(): Promise<{
  pending: number;
  matched: number;
  processing: number;
  complete: number;
  error: number;
}> {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await requireUser();

  const [pending, matched, processing, complete, error] = await Promise.all([
    prisma.intakeQueueItem.count({ where: { status: "pending" } }),
    prisma.intakeQueueItem.count({ where: { status: "matched" } }),
    prisma.intakeQueueItem.count({ where: { status: "processing" } }),
    prisma.intakeQueueItem.count({ where: { status: "complete" } }),
    prisma.intakeQueueItem.count({ where: { status: "error" } }),
  ]);

  return {
    pending,
    matched,
    processing,
    complete,
    error,
  };
}
