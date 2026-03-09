"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPrescriber } from "@/app/(dashboard)/prescriptions/prescriber-actions";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function NewPrescriberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    npi: "",
    deaNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    specialty: "",
    phone: "",
    fax: "",
    email: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    stateLicense: "",
    licenseState: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.npi.trim()) throw new Error("NPI is required");
      if (!form.firstName.trim() || !form.lastName.trim()) throw new Error("Name is required");

      await createPrescriber(form);
      router.push("/prescriptions/new");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Prescriber</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new prescriber / doctor to the system</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Provider Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NPI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.npi}
                onChange={(e) => updateField("npi", e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
                maxLength={10}
                placeholder="10-digit NPI"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DEA Number</label>
              <input
                type="text"
                value={form.deaNumber}
                onChange={(e) => updateField("deaNumber", e.target.value)}
                maxLength={15}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => updateField("specialty", e.target.value)}
                placeholder="e.g. Family Medicine"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
              <select
                value={form.suffix}
                onChange={(e) => updateField("suffix", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              >
                <option value="">None</option>
                <option value="MD">MD</option>
                <option value="DO">DO</option>
                <option value="NP">NP</option>
                <option value="PA">PA</option>
                <option value="DDS">DDS</option>
                <option value="DPM">DPM</option>
                <option value="OD">OD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & License</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
              <input type="tel" value={form.fax} onChange={(e) => updateField("fax", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.addressLine1} onChange={(e) => updateField("addressLine1", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={form.city} onChange={(e) => updateField("city", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select value={form.state} onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent">
                  <option value="">Select</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input type="text" value={form.zip} onChange={(e) => updateField("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State License #</label>
              <input type="text" value={form.stateLicense} onChange={(e) => updateField("stateLicense", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License State</label>
              <select value={form.licenseState} onChange={(e) => updateField("licenseState", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent">
                <option value="">Select</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? "Saving..." : "Add Prescriber"}
          </button>
        </div>
      </form>
    </div>
  );
}
