import Link from "next/link";
import { getBatches } from "@/app/(dashboard)/compounding/actions";
import { formatDate } from "@/lib/utils";
import PermissionGuard from "@/components/auth/PermissionGuard";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_progress: { label: "In Progress", color: "bg-yellow-50 text-yellow-700" },
  completed: { label: "Completed", color: "bg-blue-50 text-blue-700" },
  verified: { label: "Verified", color: "bg-green-50 text-green-700" },
  released: { label: "Released", color: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", color: "bg-red-50 text-red-700" },
};

async function BatchListContent() {
  const batches = await getBatches({ limit: 100 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Batch Records</h1>
        <Link
          href="/compounding/batches/new"
          className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#305817] transition-colors"
        >
          + New Batch
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{batches.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {batches.batches?.filter((b: any) => b.status === "in_progress").length || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Completed</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {batches.batches?.filter((b: any) => b.status === "completed").length || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Verified</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {batches.batches?.filter((b: any) => b.status === "verified").length || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Released</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {batches.batches?.filter((b: any) => b.status === "released").length || 0}
          </p>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {batches.batches && batches.batches.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Batch #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Formula
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Compounder
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Verifier
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.batches.map((batch: any) => {
                const statusConfig =
                  STATUS_CONFIG[batch.status] || {
                    label: batch.status,
                    color: "bg-gray-100 text-gray-700",
                  };

                return (
                  <tr
                    key={batch.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/compounding/batches/${batch.id}`}
                        className="font-mono text-sm font-semibold text-[#40721D] hover:underline"
                      >
                        {batch.batchNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {batch.formulaVersion.formula.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {batch.formulaVersion.formula.formulaCode}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {Number(batch.quantityPrepared)} {batch.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(batch.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {batch.compounder.firstName} {batch.compounder.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {batch.verifier
                        ? `${batch.verifier.firstName} ${batch.verifier.lastName}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 mb-4">No batch records found</p>
            <Link
              href="/compounding/batches/new"
              className="text-[#40721D] hover:underline text-sm font-medium"
            >
              Create the first batch →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BatchListPage() {
  return (
    <PermissionGuard resource="compounding" action="read">
      <BatchListContent />
    </PermissionGuard>
  );
}
