import { Suspense } from "react";
import ReconciliationClient from "./client";
import {
  getCashReconciliation,
  getInsuranceReconciliation,
  getReconciliationStats,
} from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

async function ReconciliationContent() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const [cashData, insuranceData, stats] = await Promise.all([
    getCashReconciliation({ startDate, endDate, page: 1, limit: 25 }),
    getInsuranceReconciliation({ startDate, endDate, page: 1, limit: 25 }),
    getReconciliationStats(startDate, endDate),
  ]);

  // Convert Date objects to ISO strings for client component
  const cashWithStrings = cashData.items.map((item) => ({
    ...item,
    date: item.date instanceof Date ? item.date.toISOString() : item.date,
  }));

  const insuranceWithStrings = insuranceData.items.map((item) => ({
    ...item,
    date: item.date instanceof Date ? item.date.toISOString() : item.date,
  }));

  return (
    <ReconciliationClient
      initialCashItems={cashWithStrings as any}
      initialInsuranceItems={insuranceWithStrings as any}
      initialStats={stats}
      initialPage={1}
      totalPages={Math.max(cashData.pages, insuranceData.pages)}
      totalCashCount={cashData.total}
      totalInsuranceCount={insuranceData.total}
    />
  );
}

export default function ReconciliationPage() {
  return (
    <PermissionGuard resource="billing" action="view">
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <ReconciliationContent />
      </Suspense>
    </PermissionGuard>
  );
}
