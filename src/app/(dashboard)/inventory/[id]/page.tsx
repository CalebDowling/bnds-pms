import { notFound } from "next/navigation";
import Link from "next/link";
import { getItem } from "@/app/(dashboard)/inventory/actions";
import { formatDate } from "@/lib/utils";
import ReceiveLotForm from "./ReceiveLotForm";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const activeLots = item.lots.filter((l) => Number(l.quantityOnHand) > 0);
  const totalOnHand = activeLots.reduce((sum, l) => sum + Number(l.quantityOnHand), 0);
  const isLow = item.reorderPoint ? totalOnHand <= Number(item.reorderPoint) : false;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            {item.strength && <span className="text-lg text-gray-500">{item.strength}</span>}
            <div className="flex gap-1">
              {item.isCompoundIngredient && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">Compound</span>
              )}
              {item.isRefrigerated && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">Refrigerated</span>
              )}
              {item.deaSchedule && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-full">C-{item.deaSchedule}</span>
              )}
              {item.isOtc && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">OTC</span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {item.genericName && item.genericName !== item.name ? `${item.genericName} — ` : ""}
            {item.manufacturer || "Unknown manufacturer"}
            {item.ndc ? ` — NDC: ${item.ndc}` : ""}
          </p>
        </div>
        <Link href="/inventory" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Back to List</Link>
      </div>

      {/* Low Stock Warning */}
      {isLow && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-800">
            Low Stock Alert — {totalOnHand} {item.unitOfMeasure || "units"} on hand
            (reorder point: {Number(item.reorderPoint)})
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">On Hand</p>
          <p className={`text-2xl font-bold mt-1 ${isLow ? "text-red-600" : "text-gray-900"}`}>
            {totalOnHand}
          </p>
          <p className="text-xs text-gray-400">{item.unitOfMeasure || "units"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Active Lots</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeLots.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Acquisition Cost</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {item.acquisitionCost ? `$${Number(item.acquisitionCost).toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">AWP</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {item.awp ? `$${Number(item.awp).toFixed(2)}` : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lot Tracking */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Lot Tracking ({item.lots.length} total)
              </h2>
              <ReceiveLotForm itemId={item.id} unitOfMeasure={item.unitOfMeasure} />
            </div>
            {item.lots.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Lot #</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Expiration</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Received</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Qty Recv</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {item.lots.map((lot) => {
                    const isExpired = lot.expirationDate && new Date(lot.expirationDate) < new Date();
                    const expiringSoon = lot.expirationDate && !isExpired &&
                      new Date(lot.expirationDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

                    return (
                      <tr key={lot.id} className={isExpired ? "bg-red-50/50" : expiringSoon ? "bg-yellow-50/50" : ""}>
                        <td className="py-2.5 text-sm font-mono text-gray-900">{lot.lotNumber}</td>
                        <td className="py-2.5">
                          <span className={`text-sm ${isExpired ? "text-red-600 font-medium" : expiringSoon ? "text-orange-600" : "text-gray-600"}`}>
                            {formatDate(lot.expirationDate)}
                          </span>
                          {isExpired && <span className="ml-1 text-[10px] font-medium text-red-600">EXPIRED</span>}
                        </td>
                        <td className="py-2.5 text-sm text-gray-600">{formatDate(lot.dateReceived)}</td>
                        <td className="py-2.5 text-sm text-gray-600">{Number(lot.quantityReceived)}</td>
                        <td className="py-2.5">
                          <span className={`text-sm font-medium ${Number(lot.quantityOnHand) === 0 ? "text-gray-400" : "text-gray-900"}`}>
                            {Number(lot.quantityOnHand)}
                          </span>
                        </td>
                        <td className="py-2.5 text-sm text-gray-600">
                          {lot.unitCost ? `$${Number(lot.unitCost).toFixed(4)}` : "—"}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            lot.status === "available" ? "bg-green-50 text-green-700"
                              : lot.status === "quarantined" ? "bg-orange-50 text-orange-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {lot.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No lots received yet.</p>
            )}
          </div>

          {/* Prescription History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Prescriptions</h2>
            {item.prescriptions.length > 0 ? (
              <div className="space-y-2">
                {item.prescriptions.map((rx: any) => (
                  <div key={rx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <Link href={`/prescriptions/${rx.id}`} className="text-sm text-[#40721D] hover:underline">
                        Rx# {rx.rxNumber}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {rx.patient.lastName}, {rx.patient.firstName} ({rx.patient.mrn})
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(rx.dateReceived)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No prescriptions using this item</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Item Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Item Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Dosage Form</dt>
                <dd className="text-sm text-gray-900 capitalize">{item.dosageForm || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Route</dt>
                <dd className="text-sm text-gray-900 capitalize">{item.route || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Package Size</dt>
                <dd className="text-sm text-gray-900">{item.packageSize || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Reorder Point</dt>
                <dd className="text-sm text-gray-900">{item.reorderPoint ? Number(item.reorderPoint) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Reorder Qty</dt>
                <dd className="text-sm text-gray-900">{item.reorderQuantity ? Number(item.reorderQuantity) : "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Linked Formulas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Used in Formulas</h3>
            {item.formulaIngredients.length > 0 ? (
              <div className="space-y-2">
                {item.formulaIngredients.map((fi: any) => (
                  <div key={fi.id} className="py-1">
                    <Link href={`/compounding/formulas/${fi.formulaVersion.formula.id}`}
                      className="text-sm text-[#40721D] hover:underline">
                      {fi.formulaVersion.formula.name}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {fi.formulaVersion.formula.formulaCode} — {Number(fi.quantity)} {fi.unit}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not used in any formulas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
