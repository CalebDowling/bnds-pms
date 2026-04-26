import { notFound } from "next/navigation";
import Link from "next/link";
import { getBatch } from "@/app/(dashboard)/compounding/actions";
import { formatDate } from "@/lib/utils";
import { formatDrugName, formatPatientName } from "@/lib/utils/formatters";
import { prisma } from "@/lib/prisma";
import BatchStatusBar from "./BatchStatusBar";
import WeighIngredientForm from "./WeighIngredientForm";
import QaCheckForm from "./QaCheckForm";
import PrintBatchRecordButton from "./PrintBatchRecordButton";
import type { IngredientLotRecord, BatchFormulaIngredient, BatchQACheck, FormulaStep, BatchIngredient } from "@/types";
import PermissionGuard from "@/components/auth/PermissionGuard";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_progress: { label: "In Progress", color: "bg-yellow-50 text-yellow-700" },
  completed: { label: "Completed", color: "bg-blue-50 text-blue-700" },
  verified: { label: "Verified", color: "bg-green-50 text-green-700" },
  failed: { label: "Failed", color: "bg-red-50 text-red-700" },
};

async function BatchDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch) notFound();

  const formula = batch.formulaVersion.formula;
  const si = STATUS_CONFIG[batch.status] || { label: batch.status, color: "bg-gray-100 text-gray-700" };

  // Get available lots for each formula ingredient (for weighing)
  const ingredientLots: Record<string, IngredientLotRecord[]> = {};
  for (const ing of batch.formulaVersion.ingredients) {
    const itemId = (ing as BatchFormulaIngredient).item?.id;
    if (!itemId) continue;
    const lots = await prisma.itemLot.findMany({
      where: { itemId, quantityOnHand: { gt: 0 }, status: "available" },
      select: { id: true, lotNumber: true, quantityOnHand: true, expirationDate: true },
      orderBy: { expirationDate: "asc" },
    });
    ingredientLots[ing.id] = lots.map(l => ({
      ...l,
      quantityOnHand: Number(l.quantityOnHand),
      expirationDate: formatDate(l.expirationDate),
    }));
  }

  // Check which ingredients have been weighed
  const weighedItemIds = new Set(batch.ingredients.map((bi) => bi.itemLot?.item?.id || bi.itemLotId));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Batch {batch.batchNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${si.color}`}>{si.label}</span>
          </div>
          <p className="text-sm text-gray-500">
            <Link href={`/compounding/formulas/${formula.id}`} className="text-[#40721D] hover:underline">{formula.name}</Link>
            {" "}({formula.formulaCode}) — v{batch.formulaVersion.versionNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintBatchRecordButton batchId={batch.id} />
          <Link href="/compounding" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Back to Compounding</Link>
        </div>
      </div>

      {/* Status Bar */}
      <BatchStatusBar batchId={batch.id} currentStatus={batch.status} />

      {/* Batch Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Quantity</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{Number(batch.quantityPrepared)} {batch.unit}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">BUD</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatDate(batch.budDate)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Temp</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{batch.envTemp ? `${Number(batch.envTemp)}°F` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Humidity</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{batch.envHumidity ? `${Number(batch.envHumidity)}%` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Compounder</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{formatPatientName({ firstName: batch.compounder.firstName, lastName: batch.compounder.lastName })}</p>
          {batch.verifier && <p className="text-xs text-gray-400 mt-1">Verified: {formatPatientName({ firstName: batch.verifier.firstName, lastName: batch.verifier.lastName })}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Ingredient Weighing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ingredient Weighing ({batch.ingredients.length}/{batch.formulaVersion.ingredients.length} recorded)
            </h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Ingredient</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Expected</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Lot #</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Actual Qty</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Weighed By</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batch.formulaVersion.ingredients.map((ing: BatchFormulaIngredient) => {
                  // Find matching weighed ingredient
                  const weighed = batch.ingredients.find((bi) =>
                    bi.itemLot?.item?.id === ing.item?.id
                  );

                  return (
                    <tr key={ing.id}>
                      <td className="py-3">
                        <p className="text-sm font-medium text-gray-900">{ing.item?.name ? formatDrugName(ing.item.name) : "Unknown"}</p>
                        {ing.isActiveIngredient && <span className="text-[10px] text-purple-600 font-medium">ACTIVE</span>}
                      </td>
                      <td className="py-3 text-sm text-gray-600">{Number(ing.quantity)} {ing.unit}</td>
                      {weighed ? (
                        <>
                          <td className="py-3 text-sm text-gray-900 font-mono">{weighed.itemLot?.lotNumber || "—"}</td>
                          <td className="py-3 text-sm text-gray-900 font-medium">{Number(weighed.quantityUsed)} {weighed.unit}</td>
                          <td className="py-3 text-sm text-gray-600">
                            {weighed.weigher ? formatPatientName({ firstName: weighed.weigher.firstName, lastName: weighed.weigher.lastName }) : "—"}
                          </td>
                          <td className="py-3">
                            <span className="text-xs font-medium text-green-600">✓ Done</span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 text-sm text-gray-400">—</td>
                          <td className="py-3 text-sm text-gray-400">—</td>
                          <td className="py-3 text-sm text-gray-400">—</td>
                          <td className="py-3">
                            {batch.status === "in_progress" && (
                              <WeighIngredientForm
                                batchId={batch.id}
                                ingredientName={ing.item?.name ? formatDrugName(ing.item.name) : "Unknown"}
                                expectedQty={Number(ing.quantity)}
                                expectedUnit={ing.unit}
                                itemId={ing.item?.id || ""}
                                lots={ingredientLots[ing.id] || []}
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* QA Checks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">QA Checks ({batch.qa.length})</h2>
              {(batch.status === "in_progress" || batch.status === "completed") && (
                <QaCheckForm batchId={batch.id} />
              )}
            </div>
            {batch.qa.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Check</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Expected</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Actual</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Result</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">By</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batch.qa.map((qa: BatchQACheck) => (
                    <tr key={qa.id}>
                      <td className="py-2.5 text-sm text-gray-900">{qa.checkType}</td>
                      <td className="py-2.5 text-sm text-gray-600">{qa.expectedValue || "—"}</td>
                      <td className="py-2.5 text-sm text-gray-600">{qa.actualValue || "—"}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          qa.result === "pass" ? "bg-green-50 text-green-700"
                            : qa.result === "fail" ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}>{qa.result}</span>
                      </td>
                      <td className="py-2.5 text-sm text-gray-600">{formatPatientName({ firstName: qa.performer.firstName, lastName: qa.performer.lastName })}</td>
                      <td className="py-2.5 text-sm text-gray-600">{formatDate(qa.performedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No QA checks recorded yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compounding Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Compounding Steps</h3>
            {batch.formulaVersion.steps.length > 0 ? (
              <div className="space-y-3">
                {batch.formulaVersion.steps.map((step: FormulaStep) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#40721D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step.stepNumber}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{step.instruction}</p>
                      <div className="flex gap-3 mt-1">
                        {step.equipment && <span className="text-xs text-gray-400">Equipment: {step.equipment}</span>}
                        {step.durationMinutes && <span className="text-xs text-gray-400">{step.durationMinutes} min</span>}
                        {step.requiresPharmacist && <span className="text-xs text-red-500 font-medium">RPh Required</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No steps defined</p>
            )}
          </div>

          {/* Batch Notes */}
          {batch.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Notes</h3>
              <p className="text-sm text-gray-700">{batch.notes}</p>
            </div>
          )}

          {/* Linked Prescription */}
          {batch.prescription && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Linked Prescription</h3>
              <Link href={`/prescriptions/${batch.prescription.rxNumber}`}
                className="text-sm text-[#40721D] hover:underline">
                Rx# {batch.prescription.rxNumber}
              </Link>
              <p className="text-xs text-gray-400">
                {formatPatientName({ firstName: batch.prescription.patient.firstName, lastName: batch.prescription.patient.lastName }, { format: "last-first" })}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Timeline</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDate(batch.createdAt)}</dd>
              </div>
              {batch.compoundedAt && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Compounded</dt>
                  <dd className="text-sm text-gray-900">{formatDate(batch.compoundedAt)}</dd>
                </div>
              )}
              {batch.verifiedAt && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Verified</dt>
                  <dd className="text-sm text-gray-900">{formatDate(batch.verifiedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PermissionGuard resource="compounding" action="read">
      <BatchDetailPageContent params={params} />
    </PermissionGuard>
  );
}
