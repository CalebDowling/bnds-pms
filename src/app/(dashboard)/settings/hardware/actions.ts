"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

export interface HardwareConfig {
  labelPrinter: {
    name: string;
    paperSize: "4x2.5" | "4x6";
  };
  receiptPrinter: {
    name: string;
    paperWidth: "2" | "3" | "4";
  };
  barcodeScanner: {
    type: "USB" | "Bluetooth";
    name?: string;
  };
  cashDrawer: {
    type: "Serial" | "Network" | "USB";
    name?: string;
  };
}

const DEFAULT_CONFIG: HardwareConfig = {
  labelPrinter: { name: "", paperSize: "4x6" },
  receiptPrinter: { name: "", paperWidth: "3" },
  barcodeScanner: { type: "USB", name: "" },
  cashDrawer: { type: "Serial", name: "" },
};

// ═══════════════════════════════════════════════
// HARDWARE CONFIG
// ═══════════════════════════════════════════════

export async function getHardwareConfig() {
  const user = await getCurrentUser();
  const storeId = (user as any)?.storeId;
  if (!storeId) throw new Error("Unauthorized");

  const setting = await prisma.storeSetting.findUnique({
    where: {
      storeId_settingKey: {
        storeId,
        settingKey: "hardware_config",
      },
    },
  });

  if (!setting) {
    return DEFAULT_CONFIG;
  }

  try {
    return JSON.parse(setting.settingValue) as HardwareConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveHardwareConfig(config: HardwareConfig) {
  const user = await getCurrentUser();
  const storeId = (user as any)?.storeId;
  if (!storeId) throw new Error("Unauthorized");

  await prisma.storeSetting.upsert({
    where: {
      storeId_settingKey: {
        storeId,
        settingKey: "hardware_config",
      },
    },
    create: {
      storeId,
      settingKey: "hardware_config",
      settingValue: JSON.stringify(config),
      settingType: "json",
      updatedBy: user!.id,
    },
    update: {
      settingValue: JSON.stringify(config),
      updatedBy: user!.id,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/settings/hardware");
}
