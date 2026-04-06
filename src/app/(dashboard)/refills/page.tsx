import RefillsClient from "./client";
import { getRefillRequests, getRefillStats } from "./actions";

export const dynamic = "force-dynamic";

export default async function RefillsPage() {
  const [requests, stats] = await Promise.all([
    getRefillRequests(),
    getRefillStats(),
  ]);

  return <RefillsClient initialRequests={requests} initialStats={stats} />;
}
