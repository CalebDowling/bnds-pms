export const dynamic = "force-dynamic";
import { SecuritySettingsPage } from "./client";
import { get2FAStatus } from "./actions";

export default async function Page() {
  let initialIs2FAEnabled = false;
  try {
    const status = await get2FAStatus();
    initialIs2FAEnabled = status.enabled;
  } catch (error) {
    console.error("Failed to load 2FA status:", error);
  }

  return <SecuritySettingsPage initialIs2FAEnabled={initialIs2FAEnabled} />;
}
