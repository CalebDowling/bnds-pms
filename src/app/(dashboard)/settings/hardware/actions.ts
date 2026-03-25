"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

export interface ScaleConfig {
  id: string;
  model: "Ohaus Scout" | "Ohaus Explorer" | "Ohaus Adventurer" | "Other";
  ipAddress: string;
  port: number;
  unit: "g" | "mg" | "oz" | "lb";
  name: string;
  enabled: boolean;
}

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
  scales: ScaleConfig[];
}

const DEFAULT_CONFIG: HardwareConfig = {
  labelPrinter: { name: "", paperSize: "4x6" },
  receiptPrinter: { name: "", paperWidth: "3" },
  barcodeScanner: { type: "USB", name: "" },
  cashDrawer: { type: "Serial", name: "" },
  scales: [],
};

// ═══════════════════════════════════════════════
// HARDWARE CONFIG
// ═══════════════════════════════════════════════

export async function getHardwareConfig(): Promise<HardwareConfig> {
  try {
    const user = await getCurrentUser();
    const storeId = (user as any)?.storeId;
    if (!storeId) return DEFAULT_CONFIG;

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

    const parsed = JSON.parse(setting.settingValue);
    // Merge with defaults to ensure new fields (like scales) exist
    return { ...DEFAULT_CONFIG, ...parsed, scales: parsed.scales || [] };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveHardwareConfig(config: HardwareConfig) {
  const user = await getCurrentUser();
  const storeId = (user as any)?.storeId;
  if (!storeId) return { error: "No store assigned to user" };

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
