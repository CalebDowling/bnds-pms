export const dynamic = "force-dynamic";
import { AlertsPage } from "./client";
import { getAlertConfigs, getAlertHistory } from "./actions";

export default async function Page() {
  let initialConfigs = [];
  let initialHistory = [];

  try {
    const [cfgs, history] = await Promise.all([
      getAlertConfigs(),
      getAlertHistory(),
    ]);
    initialConfigs = cfgs;
    initialHistory = history;
  } catch (error) {
    console.error("Failed to load alerts:", error);
  }

  return (
    <AlertsPage
      initialConfigs={initialConfigs}
      initialHistory={initialHistory}
    />
  );
}
