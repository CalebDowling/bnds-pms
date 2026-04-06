import Link from "next/link";
import { getFormulas, getBatches } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

const BATCH_STATUS: Record<string, { label: string; color: string }> = {
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700" },
  completed: { label: "Completed", color: "bg-yellow-50 text-yellow-700" },
  verified: { label: "Verified", color: "bg-green-50 text-green-700" },
  failed: { label: "Failed QA", color: "bg-red-50 text-red-700" },
  quarantined: { label: "Quarantined", color: "bg-orange-50 text-orange-700" },
};

async function CompoundingPageContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "formulas";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compounding</h1>
          <p className="text-sm text-gray-500 mt-1">Formulas, batches, and quality assurance</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/compounding/formulas/new"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            + New Formula
          </Link>
          <Link
            href="/compounding/batches/new"
            className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
          >
            + New Batch
          </Link>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-0">
          {[
            { id: "formulas", label: "Formulas" },
            { id: "batches", label: "Batches" },
          ].map((t) => (
            <Link
              key={t.id}
              href={`/compounding?tab=${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#40721D] text-[#40721D]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {tab === "formulas" ? (
        <FormulasTab search={search} page={page} />
      ) : (
        <BatchesTab search={search} page={page} status={status} />
      )}
    </div>
  );
}

async function FormulasTab({ search, page }: { search: string; page: number }) {
  const { formulas, total, pages } = await getFormulas({ search, page });

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search formulas by name or code..." basePath="/compounding?tab=formulas" />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {formulas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No formulas yet</p>
            <Link href="/compounding/formulas/new" className="text-[#40721D] text-sm font-medium hover:underline">
              Create your first formula
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formula Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dosage Form</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingredients</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rxs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sterile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {formulas.map((f) => {
                  const currentVersion = f.versions[0];
                  const ingredientCount = currentVersion?.ingredients.length || 0;

                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/compounding/formulas/${f.id}`} className="text-sm font-mono text-[#40721D] font-medium hover:underline">
                          {f.formulaCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{f.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{f.category || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{f.dosageForm || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {currentVersion ? `v${currentVersion.versionNumber}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ingredientCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{f._count.prescriptions}</td>
                      <td className="px-4 py-3">
                        {f.isSterile ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">Sterile</span>
                        ) : (
                          <span className="text-xs text-gray-400">Non-sterile</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/compounding?tab=formulas" />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function BatchesTab({ search, page, status }: { search: string; page: number; status: string }) {
  const { batches, total, pages } = await getBatches({ search, status, page });

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search by batch number..." basePath="/compounding?tab=batches" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "in_progress", "completed", "verified", "failed"].map((s) => (
            <Link
              key={s}
              href={`/compounding?tab=batches&status=${s}${search ? `&search=${search}` : ""}`}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                status === s
                  ? "bg-[#40721D] text-white border-[#40721D]"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {batches.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No batches yet</p>
            <Link href="/compounding/batches/new" className="text-[#40721D] text-sm font-medium hover:underline">
              Compound your first batch
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formula</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rx / Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">BUD</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Compounder</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">QA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((b) => {
                  const statusInfo = BATCH_STATUS[b.status] || { label: b.status, color: "bg-gray-100 text-gray-700" };

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/compounding/batches/${b.id}`} className="text-sm font-mono text-[#40721D] font-medium hover:underline">
                          {b.batchNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{b.formulaVersion.formula.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{b.formulaVersion.formula.formulaCode}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {b.prescription ? (
                          <>Rx# {b.prescription.rxNumber} — {b.prescription.patient.lastName}</>
                        ) : (
                          <span className="text-gray-400">Stock batch</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {b.quantityPrepared.toString()} {b.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(b.budDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {b.compounder.firstName} {b.compounder.lastName}
                      </td>
                      <td className="px-4 py-3">
                        {b._count.qa > 0 ? (
                          <span className="text-xs text-gray-600">{b._count.qa} check{b._count.qa !== 1 ? "s" : ""}</span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/compounding?tab=batches" />
          </Suspense>
        </div>
      </div>
    </>
  );
}
export default function CompoundingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string; status?: string }>;
}) {
  return (
    <PermissionGuard resource="compounding" action="read">
      <CompoundingPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
