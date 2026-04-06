"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

interface BlockedNumber {
  phone: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

// ═══════════════════════════════════════════════
// BLOCKED NUMBERS
// ═══════════════════════════════════════════════

export async function getBlockedNumbers() {
  const user = await getCurrentUser();
  const storeId = (user as any)?.storeId;
  if (!storeId) throw new Error("Unauthorized");

  const setting = await prisma.storeSetting.findUnique({
    where: {
      storeId_settingKey: {
        storeId,
        settingKey: "blocked_phone_numbers",
      },
    },
  });

  if (!setting) return [];

  try {
    return JSON.parse(setting.settingValue) as BlockedNumber[];
  } catch {
    return [];
  }
}

export async function blockNumber(phone: string, reason: string) {
  const user = await getCurrentUser();
  const storeId = (user as any)?.storeId;
  if (!storeId) throw new Error("Unauthorized");

  // Normalize phone number (remove non-digits)
  const normalizedPhone = phone.replace(/\D/g, "");
  if (normalizedPhone.length < 10) {
    throw new Error("Invalid phone number");
  }

  const blockedNumbers = await getBlockedNumbers();

  // Check if already blocked
  if (blockedNumbers.some((b) => b.phone === normalizedPhone)) {
    throw new Error("This number is already blocked");
  }

  if (!user) throw new Error("User not found");

  const newBlockedNumber: BlockedNumber = {
    phone: normalizedPhone,
    reason,
    blockedAt: new Date().toISOString(),
    blockedBy: user.id,
  };

  const updated = [...blockedNumbers, newBlockedNumber];

  await prisma.storeSetting.upsert({
    where: {
      storeId_settingKey: {
        storeId,
        settingKey: "blocked_phone_numbers",
      },
    },
    create: {
      storeId,
      settingKey: "blocked_phone_numbers",
      settingValue: JSON.stringify(updated),
      settingType: "json",
      updatedBy: user!.id,
    },
    update: {
      settingValue: JSON.stringify(updated),
      updatedBy: user!.id,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/settings/blocked-numbers");
}

export async function unblockNumber(phone: string) {
  const user = await getCurrentUser();
  const storeId = (user as any)?.storeId;
  if (!storeId) throw new Error("Unauthorized");

  const normalizedPhone = phone.replace(/\D/g, "");
  const blockedNumbers = await getBlockedNumbers();

  const updated = blockedNumbers.filter((b) => b.phone !== normalizedPhone);

  await prisma.storeSetting.update({
    where: {
      storeId_settingKey: {
        storeId,
        settingKey: "blocked_phone_numbers",
      },
    },
    data: {
      settingValue: JSON.stringify(updated),
      updatedBy: user!.id,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/settings/blocked-numbers");
}
