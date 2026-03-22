"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseIPAllowlist,
  serializeIPAllowlist,
} from "@/lib/security/ip-allowlist";

export async function getIPAllowlist() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  // Get user's store from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || !dbUser.storeId) {
    throw new Error("Store not found");
  }

  const store = await prisma.store.findUnique({
    where: { id: dbUser.storeId },
  });

  if (!store) throw new Error("Store not found");

  const setting = await prisma.storeSetting.findUnique({
    where: {
      storeId_settingKey: {
        storeId: store.id,
        settingKey: "ip_allowlist",
      },
    },
  });

  const { ips, enabled } = parseIPAllowlist(setting?.settingValue || "{}");

  return {
    ips,
    enabled,
  };
}

export async function updateIPAllowlist(
  ips: string[],
  enabled: boolean,
  storeId?: string
) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || !dbUser.storeId) {
    throw new Error("Store not found");
  }

  const userStore = await prisma.store.findUnique({
    where: { id: dbUser.storeId },
  });

  if (!userStore) throw new Error("Store not found");

  const value = serializeIPAllowlist(ips, enabled);

  const setting = await prisma.storeSetting.upsert({
    where: {
      storeId_settingKey: {
        storeId: userStore.id,
        settingKey: "ip_allowlist",
      },
    },
    update: {
      settingValue: value,
      updatedBy: user.id,
      updatedAt: new Date(),
    },
    create: {
      storeId: userStore.id,
      settingKey: "ip_allowlist",
      settingValue: value,
      updatedBy: user.id,
    },
  });

  return { success: true };
}

export async function addIPToAllowlist(ip: string) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  if (!ip || ip.trim() === "") {
    throw new Error("IP address is required");
  }

  const { ips, enabled } = await getIPAllowlist();

  if (ips.includes(ip)) {
    throw new Error("IP already in allowlist");
  }

  const newIPs = [...ips, ip];
  await updateIPAllowlist(newIPs, enabled);

  return { ips: newIPs };
}

export async function removeIPFromAllowlist(ip: string) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  const { ips, enabled } = await getIPAllowlist();
  const newIPs = ips.filter((i) => i !== ip);

  await updateIPAllowlist(newIPs, enabled);

  return { ips: newIPs };
}

export async function toggleIPAllowlist(enabled: boolean) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  const { ips } = await getIPAllowlist();
  await updateIPAllowlist(ips, enabled);

  return { enabled };
}
