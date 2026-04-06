"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function signOffBatch(
  batchId: string,
  role: "compounder" | "verifier",
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (role === "compounder") {
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          compoundedAt: new Date(),
          status: "completed",
        },
      });
    } else if (role === "verifier") {
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          verifiedBy: userId,
          verifiedAt: new Date(),
          status: "verified",
        },
      });
    }

    revalidatePath(`/compounding/batches/${batchId}`);
    return { success: true };
  } catch (error) {
    console.error("Error signing off batch:", error);
    return {
      success: false,
      error: "Failed to sign off batch",
    };
  }
}

export async function releaseBatch(
  batchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    if (!batch.compoundedAt || !batch.verifiedAt) {
      return {
        success: false,
        error: "Batch must be signed off by both compounder and verifier before release",
      };
    }

    await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "released",
      },
    });

    revalidatePath(`/compounding/batches/${batchId}`);
    return { success: true };
  } catch (error) {
    console.error("Error releasing batch:", error);
    return {
      success: false,
      error: "Failed to release batch",
    };
  }
}

export async function getBatchStats(): Promise<{
  total: number;
  inProgress: number;
  completed: number;
  verified: number;
  released: number;
}> {
  const [total, inProgress, completed, verified, released] = await Promise.all([
    prisma.batch.count(),
    prisma.batch.count({ where: { status: "in_progress" } }),
    prisma.batch.count({ where: { status: "completed" } }),
    prisma.batch.count({ where: { status: "verified" } }),
    prisma.batch.count({ where: { status: "released" } }),
  ]);

  return {
    total,
    inProgress,
    completed,
    verified,
    released,
  };
}
