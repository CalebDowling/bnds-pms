"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createShipment } from "@/app/(dashboard)/shipping/actions";
import { searchPatients } from "@/app/(dashboard)/prescriptions/actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

function NewShipmentPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    carrier: "usps", serviceLevel: "", trackingNumber: "", shippingCost: "",
    weightOz: "", estimatedDelivery: "", requiresColdChain: false, requiresSignature: false,
  });

  useEffect(() => {
    if (patientQuery.length < 2) { setPatientResults([]); return; }
    const timeout = setTimeout(async () => {
      const results = await searchPatients(patientQuery);
      setPatientResults(results);
      setShowDropdown(true);
    }, 200);
    return () => clearTimeout(timeout);
  }, [patientQuery]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedPatient) throw new Error("Please select a patient");

      const shipment = await createShipment({
        patientId: selectedPatient.id,
        carrier: form.carrier,
        serviceLevel: form.serviceLevel || undefined,
        trackingNumber: form.trackingNumber || undefined,
        shippingCost: form.shippingCost ? parseFloat(form.shippingCost) : undefined,
        weightOz: form.weightOz ? parseFloat(form.weightOz) : undefined,
        estimatedDelivery: form.estimatedDelivery || undefined,
        requiresColdChain: form.requiresColdChain,
        requiresSignature: form.requiresSignature,
      });

      router.push(`/shipping/${shipment.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Shipment</h1>
        <p className="text-sm text-gray-500 mt-1">Create a shipment for a patient</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

        {/* Patient */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient</h2>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedPatient.lastName}, {selectedPatient.firstName}</p>
                <p className="text-xs text-gray-500">{selectedPatient.mrn}</p>
              </div>
              <button type="button" onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                className="text-sm text-red-600 hover:underline">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                onFocus={() => patientResults.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search by patient name or MRN..." className={inputClass} />
              {showDropdown && patientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPatient(p); setShowDropdown(false); setPatientQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <span className="font-medium">{p.lastName}, {p.firstName}</span>
                      <span className="text-gray-400 ml-2 font-mono text-xs">{p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shipping Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
              <select value={form.carrier} onChange={(e) => updateField("carrier", e.target.value)} className={inputClass}>
                <option value="usps">USPS</option>
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="dhl">DHL</option>
                <option value="courier">Local Courier</option>
                <option value="pickup">Patient Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Level</label>
              <select value={form.serviceLevel} onChange={(e) => updateField("serviceLevel", e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option value="ground">Ground</option>
                <option value="priority">Priority</option>
                <option value="express">Express</option>
                <option value="overnight">Overnight</option>
                <option value="2day">2-Day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
              <input type="text" value={form.trackingNumber} onChange={(e) => updateField("trackingNumber", e.target.value)}
                placeholder="Enter after label generated" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost ($)</label>
              <input type="number" step="0.01" value={form.shippingCost} onChange={(e) => updateField("shippingCost", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (oz)</label>
              <input type="number" step="0.1" value={form.weightOz} onChange={(e) => updateField("weightOz", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
              <input type="date" value={form.estimatedDelivery} onChange={(e) => updateField("estimatedDelivery", e.target.value)}
                className={inputClass} />
            </div>
          </div>
          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiresColdChain} onChange={(e) => updateField("requiresColdChain", e.target.checked)}
                className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D]" />
              <span className="text-sm text-gray-700">Requires Cold Chain</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiresSignature} onChange={(e) => updateField("requiresSignature", e.target.checked)}
                className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D]" />
              <span className="text-sm text-gray-700">Requires Signature</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 transition-colors">
            {loading ? "Creating..." : "Create Shipment"}
          </button>
        </div>
      </form>
    </div>
  );
}
export default function NewShipmentPage() {
  return (
    <PermissionGuard resource="shipping" action="write">
      <NewShipmentPageContent />
    </PermissionGuard>
  );
}
