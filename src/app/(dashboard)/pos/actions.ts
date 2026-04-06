"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getTransactions({
  search = "",
  page = 1,
  limit = 25,
}: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.PosTransactionWhereInput = {};

  if (search) {
    where.OR = [
      { patient: { lastName: { contains: search, mode: "insensitive" } } },
      { patient: { firstName: { contains: search, mode: "insensitive" } } },
      { cardLastFour: { contains: search } },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.posTransaction.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        cashier: { select: { firstName: true, lastName: true } },
        lineItems: {
          include: {
            item: { select: { name: true } },
            fill: { select: { fillNumber: true, prescription: { select: { rxNumber: true } } } },
          },
        },
        _count: { select: { lineItems: true } },
      },
      orderBy: { processedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.posTransaction.count({ where }),
  ]);

  return { transactions, total, pages: Math.ceil(total / limit), page };
}

export async function getSessions({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.posSession.findMany({
      include: {
        opener: { select: { firstName: true, lastName: true } },
        closer: { select: { firstName: true, lastName: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { openedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.posSession.count(),
  ]);

  return { sessions, total, pages: Math.ceil(total / limit), page };
}

export async function getPosStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayTxns, todayTotal, activeSessions] = await Promise.all([
    prisma.posTransaction.count({ where: { processedAt: { gte: today } } }),
    prisma.posTransaction.aggregate({
      where: { processedAt: { gte: today } },
      _sum: { total: true },
    }),
    prisma.posSession.count({ where: { status: "open" } }),
  ]);

  return {
    todayTransactions: todayTxns,
    todayRevenue: Number(todayTotal._sum.total || 0),
    activeSessions,
  };
}
