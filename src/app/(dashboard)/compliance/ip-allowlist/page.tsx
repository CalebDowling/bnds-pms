export const dynamic = "force-dynamic";
import { IPAllowlistPage } from "./client";
import { getIPAllowlist } from "./actions";

export default async function Page() {
  let initialIps: string[] = [];
  let initialEnabled = false;

  try {
    const data = await getIPAllowlist();
    initialIps = data.ips;
    initialEnabled = data.enabled;
  } catch (error) {
    console.error("Failed to load IP allowlist:", error);
  }

  return <IPAllowlistPage initialIps={initialIps} initialEnabled={initialEnabled} />;
}
