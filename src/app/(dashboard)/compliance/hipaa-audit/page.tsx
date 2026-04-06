export const dynamic = "force-dynamic";
import { HIPAAAuditPage } from "./client";
import type { AuditLogEntry, Stats } from "./client";
import {
  getHIPAAAuditLog,
  getHIPAAStatsData,
} from "./actions";

export default async function Page() {
  const initialStats = {
    totalPHIAccesses: 0,
    uniquePatients: 0,
    dataExports: 0,
    failedLogins: 0,
    userCount: 0,
  };

  let initialLogs: AuditLogEntry[] = [];
  let finalStats = initialStats;

  try {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [logsData, statsData] = await Promise.all([
      getHIPAAAuditLog({
        startDate,
        endDate,
        limit: 500,
      }),
      getHIPAAStatsData(startDate, endDate),
    ]);

    initialLogs = logsData.logs;
    finalStats = statsData;
  } catch (error) {
    console.error("Failed to load initial audit data:", error);
  }

  return <HIPAAAuditPage initialLogs={initialLogs} initialStats={finalStats} />;
}
