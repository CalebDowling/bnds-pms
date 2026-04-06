import { Suspense } from "react";
import WaitingBinClient from "./client";
import { getWaitingBinItems, getWaitingBinStats } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

async function WaitingBinContent() {
  const [items, stats] = await Promise.all([
    getWaitingBinItems({ sortBy: "binLocation" }),
    getWaitingBinStats(),
  ]);

  // Convert Date objects to ISO strings for client component
  const itemsWithStrings = items.map((item) => ({
    ...item,
    dateAdded: item.dateAdded instanceof Date ? item.dateAdded.toISOString() : item.dateAdded,
  }));

  return (
    <WaitingBinClient initialItems={itemsWithStrings as any} initialStats={stats} />
  );
}

export default function WaitingBinPage() {
  return (
    <PermissionGuard resource="prescriptions" action="view">
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <WaitingBinContent />
      </Suspense>
    </PermissionGuard>
  );
}
