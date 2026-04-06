"use server";

import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  runFullDUR,
  getActiveDurAlerts,
  getDurAlertsForPatient,
  getDurOverrideHistory,
  overrideDurAlert,
  type DURAlert,
  type DURResult,
  type DUROverrideRecord,
} from "@/lib/clinical/dur-engine";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface DurDashboardData {
  alerts: DURAlert[];
  overrides: DUROverrideRecord[];
  stats: {
    activeAlerts: number;
    criticalAlerts: number;
    majorAlerts: number;
    overridesToday: number;
  };
}

// ═══════════════════════════════════════════════
// GET DUR DASHBOARD
// ═══════════════════════════════════════════════

export async function getDurDashboard(): Promise<DurDashboardData> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const [alerts, overrides] = await Promise.all([
    getActiveDurAlerts(),
    getDurOverrideHistory(),
  ]);

  // Count today's overrides
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overridesToday = overrides.filter(
    (o) => new Date(o.overriddenAt) >= today
  ).length;

  return {
    alerts,
    overrides,
    stats: {
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      majorAlerts: alerts.filter((a) => a.severity === "major").length,
      overridesToday,
    },
  };
}

// ═══════════════════════════════════════════════
// RUN DUR CHECK
// ═══════════════════════════════════════════════

export async function runDurCheck(fillId: string): Promise<DURResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = await runFullDUR(fillId);

  revalidatePath("/clinical/dur");

  return result;
}

// ═══════════════════════════════════════════════
// OVERRIDE ALERT
// ═══════════════════════════════════════════════

export async function overrideAlert(
  alertId: string,
  reasonCode: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = await overrideDurAlert(alertId, user.id, reasonCode, notes);

  revalidatePath("/clinical/dur");

  return result;
}

// ═══════════════════════════════════════════════
// GET DUR HISTORY FOR PATIENT
// ═══════════════════════════════════════════════

export async function getDurHistory(
  patientId: string
): Promise<DURAlert[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return getDurAlertsForPatient(patientId);
}
