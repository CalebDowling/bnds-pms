import React, { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getClaims, getClaimStats } from "./actions";
import Link from "next/link";
import { Metadata } from "next";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Claims Management | Boudreaux's PMS",
  description: "View and manage insurance claims",
};

// ═══════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════

function ClaimStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    reversed: "bg-gray-100 text-gray-800",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

async function ClaimsStats() {
  const stats = await getClaimStats();

  return (
    <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-6">
      <StatCard label="Total Claims" value={stats.total} />
      <StatCard label="Pending" value={stats.pending} />
      <StatCard label="Submitted" value={stats.submitted} />
      <StatCard label="Paid" value={stats.paid} />
      <StatCard label="Rejected" value={stats.rejected} />
      <StatCard label="Reversed" value={stats.reversed} />
    </div>
  );
}

async function ClaimsTable({ page = 1, status = "all", search = "" }: { page?: number; status?: string; search?: string }) {
  const result = await getClaims({ page, status, search, limit: 25 });

  if (result.claims.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No claims found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rx #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {result.claims.map((claim) => {
            const fill = claim.fills[0];
            const prescription = fill?.prescription;
            const patient = claim.insurance.patient;
            const plan = claim.insurance.thirdPartyPlan;

            return (
              <tr key={claim.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link href={`/dashboard/billing/claims/${claim.id}`} className="text-blue-600 hover:text-blue-800">
                    {claim.claimNumber || claim.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {patient.firstName} {patient.lastName}
                  <br />
                  <span className="text-xs text-gray-500">{patient.mrn}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prescription?.rxNumber || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {plan?.planName || "Unknown"}
                  <br />
                  <span className="text-xs text-gray-500">BIN: {plan?.bin}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${claim.amountBilled.toFixed(2)}
                  {claim.amountPaid && (
                    <br />
                  )}
                  {claim.amountPaid && <span className="text-xs text-green-600">${claim.amountPaid.toFixed(2)} paid</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ClaimStatusBadge status={claim.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {claim.submittedAt ? formatDate(claim.submittedAt) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    href={`/dashboard/billing/claims/${claim.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {result.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            {page > 1 && (
              <Link href={`?page=${page - 1}${status ? `&status=${status}` : ""}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </Link>
            )}
            {page < result.pages && (
              <Link href={`?page=${page + 1}${status ? `&status=${status}` : ""}`} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </Link>
            )}
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{result.pages}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();

  const page = parseInt((searchParams.page as string) || "1", 10);
  const status = (searchParams.status as string) || "all";
  const search = (searchParams.search as string) || "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
          <p className="mt-2 text-gray-600">Submit and manage insurance claims for prescription fills</p>
        </div>
        <Link
          href="/dashboard/prescriptions?tab=fills"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Submit Claim
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="animate-pulse">Loading stats...</div>}>
        <ClaimsStats />
      </Suspense>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              defaultValue={status}
              onChange={(e) => {
                const params = new URLSearchParams();
                if (e.target.value !== "all") params.set("status", e.target.value);
                window.location.href = `/dashboard/billing/claims?${params.toString()}`;
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>

          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const searchVal = formData.get("search");
                const params = new URLSearchParams();
                if (status !== "all") params.set("status", status);
                if (searchVal) params.set("search", searchVal.toString());
                window.location.href = `/dashboard/billing/claims?${params.toString()}`;
              }}
            >
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Claim #, Patient name, Rx #..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <Suspense fallback={<div className="animate-pulse">Loading claims...</div>}>
        <ClaimsTable page={page} status={status} search={search} />
      </Suspense>
    </div>
  );
}
