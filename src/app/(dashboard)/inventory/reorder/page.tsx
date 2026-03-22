export const dynamic = "force-dynamic";
import { ReorderPage } from "./client";
import type { ReorderAlert, ReorderHistoryItem } from "./actions";
import { getReorderAlerts, getReorderHistory } from "./actions";

export default async function Page() {
  let initialAlerts: ReorderAlert[] = [];
  let initialHistory: ReorderHistoryItem[] = [];

  try {
    const [alertsData, historyData] = await Promise.all([
      getReorderAlerts(),
      getReorderHistory(),
    ]);
    initialAlerts = alertsData;
    initialHistory = historyData;
  } catch (error) {
    console.error("Failed to load reorder data:", error);
  }

  return <ReorderPage initialAlerts={initialAlerts} initialHistory={initialHistory} />;
}
