"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── SEARCH SIG CODES ──────────────────────
// Used by the autocomplete in the Rx entry form

export async function searchSigCodes(query: string, limit = 20) {
  if (!query || query.length < 1) {
    // Return most popular active codes
    const codes = await prisma.sigCode.findMany({
      where: { isActive: true },
      orderBy: [{ usageCount: "desc" }, { sortOrder: "asc" }],
      take: limit,
    });
    return codes;
  }

  const q = query.trim();

  // Search by code prefix OR expansion text
  const codes = await prisma.sigCode.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { startsWith: q.toUpperCase(), mode: "insensitive" } },
        { expansion: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ usageCount: "desc" }, { sortOrder: "asc" }],
    take: limit,
  });

  return codes;
}

// ─── GET ALL SIG CODES (for management page) ──

export async function getSigCodes({
  search = "",
  category = "",
  showInactive = false,
}: {
  search?: string;
  category?: string;
  showInactive?: boolean;
} = {}) {
  const where: Record<string, unknown> = {};

  if (!showInactive) {
    where.isActive = true;
  }

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { expansion: { contains: search, mode: "insensitive" } },
    ];
  }

  const codes = await prisma.sigCode.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
  });

  return codes;
}

// ─── GET CATEGORIES ────────────────────────

export async function getSigCategories() {
  const result = await prisma.sigCode.groupBy({
    by: ["category"],
    _count: { id: true },
    orderBy: { category: "asc" },
  });

  return result.map((r) => ({ category: r.category, count: r._count.id }));
}

// ─── CREATE SIG CODE ───────────────────────

export async function createSigCode(data: {
  code: string;
  expansion: string;
  category: string;
  route?: string;
  frequency?: string;
}) {
  const existing = await prisma.sigCode.findUnique({
    where: { code: data.code.toUpperCase().trim() },
  });

  if (existing) {
    throw new Error(`Sig code "${data.code}" already exists`);
  }

  const sigCode = await prisma.sigCode.create({
    data: {
      code: data.code.toUpperCase().trim(),
      expansion: data.expansion.trim(),
      category: data.category,
      route: data.route?.toUpperCase().trim() || null,
      frequency: data.frequency?.toUpperCase().trim() || null,
      isCustom: true,
    },
  });

  revalidatePath("/prescriptions/sig-codes");
  return sigCode;
}

// ─── UPDATE SIG CODE ───────────────────────

export async function updateSigCode(
  id: string,
  data: {
    code?: string;
    expansion?: string;
    category?: string;
    route?: string;
    frequency?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  if (data.code) {
    const existing = await prisma.sigCode.findFirst({
      where: { code: data.code.toUpperCase().trim(), NOT: { id } },
    });
    if (existing) {
      throw new Error(`Sig code "${data.code}" already exists`);
    }
  }

  const sigCode = await prisma.sigCode.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code.toUpperCase().trim() }),
      ...(data.expansion && { expansion: data.expansion.trim() }),
      ...(data.category && { category: data.category }),
      ...(data.route !== undefined && { route: data.route?.toUpperCase().trim() || null }),
      ...(data.frequency !== undefined && { frequency: data.frequency?.toUpperCase().trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  revalidatePath("/prescriptions/sig-codes");
  return sigCode;
}

// ─── DELETE SIG CODE ───────────────────────

export async function deleteSigCode(id: string) {
  await prisma.sigCode.delete({ where: { id } });
  revalidatePath("/prescriptions/sig-codes");
}

// ─── INCREMENT USAGE (called when a sig code is selected) ──

export async function incrementSigCodeUsage(id: string) {
  await prisma.sigCode.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}
