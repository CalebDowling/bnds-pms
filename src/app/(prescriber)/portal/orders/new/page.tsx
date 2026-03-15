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
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  patientPhone: string;
  patientGender: string;
  formulaId: string;
  customCompoundName: string;
  quantity: number;
  daysSupply: number;
  directions: string;
  refills: number;
  priority: "normal" | "urgent" | "stat";
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
    patientFirstName: "",
    patientLastName: "",
    patientDob: "",
    patientPhone: "",
    patientGender: "other",
    formulaId: "",
    customCompoundName: "",
    quantity: 1,
    daysSupply: 30,
    directions: "",
    refills: 0,
    priority: "normal",
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
        name === "quantity" || name === "daysSupply" || name === "refills"
          ? parseInt(value, 10)
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
      if (
        !form.patientFirstName ||
        !form.patientLastName ||
        !form.patientDob ||
        !form.directions
      ) {
        setError("Please fill in all required fields");
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

      const payload = {
        patientFirstName: form.patientFirstName,
        patientLastName: form.patientLastName,
        patientDob: form.patientDob,
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
        notes: form.notes || undefined,
      };

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
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/portal/orders"
          className="text-sm text-[#40721D] hover:text-[#2D5114] mb-4 inline-flex items-center"
        >
          <span className="mr-1">←</span>
          Back to Orders
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">New Order</h1>
        <p className="text-gray-600 mt-2">
          Submit a new compound prescription order
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Patient Information Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Patient Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="patientFirstName"
                value={form.patientFirstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="patientLastName"
                value={form.patientLastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="patientDob"
                value={form.patientDob}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="patientPhone"
                value={form.patientPhone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                name="patientGender"
                value={form.patientGender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medication Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Medication
          </h2>

          <div className="mb-6">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={!useCustomCompound}
                onChange={() => setUseCustomCompound(false)}
                className="w-4 h-4 text-[#40721D]"
              />
              <span className="text-sm font-medium text-gray-700">
                Select from available formulas
              </span>
            </label>
          </div>

          {!useCustomCompound && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formula <span className="text-red-500">*</span>
              </label>
              {isLoadingFormulas ? (
                <div className="text-sm text-gray-600">Loading formulas...</div>
              ) : (
                <select
                  name="formulaId"
                  value={form.formulaId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
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
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={useCustomCompound}
                onChange={() => setUseCustomCompound(true)}
                className="w-4 h-4 text-[#40721D]"
              />
              <span className="text-sm font-medium text-gray-700">
                Custom compound
              </span>
            </label>
          </div>

          {useCustomCompound && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compound Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customCompoundName"
                value={form.customCompoundName}
                onChange={handleInputChange}
                placeholder="e.g., Gabapentin 5% Cream"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
              />
            </div>
          )}
        </div>

        {/* Prescription Details Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Prescription Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days Supply <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="daysSupply"
                value={form.daysSupply}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refills Authorized
              </label>
              <input
                type="number"
                name="refills"
                value={form.refills}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Directions/SIG <span className="text-red-500">*</span>
            </label>
            <textarea
              name="directions"
              value={form.directions}
              onChange={handleInputChange}
              placeholder="e.g., Apply topically to affected area twice daily"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
              required
            />
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Additional Information
          </h2>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleInputChange}
            placeholder="Any additional notes for the pharmacy..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Order"}
          </button>
          <Link
            href="/portal/orders"
            className="flex-1 py-2.5 px-4 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 text-center transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
