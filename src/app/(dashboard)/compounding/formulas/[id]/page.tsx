import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormula } from "@/app/(dashboard)/compounding/actions";
import { formatDate } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import NewVersionForm from "./NewVersionForm";

export default async function FormulaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [formula, user] = await Promise.all([getFormula(id), getCurrentUser()]);
  if (!formula) notFound();

  const currentVersion = formula.versions[0];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{formula.name}</h1>
            <span className="text-sm font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{formula.formulaCode}</span>
            {formula.isSterile && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">Sterile</span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {formula.dosageForm || "—"} — {formula.route || "—"}
            {formula.category ? ` — ${formula.category}` : ""}
            {formula.defaultBudDays ? ` — BUD: ${formula.defaultBudDays} days` : ""}
          </p>
        </div>
        <Link href="/compounding" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Back to List</Link>
      </div>

      <div className="flex gap-3 mb-6">
        <NewVersionForm formulaId={formula.id} userId={user?.id} />
        {currentVersion && (
          <Link
            href={`/compounding/batches/new?formulaId=${formula.id}&versionId=${currentVersion.id}&formulaName=${encodeURIComponent(formula.name)}`}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
            Start Batch
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Version - Ingredients */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Ingredients {currentVersion ? `(v${currentVersion.versionNumber})` : ""}
              </h2>
            </div>
            {currentVersion && currentVersion.ingredients.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Ingredient</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Unit</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentVersion.ingredients.map((ing, idx) => (
                    <tr key={ing.id}>
                      <td className="py-2.5 text-sm text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 text-sm text-gray-900 font-medium">{ing.item.name}</td>
                      <td className="py-2.5 text-sm text-gray-600">{ing.quantity.toString()}</td>
                      <td className="py-2.5 text-sm text-gray-600">{ing.unit}</td>
                      <td className="py-2.5">
                        {ing.isActiveIngredient ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs text-gray-400">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">
                No ingredients added yet. Create a formula version with ingredients to get started.
              </p>
            )}
          </div>

          {/* Current Version - Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Compounding Steps {currentVersion ? `(v${currentVersion.versionNumber})` : ""}
            </h2>
            {currentVersion && currentVersion.steps.length > 0 ? (
              <div className="space-y-3">
                {currentVersion.steps.map((step) => (
                  <div key={step.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#40721D] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{step.stepNumber}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{step.instruction}</p>
                      <div className="flex gap-4 mt-1">
                        {step.equipment && (
                          <span className="text-xs text-gray-400">Equipment: {step.equipment}</span>
                        )}
                        {step.durationMinutes && (
                          <span className="text-xs text-gray-400">{step.durationMinutes} min</span>
                        )}
                        {step.requiresPharmacist && (
                          <span className="text-xs font-medium text-orange-600">RPh Required</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No compounding steps defined yet.</p>
            )}
          </div>

          {/* Batch History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Batches</h2>
            {currentVersion && currentVersion.batches.length > 0 ? (
              <div className="space-y-2">
                {currentVersion.batches.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <Link href={`/compounding/batches/${b.id}`} className="text-sm font-mono text-[#40721D] hover:underline">
                        {b.batchNumber}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {b.quantityPrepared.toString()} {b.unit} — BUD: {formatDate(b.budDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        b.status === "verified" ? "bg-green-50 text-green-700"
                          : b.status === "in_progress" ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.compounder.firstName} {b.compounder.lastName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No batches compounded yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Formula Info</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Storage</dt>
                <dd className="text-sm text-gray-900">{formula.storageConditions || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Default BUD</dt>
                <dd className="text-sm text-gray-900">{formula.defaultBudDays ? `${formula.defaultBudDays} days` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Versions</dt>
                <dd className="text-sm text-gray-900">{formula.versions.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Prescriptions</dt>
                <dd className="text-sm text-gray-900">{formula.prescriptions.length}</dd>
              </div>
            </dl>
          </div>

          {/* Version History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Version History</h3>
            {formula.versions.length > 0 ? (
              <div className="space-y-2">
                {formula.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">v{v.versionNumber}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(v.effectiveDate)}
                        {v.creator ? ` — ${v.creator.firstName} ${v.creator.lastName}` : ""}
                      </p>
                    </div>
                    {v.price && (
                      <span className="text-sm text-gray-600">${v.price.toString()}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No versions yet</p>
            )}
          </div>

          {/* Recent Rxs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Recent Prescriptions</h3>
            {formula.prescriptions.length > 0 ? (
              <div className="space-y-2">
                {formula.prescriptions.map((rx: any) => (
                  <div key={rx.id} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm text-gray-900">Rx# {rx.rxNumber}</p>
                      <p className="text-xs text-gray-400">{rx.patient.lastName}, {rx.patient.firstName}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(rx.dateReceived)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No prescriptions using this formula</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
