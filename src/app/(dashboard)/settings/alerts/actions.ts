"use server";

const ALERT_DEFAULTS = {
  turnaround_time: { threshold: 1440, channel: "email" }, // 24 hours in minutes
  daily_fills_low: { threshold: 20, channel: "dashboard" },
  low_stock: { threshold: 5, channel: "email" },
  rejection_rate: { threshold: 5, channel: "email" },
  revenue_low: { threshold: 500, channel: "dashboard" },
  pending_rx_high: { threshold: 50, channel: "email" },
};

export async function getAlertConfigs() {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const store = await prisma.store.findFirst();
  if (!store) return [];

  // Get alert configs from StoreSetting
  let alertConfigs = await prisma.storeSetting.findMany({
    where: {
      storeId: store.id,
      settingKey: "alert_configs",
    },
  });

  if (alertConfigs.length === 0) {
    // Initialize with defaults
    const defaults = {
      configs: Object.entries(ALERT_DEFAULTS).map(([type, defaults]) => ({
        id: `alert_${type}`,
        type,
        enabled: false,
        ...defaults,
        recipients: [],
      })),
    };

    await prisma.storeSetting.create({
      data: {
        storeId: store.id,
        settingKey: "alert_configs",
        settingValue: JSON.stringify(defaults),
        settingType: "json",
      },
    });

    return defaults.configs;
  }

  try {
    const data = JSON.parse(alertConfigs[0].settingValue);
    return data.configs || [];
  } catch {
    return [];
  }
}

export async function updateAlertConfig(alertId: string, config: any) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store found");

  // Get current configs
  const setting = await prisma.storeSetting.findFirst({
    where: {
      storeId: store.id,
      settingKey: "alert_configs",
    },
  });

  if (!setting) throw new Error("Alert config not found");

  const data = JSON.parse(setting.settingValue);
  const index = data.configs.findIndex((c: any) => c.id === alertId);

  if (index === -1) throw new Error("Alert not found");

  data.configs[index] = config;

  await prisma.storeSetting.update({
    where: { id: setting.id },
    data: {
      settingValue: JSON.stringify(data),
    },
  });
}

export async function getAlertHistory() {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const store = await prisma.store.findFirst();
  if (!store) return [];

  // Get alert history from StoreSetting
  const setting = await prisma.storeSetting.findFirst({
    where: {
      storeId: store.id,
      settingKey: "alert_history",
    },
  });

  if (!setting) return [];

  try {
    const data = JSON.parse(setting.settingValue);
    return (data.alerts || []).slice(0, 20); // Last 20 alerts
  } catch {
    return [];
  }
}

export async function checkAlerts() {
  const { prisma } = await import("@/lib/prisma");
  // This function should be called by a cron job
  const store = await prisma.store.findFirst();
  if (!store) return [];

  const configs = await getAlertConfigs();
  const triggeredAlerts = [];

  for (const config of configs) {
    if (!config.enabled) continue;

    let shouldTrigger = false;
    let currentValue = 0;

    try {
      switch (config.type) {
        case "turnaround_time": {
          // Average turnaround time today
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const fills = await prisma.prescriptionFill.findMany({
            where: {
              dispensedAt: { gte: today },
              createdAt: { gte: today },
            },
            select: { createdAt: true, dispensedAt: true },
          });

          if (fills.length > 0) {
            const avgMs =
              fills.reduce(
                (sum, f) => sum + (f.dispensedAt?.getTime() ?? 0 - f.createdAt.getTime()),
                0
              ) / fills.length;
            currentValue = Math.round(avgMs / 60000); // Convert to minutes
            shouldTrigger = currentValue > config.threshold;
          }
          break;
        }

        case "daily_fills_low": {
          // Daily fill count
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const count = await prisma.prescriptionFill.count({
            where: {
              dispensedAt: { gte: today },
            },
          });

          currentValue = count;
          shouldTrigger = count < config.threshold;
          break;
        }

        case "low_stock": {
          // Count of items below reorder point
          const lowItems = await prisma.item.count({
            where: {
              reorderPoint: { not: null },
              // In a real scenario, would check inventory levels
            },
          });

          currentValue = lowItems;
          shouldTrigger = lowItems > config.threshold;
          break;
        }

        case "rejection_rate": {
          // Rejection rate for claims
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const claims = await prisma.claim.findMany({
            where: { createdAt: { gte: today } },
            select: { status: true },
          });

          if (claims.length > 0) {
            const rejectedCount = claims.filter((c) => c.status === "rejected").length;
            currentValue = Math.round((rejectedCount / claims.length) * 100);
            shouldTrigger = currentValue > config.threshold;
          }
          break;
        }

        case "revenue_low": {
          // Daily revenue
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const posTransactions = await prisma.posTransaction.aggregate({
            where: { processedAt: { gte: today } },
            _sum: { total: true },
          });

          const payments = await prisma.payment.aggregate({
            where: { processedAt: { gte: today }, status: "completed" },
            _sum: { amount: true },
          });

          currentValue = Math.round(
            (Number(posTransactions._sum?.total ?? 0) || 0) + (Number(payments._sum?.amount ?? 0) || 0)
          );
          shouldTrigger = currentValue < config.threshold;
          break;
        }

        case "pending_rx_high": {
          // Pending prescriptions count
          const pending = await prisma.prescription.count({
            where: { status: { in: ["intake", "pending"] } },
          });

          currentValue = pending;
          shouldTrigger = pending > config.threshold;
          break;
        }
      }

      if (shouldTrigger) {
        triggeredAlerts.push({
          type: config.type,
          threshold: config.threshold,
          currentValue,
          channel: config.channel,
          recipients: config.recipients,
          triggeredAt: new Date(),
        });
      }
    } catch (error) {
      console.error(`Error checking alert ${config.type}:`, error);
    }
  }

  // Store triggered alerts in history
  if (triggeredAlerts.length > 0) {
    const histSetting = await prisma.storeSetting.findFirst({
      where: {
        storeId: store.id,
        settingKey: "alert_history",
      },
    });

    const history = histSetting ? JSON.parse(histSetting.settingValue) : { alerts: [] };
    history.alerts = [...(history.alerts || []), ...triggeredAlerts].slice(-100); // Keep last 100

    if (histSetting) {
      await prisma.storeSetting.update({
        where: { id: histSetting.id },
        data: { settingValue: JSON.stringify(history) },
      });
    } else {
      await prisma.storeSetting.create({
        data: {
          storeId: store.id,
          settingKey: "alert_history",
          settingValue: JSON.stringify(history),
          settingType: "json",
        },
      });
    }
  }

  return triggeredAlerts;
}

export async function testAlert(alertId: string) {
  const { requireUser } = await import("@/lib/auth");
  await requireUser();

  const configs = await getAlertConfigs();
  const alert = configs.find((c: any) => c.id === alertId);

  if (!alert) throw new Error("Alert not found");

  // In a real implementation, send an actual notification
  console.log(`Test alert for ${alert.type} sent to ${alert.channel}`);

  // For now, just log it
  return { success: true, message: `Test alert sent via ${alert.channel}` };
}
