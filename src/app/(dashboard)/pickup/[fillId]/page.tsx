"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/signature/SignaturePad";
import { getPickupFill, completePickup } from "../actions";
import Link from "next/link";
import React from "react";

interface PageProps {
  params: Promise<{
    fillId: string;
  }>;
}

export default function PickupProcessingPage({ params }: PageProps) {
  const router = useRouter();
  const { fillId } = use(params);
  const [fill, setFill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Form state
  const [checklist, setChecklist] = useState({
    idVerified: false,
    counselingOffered: false,
    allergiesReviewed: false,
  });

  const [pickupPerson, setPickupPerson] = useState({
    name: "",
    relationship: "self",
    idType: "driver_license",
    idNumber: "",
  });

  // Load fill data
  React.useEffect(() => {
    const loadFill = async () => {
      try {
        const data = await getPickupFill(fillId);
        setFill(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load fill");
      } finally {
        setLoading(false);
      }
    };

    loadFill();
  }, [fillId]);

  const handleSignatureSave = (signatureData: string) => {
    setSignature(signatureData);
    setShowSignaturePad(false);
  };

  const handleCompletePickup = async () => {
    if (!signature) {
      setError("Please capture a signature");
      return;
    }

    if (!checklist.idVerified || !checklist.counselingOffered) {
      setError("Please complete all required checklist items");
      return;
    }

    setSaving(true);
    try {
      const pickupPersonData =
        pickupPerson.relationship === "self"
          ? undefined
          : {
              name: pickupPerson.name,
              relationship: pickupPerson.relationship,
              idType: pickupPerson.idType,
              idNumber: pickupPerson.idNumber,
            };

      await completePickup(fillId, {
        signatureBase64: signature,
        checklistVerified: {
          idVerified: checklist.idVerified,
          counselingOffered: checklist.counselingOffered,
          allergiesReviewed: checklist.allergiesReviewed,
        },
        pickupPerson: pickupPersonData,
        completedAt: new Date().toISOString(),
        completedBy: fillId,
      });

      // Redirect to pickup queue
      router.push("/pickup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete pickup");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!fill) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          {error || "Fill not found"}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/pickup"
            className="text-[#40721D] hover:underline text-sm"
          >
            Back to pickup queue
          </Link>
        </div>
      </div>
    );
  }

  const patientAge = Math.floor(
    (new Date().getTime() - new Date(fill.prescription.patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/pickup"
          className="text-[#40721D] hover:underline text-sm"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Process Pickup</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fill Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Prescription Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Rx Number</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {fill.prescription.rxNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Drug</p>
                <p className="text-sm font-semibold text-gray-900">
                  {fill.prescription.item?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Quantity</p>
                <p className="text-lg font-semibold text-gray-900">
                  {fill.quantity.toString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <p className="text-sm font-semibold text-green-700">
                  {fill.status === "ready"
                    ? "Ready"
                    : fill.status === "verified"
                      ? "Verified"
                      : "Completed"}
                </p>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Patient Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Name:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {fill.prescription.patient.firstName}{" "}
                  {fill.prescription.patient.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">MRN:</span>
                <span className="text-sm font-mono font-semibold text-gray-900">
                  {fill.prescription.patient.mrn}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Age:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {patientAge}
                </span>
              </div>
              {fill.prescription.prescriber && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Prescriber:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {fill.prescription.prescriber.firstName}{" "}
                    {fill.prescription.prescriber.lastName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Verification Checklist
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.idVerified}
                  onChange={(e) =>
                    setChecklist({
                      ...checklist,
                      idVerified: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#40721D] rounded"
                />
                <span className="text-sm text-gray-700">
                  Patient ID verified
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.counselingOffered}
                  onChange={(e) =>
                    setChecklist({
                      ...checklist,
                      counselingOffered: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#40721D] rounded"
                />
                <span className="text-sm text-gray-700">
                  Counseling offered
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.allergiesReviewed}
                  onChange={(e) =>
                    setChecklist({
                      ...checklist,
                      allergiesReviewed: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#40721D] rounded"
                />
                <span className="text-sm text-gray-700">
                  Allergies reviewed
                </span>
              </label>
            </div>
          </div>

          {/* Pickup Person */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pickup Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship to Patient
                </label>
                <select
                  value={pickupPerson.relationship}
                  onChange={(e) =>
                    setPickupPerson({
                      ...pickupPerson,
                      relationship: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                >
                  <option value="self">Patient (Self)</option>
                  <option value="family">Family Member</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {pickupPerson.relationship !== "self" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Person Name
                    </label>
                    <input
                      type="text"
                      value={pickupPerson.name}
                      onChange={(e) =>
                        setPickupPerson({
                          ...pickupPerson,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Type
                      </label>
                      <select
                        value={pickupPerson.idType}
                        onChange={(e) =>
                          setPickupPerson({
                            ...pickupPerson,
                            idType: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                      >
                        <option value="driver_license">Driver's License</option>
                        <option value="passport">Passport</option>
                        <option value="id_card">ID Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Number
                      </label>
                      <input
                        type="text"
                        value={pickupPerson.idNumber}
                        onChange={(e) =>
                          setPickupPerson({
                            ...pickupPerson,
                            idNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Signature Pad */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Patient Signature
            </h2>
            {signature ? (
              <div className="space-y-4">
                <p className="text-sm text-green-700 font-medium">
                  ✓ Signature captured
                </p>
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Re-sign
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSignaturePad(true)}
                className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
              >
                Capture Signature
              </button>
            )}

            {showSignaturePad && (
              <div className="mt-4">
                <SignaturePad onSave={handleSignatureSave} width={400} height={200} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Summary & Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Summary</h2>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full ${
                    checklist.idVerified
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-700">ID Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full ${
                    checklist.counselingOffered
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-700">
                  Counseling Offered
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full ${
                    checklist.allergiesReviewed
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-700">
                  Allergies Reviewed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full ${
                    signature
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-700">Signature Captured</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleCompletePickup}
                disabled={
                  saving ||
                  !checklist.idVerified ||
                  !checklist.counselingOffered ||
                  !signature
                }
                className="w-full px-4 py-2 bg-[#40721D] text-white font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Complete Pickup"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
