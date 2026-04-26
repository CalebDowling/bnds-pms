"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient, updatePatient } from "./actions";
import type { PatientFormData } from "@/types/patient";
import { getErrorMessage } from "@/lib/errors";
import { validatePhone } from "@/lib/utils";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function PatientForm({
  initialData,
  patientId,
}: {
  initialData?: Partial<PatientFormData>;
  patientId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-field error for the phone input. Lit on blur so the user has a
  // chance to finish typing first; cleared on every keystroke so the
  // message disappears as soon as they correct it. Drives both the inline
  // red message under the input and the disabled state on Submit.
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const isEdit = !!patientId;

  const [form, setForm] = useState<PatientFormData>({
    firstName: initialData?.firstName || "",
    middleName: initialData?.middleName || "",
    lastName: initialData?.lastName || "",
    suffix: initialData?.suffix || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    gender: initialData?.gender || "",
    ssnLastFour: initialData?.ssnLastFour || "",
    email: initialData?.email || "",
    preferredContact: initialData?.preferredContact || "phone",
    preferredLanguage: initialData?.preferredLanguage || "en",
    notes: initialData?.notes || "",
    phone: initialData?.phone || "",
    phoneType: initialData?.phoneType || "mobile",
    addressLine1: initialData?.addressLine1 || "",
    addressLine2: initialData?.addressLine2 || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zip: initialData?.zip || "",
  });

  function updateField(field: keyof PatientFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the inline phone error as soon as the user starts editing —
    // they'll get a fresh check on blur. Avoids a stale error nagging them
    // while they're correcting it.
    if (field === "phone" && phoneError) setPhoneError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth) {
        throw new Error("First name, last name, and date of birth are required.");
      }

      // Reject obvious placeholder phone numbers before we hit the server.
      // The same check runs server-side so a power user can't bypass this.
      const phoneError = validatePhone(form.phone);
      if (phoneError) {
        throw new Error(phoneError);
      }

      if (isEdit) {
        await updatePatient(patientId!, form);
        router.push(`/patients/${patientId}`);
      } else {
        const patient = await createPatient(form);
        router.push(`/patients/${patient.id}`);
      }
      router.refresh();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Demographics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
            <input
              type="text"
              value={form.middleName}
              onChange={(e) => updateField("middleName", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
            <select
              value={form.suffix}
              onChange={(e) => updateField("suffix", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            >
              <option value="">None</option>
              <option value="Jr">Jr</option>
              <option value="Sr">Sr</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SSN (last 4)</label>
            <input
              type="text"
              value={form.ssnLastFour}
              onChange={(e) => updateField("ssnLastFour", e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
            <select
              value={form.preferredContact}
              onChange={(e) => updateField("preferredContact", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="text">Text</option>
              <option value="mail">Mail</option>
            </select>
          </div>
        </div>
      </div>

      {/* Phone Number (quick add) */}
      {!isEdit && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Phone</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Type</label>
              <select
                value={form.phoneType}
                onChange={(e) => updateField("phoneType", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
              >
                <option value="mobile">Mobile</option>
                <option value="home">Home</option>
                <option value="work">Work</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
                placeholder="(555) 123-4567"
                aria-invalid={phoneError ? true : undefined}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent ${
                  phoneError ? "border-red-400" : "border-gray-300"
                }`}
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Address (quick add) */}
      {!isEdit && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Home Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={form.addressLine1}
                onChange={(e) => updateField("addressLine1", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Apt / Suite</label>
              <input
                type="text"
                value={form.addressLine2}
                onChange={(e) => updateField("addressLine2", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
                >
                  <option value="">Select</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  maxLength={5}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          rows={3}
          placeholder="General notes about this patient..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !!phoneError}
          className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Patient" : "Create Patient"}
        </button>
      </div>
    </form>
  );
}
