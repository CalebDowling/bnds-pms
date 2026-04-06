"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getStoreSettings() {
  await requireUser();

  const store = await prisma.store.findFirst({
    include: { settings: true },
  });

  return store;
}

export async function updateStore(data: {
  name?: string;
  npi?: string;
  dea?: string;
  stateLicense?: string;
  phone?: string;
  fax?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  timezone?: string;
}) {
  await requireUser();

  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store configured");

  await prisma.store.update({
    where: { id: store.id },
    data,
  });

  revalidatePath("/settings");
}

export async function getStoreSetting(key: string) {
  const store = await prisma.store.findFirst();
  if (!store) return null;

  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId: store.id, settingKey: key } },
  });

  return setting?.settingValue ?? null;
}

export async function updateStoreSetting(key: string, value: string) {
  const user = await requireUser();

  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store configured");

  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId: store.id, settingKey: key } },
    update: { settingValue: value, updatedBy: user.id },
    create: {
      storeId: store.id,
      settingKey: key,
      settingValue: value,
      updatedBy: user.id,
    },
  });

  revalidatePath("/settings");
}
