import Link from "next/link";
import { Plus } from "lucide-react";
import { getPlans } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";

import type { ThirdPartyPlanWithCount } from "@/types";

// BNDS PMS Redesign — heritage insurance palette (forest primary, leaf-tinted active, burgundy inactive)
async function InsurancePageContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const { plans, total, pages } = await getPlans({ search, page });

  return (
    <PageShell
      eyebrow="Finance"
      title="Insurance Plans"
      subtitle={`${total.toLocaleString()} third-party plan${total !== 1 ? "s" : ""}`}
      actions={
        <Link
          href="/insurance/plans/new"
          className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
          style={{
            backgroundColor: "#1f5a3a",
            color: "#ffffff",
            border: "1px solid #1f5a3a",
            padding: "7px 13px",
            fontSize: 13,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Add Plan
        </Link>
      }
      toolbar={
        <FilterBar
          search={<SearchBar placeholder="Search by plan name or BIN..." basePath="/insurance" />}
        />
      }
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#f4ede0", borderBottom: "1px solid #e3ddd1" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Plan Name</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>BIN</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>PCN</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Type</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Phone</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Members</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "#7a8a78" }}>
                  No plans found
                </td>
              </tr>
            ) : (
              plans.map((plan: ThirdPartyPlanWithCount, idx: number) => (
                <tr
                  key={plan.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/insurance/plans/${plan.id}`}
                      className="no-underline hover:underline"
                      style={{ color: "#1f5a3a", fontWeight: 600 }}
                    >
                      {plan.planName}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{plan.bin}</td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{plan.pcn || "—"}</td>
                  <td className="px-4 py-3 capitalize" style={{ color: "#5a6b58" }}>{plan.planType || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{plan.phone || "—"}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>{plan._count.patientInsurance}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center"
                      style={{
                        backgroundColor: plan.isActive ? "rgba(31,90,58,0.14)" : "rgba(184,58,47,0.10)",
                        color: plan.isActive ? "#1f5a3a" : "#9a2c1f",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4">
          <Pagination total={total} pages={pages} page={page} basePath="/insurance" />
        </div>
      )}
    </PageShell>
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
