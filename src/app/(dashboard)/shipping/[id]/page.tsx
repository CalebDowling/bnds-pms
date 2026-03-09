import { notFound } from "next/navigation";
import Link from "next/link";
import { getShipment } from "@/app/(dashboard)/shipping/actions";
import { formatDate, formatPhone } from "@/lib/utils";
import ShipmentActions from "./ShipmentActions";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700" },
  packed: { label: "Packed", color: "bg-blue-50 text-blue-700" },
  shipped: { label: "Shipped", color: "bg-cyan-50 text-cyan-700" },
  in_transit: { label: "In Transit", color: "bg-indigo-50 text-indigo-700" },
  delivered: { label: "Delivered", color: "bg-green-50 text-green-700" },
  returned: { label: "Returned", color: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = await getShipment(id);
  if (!shipment) notFound();

  const si = STATUS_CONFIG[shipment.status] || { label: shipment.status, color: "bg-gray-100 text-gray-700" };
  const primaryPhone = shipment.patient.phoneNumbers?.[0];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Shipment to {shipment.patient.lastName}, {shipment.patient.firstName}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${si.color}`}>{si.label}</span>
          </div>
          <p className="text-sm text-gray-500">
            {shipment.carrier.toUpperCase()} {shipment.serviceLevel ? `— ${shipment.serviceLevel}` : ""}
            {shipment.trackingNumber ? ` — ${shipment.trackingNumber}` : ""}
          </p>
        </div>
        <Link href="/shipping" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Back to List</Link>
      </div>

      <ShipmentActions shipmentId={shipment.id} currentStatus={shipment.status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shipment Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipment Details</h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Carrier</dt>
                <dd className="text-sm text-gray-900 uppercase">{shipment.carrier}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Service</dt>
                <dd className="text-sm text-gray-900 capitalize">{shipment.serviceLevel || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Tracking</dt>
                <dd className="text-sm text-gray-900 font-mono">{shipment.trackingNumber || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Cost</dt>
                <dd className="text-sm text-gray-900">{shipment.shippingCost ? `$${Number(shipment.shippingCost).toFixed(2)}` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Weight</dt>
                <dd className="text-sm text-gray-900">{shipment.weightOz ? `${Number(shipment.weightOz)} oz` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ship Date</dt>
                <dd className="text-sm text-gray-900">{shipment.shipDate ? formatDate(shipment.shipDate) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Est. Delivery</dt>
                <dd className="text-sm text-gray-900">{shipment.estimatedDelivery ? formatDate(shipment.estimatedDelivery) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Actual Delivery</dt>
                <dd className="text-sm text-gray-900">{shipment.actualDelivery ? formatDate(shipment.actualDelivery) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Shipped By</dt>
                <dd className="text-sm text-gray-900">{shipment.shipper ? `${shipment.shipper.firstName} ${shipment.shipper.lastName}` : "—"}</dd>
              </div>
            </dl>
            <div className="flex gap-3 mt-4">
              {shipment.requiresColdChain && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">Cold Chain</span>
              )}
              {shipment.requiresSignature && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-full">Signature Required</span>
              )}
            </div>
          </div>

          {/* Packing List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Packing List</h2>
            {shipment.packingList && shipment.packingList.items.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Rx #</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Drug</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Directions</th>
                    <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipment.packingList.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-sm font-mono text-[#1B4F72]">{item.fill.prescription.rxNumber}</td>
                      <td className="py-2.5 text-sm text-gray-900">
                        {item.fill.prescription.item?.name || "Compound"} {item.fill.prescription.item?.strength || ""}
                      </td>
                      <td className="py-2.5 text-sm text-gray-600">{item.fill.prescription.directions || "—"}</td>
                      <td className="py-2.5">
                        {item.verified ? (
                          <span className="text-xs font-medium text-green-600">Verified</span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No packing list attached. Items will appear here when prescriptions are linked.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Patient</h3>
            <p className="text-sm font-medium text-gray-900">
              <Link href={`/patients/${shipment.patient.id}`} className="hover:text-[#1B4F72] hover:underline">
                {shipment.patient.lastName}, {shipment.patient.firstName}
              </Link>
            </p>
            {primaryPhone && <p className="text-xs text-gray-500 mt-1">{formatPhone(primaryPhone.number)}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Ship To Address</h3>
            {shipment.address ? (
              <>
                <p className="text-sm text-gray-900">{shipment.address.line1}</p>
                <p className="text-sm text-gray-600">{shipment.address.city}, {shipment.address.state} {shipment.address.zip}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No address selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
