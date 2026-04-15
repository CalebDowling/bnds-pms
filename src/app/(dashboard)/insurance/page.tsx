import Link from "next/link";
import { Plus } from "lucide-react";
import { getPlans } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";

import type { ThirdPartyPlanWithCount } from "@/types";

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
      title="Insurance Plans"
      subtitle={`${total.toLocaleString()} third-party plan${total !== 1 ? "s" : ""}`}
      actions={
        <Link
          href="/insurance/plans/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={14} /> Add Plan
        </Link>
      }
      toolbar={
        <FilterBar
          search={<SearchBar placeholder="Search by plan name or BIN..." basePath="/insurance" />}
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "var(--green-50)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Plan Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>BIN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>PCN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Members</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No plans found
                </td>
              </tr>
            ) : (
              plans.map((plan: ThirdPartyPlanWithCount, idx: number) => (
                <tr
                  key={plan.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/insurance/plans/${plan.id}`}
                      className="text-sm font-semibold no-underline hover:underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {plan.planName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{plan.bin}</td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-muted)" }}>{plan.pcn || "—"}</td>
                  <td className="px-4 py-3 text-sm capitalize" style={{ color: "var(--text-muted)" }}>{plan.planType || "—"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{plan.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{plan._count.patientInsurance}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: plan.isActive ? "var(--green-100)" : "#fef2f2",
                        color: plan.isActive ? "var(--green-700)" : "#b91c1c",
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
