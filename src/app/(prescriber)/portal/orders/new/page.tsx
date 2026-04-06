"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Formula {
  id: string;
  name: string;
  formulaCode: string;
  category?: string;
  dosageForm?: string;
  route?: string;
}

interface FormData {
  patientType: "human" | "animal";
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  patientPhone: string;
  patientGender: string;
  species: string;
  breed: string;
  weight: number;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
  formulaId: string;
  customCompoundName: string;
  quantity: number;
  daysSupply: number;
  directions: string;
  refills: number;
  priority: "normal" | "urgent" | "stat";
  shippingMethod: "office" | "patient" | "pickup";
  notes: string;
}

export default function NewOrderPage(): React.ReactNode {
  const router = useRouter();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [useCustomCompound, setUseCustomCompound] = useState(false);

  const [form, setForm] = useState<FormData>({
    patientType: "human",
    patientFirstName: "",
    patientLastName: "",
    patientDob: "",
    patientPhone: "",
    patientGender: "other",
    species: "",
    breed: "",
    weight: 0,
    ownerFirstName: "",
    ownerLastName: "",
    ownerPhone: "",
    formulaId: "",
    customCompoundName: "",
    quantity: 1,
    daysSupply: 30,
    directions: "",
    refills: 0,
    priority: "normal",
    shippingMethod: "office",
    notes: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("prescriber_token");
      if (!token) {
        router.push("/portal");
        return;
      }
      await fetchFormulas(token);
    };

    checkAuth();
  }, [router]);

  const fetchFormulas = async (token: string) => {
    try {
      setIsLoadingFormulas(true);
      const response = await fetch("/api/prescriber-portal/formulas", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("prescriber_token");
          router.push("/portal");
          return;
        }
        throw new Error("Failed to fetch formulas");
      }

      const data = await response.json();
      setFormulas(data.formulas || []);
    } catch (err) {
      console.error("Error fetching formulas:", err);
    } finally {
      setIsLoadingFormulas(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "quantity" || name === "daysSupply" || name === "refills" || name === "weight"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("prescriber_token");
      if (!token) {
        router.push("/portal");
        return;
      }

      // Validate required fields
      if (!form.patientFirstName || !form.patientLastName || !form.directions) {
        setError("Please fill in all required fields");
        return;
      }

      if (form.patientType === "human" && !form.patientDob) {
        setError("Patient date of birth is required for human patients");
        return;
      }

      if (form.patientType === "animal" && (!form.species || !form.ownerFirstName || !form.ownerLastName)) {
        setError("Species and owner information are required for animal patients");
        return;
      }

      if (!useCustomCompound && !form.formulaId) {
        setError("Please select a formula or use custom compound");
        return;
      }

      if (useCustomCompound && !form.customCompoundName) {
        setError("Please provide a custom compound name");
        return;
      }

      const payload: Record<string, unknown> = {
        patientFirstName: form.patientFirstName,
        patientLastName: form.patientLastName,
        patientPhone: form.patientPhone || undefined,
        patientGender: form.patientGender || undefined,
        formulaId: useCustomCompound ? undefined : form.formulaId,
        customCompound: useCustomCompound
          ? {
              name: form.customCompoundName,
              ingredients: [],
            }
          : undefined,
        quantity: form.quantity,
        daysSupply: form.daysSupply,
        directions: form.directions,
        refills: form.refills,
        priority: form.priority,
        shippingMethod: form.shippingMethod,
        notes: form.notes || undefined,
      };

      if (form.patientType === "human") {
        payload.patientDob = form.patientDob;
      } else {
        payload.species = form.species;
        payload.breed = form.breed || undefined;
        payload.weight = form.weight > 0 ? form.weight : undefined;
        payload.ownerFirstName = form.ownerFirstName;
        payload.ownerLastName = form.ownerLastName;
        payload.ownerPhone = form.ownerPhone || undefined;
      }

      const response = await fetch("/api/prescriber-portal/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit order");
        return;
      }

      // Success - redirect to orders page
      router.push("/portal/orders");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .section-card {
          animation: fadeUp 0.5s ease-out forwards;
        }
      `}</style>

      {/* Page Header */}
      <div className="mb-8" style={{ animation: "fadeUp 0.5s ease-out" }}>
        <Link
          href="/portal/orders"
          className="text-[13px] text-[#40721D] hover:text-[#355f1a] mb-4 inline-flex items-center font-semibold transition-colors"
        >
          <span className="mr-1">←</span>
          Back to Orders
        </Link>
        <h1 className="text-[15px] font-semibold text-gray-900">New Order</h1>
        <p className="text-[13px] text-gray-600 mt-2">
          Submit a new compound prescription order
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Type Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 section-card" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6">
            Patient Type
          </h2>

          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={form.patientType === "human"}
                onChange={() =>
                  setForm((prev) => ({ ...prev, patientType: "human" }))
                }
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">Human</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={form.patientType === "animal"}
                onChange={() =>
                  setForm((prev) => ({ ...prev, patientType: "animal" }))
                }
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">Animal</span>
            </label>
          </div>
        </div>

        {/* Patient Information Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 section-card" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6">
            {form.patientType === "human" ? "Patient Information" : "Animal Information"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                {form.patientType === "human" ? "First Name" : "Animal Name"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="patientFirstName"
                value={form.patientFirstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="patientLastName"
                value={form.patientLastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                required
              />
            </div>

            {form.patientType === "human" && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="patientDob"
                    value={form.patientDob}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="patientPhone"
                    value={form.patientPhone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    name="patientGender"
                    value={form.patientGender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </>
            )}

            {form.patientType === "animal" && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Species <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="species"
                    value={form.species}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                    required
                  >
                    <option value="">-- Select species --</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="horse">Horse</option>
                    <option value="bird">Bird</option>
                    <option value="reptile">Reptile</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Breed
                  </label>
                  <input
                    type="text"
                    name="breed"
                    value={form.breed}
                    onChange={handleInputChange}
                    placeholder="e.g., Golden Retriever"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={form.weight || ""}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder="e.g., 75"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Owner First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ownerFirstName"
                    value={form.ownerFirstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Owner Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ownerLastName"
                    value={form.ownerLastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Owner Phone
                  </label>
                  <input
                    type="tel"
                    name="ownerPhone"
                    value={form.ownerPhone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Medication Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 section-card" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6">
            Medication
          </h2>

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!useCustomCompound}
                onChange={() => setUseCustomCompound(false)}
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">
                Select from available formulas
              </span>
            </label>
          </div>

          {!useCustomCompound && (
            <div className="mb-6">
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Formula <span className="text-red-500">*</span>
              </label>
              {isLoadingFormulas ? (
                <div className="text-[13px] text-gray-600">Loading formulas...</div>
              ) : (
                <select
                  name="formulaId"
                  value={form.formulaId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                >
                  <option value="">-- Select a formula --</option>
                  {formulas.map((formula) => (
                    <option key={formula.id} value={formula.id}>
                      {formula.name}
                      {formula.dosageForm ? ` (${formula.dosageForm})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={useCustomCompound}
                onChange={() => setUseCustomCompound(true)}
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">
                Custom compound
              </span>
            </label>
          </div>

          {useCustomCompound && (
            <div className="mb-6">
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Compound Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customCompoundName"
                value={form.customCompoundName}
                onChange={handleInputChange}
                placeholder="e.g., Gabapentin 5% Cream"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
              />
            </div>
          )}
        </div>

        {/* Prescription Details Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 section-card" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6">
            Prescription Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Days Supply <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="daysSupply"
                value={form.daysSupply}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Refills Authorized
              </label>
              <input
                type="number"
                name="refills"
                value={form.refills}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
              Directions/SIG <span className="text-red-500">*</span>
            </label>
            <textarea
              name="directions"
              value={form.directions}
              onChange={handleInputChange}
              placeholder="e.g., Apply topically to affected area twice daily"
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Shipping Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 section-card" style={{ animationDelay: "0.5s" }}>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6">
            Shipping Method
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="shippingMethod"
                value="office"
                checked={form.shippingMethod === "office"}
                onChange={handleInputChange}
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">Ship to Office</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="shippingMethod"
                value="patient"
                checked={form.shippingMethod === "patient"}
                onChange={handleInputChange}
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">Ship to Patient/Owner</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="shippingMethod"
                value="pickup"
                checked={form.shippingMethod === "pickup"}
                onChange={handleInputChange}
                className="w-4 h-4 text-[#40721D] cursor-pointer"
              />
              <span className="text-[13px] font-medium text-gray-700">Pickup</span>
            </label>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 section-card" style={{ animationDelay: "0.6s" }}>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6">
            Additional Information
          </h2>

          <label className="block text-[12px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleInputChange}
            placeholder="Any additional notes for the pharmacy..."
            rows={3}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 section-card" style={{ animationDelay: "0.7s" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {isSubmitting ? "Submitting..." : "Submit Order"}
          </button>
          <Link
            href="/portal/orders"
            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-900 text-[13px] font-semibold rounded-xl hover:bg-gray-200 text-center transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
