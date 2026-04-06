import Link from "next/link";
import { getPlans } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PermissionGuard from "@/components/auth/PermissionGuard";

import type { ThirdPartyPlanWithCount } from "@/types";
async function InsurancePageContent({
  searchParams,
}: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const { plans, total, pages } = await getPlans({ search, page });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Plans</h1>
          <p className="text-sm text-gray-500 mt-1">{total} third-party plan{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/insurance/plans/new" className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114]">
          + Add Plan
        </Link>
      </div>

      <div className="mb-4">
        <SearchBar placeholder="Search by plan name or BIN..." basePath="/insurance" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">BIN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">PCN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Members</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No plans found</td></tr>
            ) : plans.map((plan: ThirdPartyPlanWithCount) => (
              <tr key={plan.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/insurance/plans/${plan.id}`} className="text-sm font-medium text-[#40721D] hover:underline">
                    {plan.planName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{plan.bin}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{plan.pcn || "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500 capitalize">{plan.planType || "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{plan.phone || "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{plan._count.patientInsurance}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    plan.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>{plan.isActive ? "Active" : "Inactive"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="mt-4"><Pagination total={total} pages={pages} page={page} basePath="/insurance" /></div>}
    </div>
  );
}
export default function InsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  return (
    <PermissionGuard resource="insurance" action="read">
      <InsurancePageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
