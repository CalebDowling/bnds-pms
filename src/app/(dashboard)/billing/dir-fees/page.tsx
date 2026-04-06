import { Suspense } from "react";
import DIRFeesClient from "./client";
import { getDIRFees, getDIRStats } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

async function DIRFeesContent() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const [{ fees, total, pages }, stats] = await Promise.all([
    getDIRFees({ startDate, endDate, page: 1, limit: 25 }),
    getDIRStats(startDate, endDate),
  ]);

  // Convert Date objects to ISO strings for client component
  const feesWithStrings = fees.map((fee) => ({
    ...fee,
    date: fee.date instanceof Date ? fee.date.toISOString() : fee.date,
  }));

  return (
    <DIRFeesClient
      initialFees={feesWithStrings as any}
      initialStats={stats}
      initialPage={1}
      totalPages={pages}
      totalCount={total}
    />
  );
}

export default function DIRFeesPage() {
  return (
    <PermissionGuard resource="billing" action="view">
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <DIRFeesContent />
      </Suspense>
    </PermissionGuard>
  );
}
