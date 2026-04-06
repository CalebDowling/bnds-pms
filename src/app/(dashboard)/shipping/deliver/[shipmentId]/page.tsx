"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SignaturePad from "@/components/signature/SignaturePad";
import {
  getDeliveryDetail,
  confirmDelivery,
  type DeliveryDetail,
  type ConfirmDeliveryData,
} from "./actions";
import type { GpsCoordinates, IdVerification } from "@/lib/delivery/signature-capture";

interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

export default function DriverDeliveryPage({ params }: PageProps) {
  const router = useRouter();
  const { shipmentId } = use(params);

  // Data state
  const [detail, setDetail] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [gps, setGps] = useState<GpsCoordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [deliveredTo, setDeliveredTo] = useState("");

  // ID verification (controlled substances)
  const [idVerification, setIdVerification] = useState<IdVerification>({
    idType: "driver_license",
    idNumber: "",
    idExpiration: "",
    verifiedByDriver: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load shipment details
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDeliveryDetail(shipmentId);
        if (!data) {
          setError("Shipment not found");
        } else {
          setDetail(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shipment");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shipmentId]);

  // GPS capture
  const captureGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this device");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.message || "Failed to capture location");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Auto-capture GPS on mount
  useEffect(() => {
    captureGps();
  }, [captureGps]);

  // Photo capture
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Signature
  const handleSignatureSave = (signatureData: string) => {
    setSignature(signatureData);
    setShowSignaturePad(false);
  };

  // Submit
  const handleConfirmDelivery = async () => {
    if (!signature) {
      setError("Please capture a signature before confirming delivery");
      return;
    }

    if (detail?.requiresIdVerification && !idVerification.verifiedByDriver) {
      setError("Please verify recipient ID for controlled substance delivery");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: ConfirmDeliveryData = {
        signatureBase64: signature,
        gpsCoordinates: gps,
        photoBase64: photo,
        notes: notes.trim() || null,
        deliveredTo: deliveredTo.trim() || null,
        idVerification:
          detail?.requiresIdVerification && idVerification.verifiedByDriver
            ? idVerification
            : null,
      };

      const result = await confirmDelivery(shipmentId, data);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to confirm delivery");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm delivery");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error States ─────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="text-center text-gray-500 py-12">Loading delivery details...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="text-center text-red-600 py-12">{error || "Shipment not found"}</div>
        <div className="text-center mt-4">
          <Link href="/shipping" className="text-[#40721D] hover:underline text-sm">
            Back to Shipping
          </Link>
        </div>
      </div>
    );
  }

  // ── Success State ──────────────────────────────────────────

  if (success) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Delivery Confirmed</h2>
          <p className="text-sm text-green-700 mb-6">
            {detail.patientName} &mdash;{" "}
            {detail.address
              ? `${detail.address.line1}, ${detail.address.city}`
              : "Address on file"}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/shipping"
              className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors text-center"
            >
              Back to Shipping
            </Link>
            <Link
              href="/shipping/routes"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Return to Route
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Delivery Already Completed ─────────────────────────────

  if (detail.status === "delivered") {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-blue-800 mb-2">Already Delivered</h2>
          <p className="text-sm text-blue-700 mb-4">This shipment has already been marked as delivered.</p>
          <Link href="/shipping" className="text-[#40721D] hover:underline text-sm">
            Back to Shipping
          </Link>
        </div>
      </div>
    );
  }

  // ── Main Delivery Form ─────────────────────────────────────

  const hasControlled = detail.items.some((i) => i.isControlled);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shipping" className="text-[#40721D] hover:underline text-sm">
          &larr; Back
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Deliver Shipment</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Patient & Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Delivery To
          </h2>
          <p className="text-lg font-semibold text-gray-900">{detail.patientName}</p>
          <p className="text-xs text-gray-500 font-mono">{detail.patientMrn}</p>
          {detail.address && (
            <div className="mt-2 text-sm text-gray-700">
              <p>{detail.address.line1}</p>
              {detail.address.line2 && <p>{detail.address.line2}</p>}
              <p>
                {detail.address.city}, {detail.address.state} {detail.address.zip}
              </p>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            {detail.requiresSignature && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-700 rounded">
                SIG REQUIRED
              </span>
            )}
            {detail.requiresColdChain && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                COLD CHAIN
              </span>
            )}
            {hasControlled && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 rounded">
                CONTROLLED
              </span>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Items ({detail.items.length})
          </h2>
          {detail.items.length === 0 ? (
            <p className="text-sm text-gray-400">No items in packing list</p>
          ) : (
            <div className="space-y-3">
              {detail.items.map((item) => (
                <div key={item.rxNumber} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.drugName} {item.strength || ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      Rx {item.rxNumber} &middot; Qty: {item.quantity}
                    </p>
                    {item.directions && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{item.directions}</p>
                    )}
                  </div>
                  {item.isControlled && (
                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 rounded">
                      C-II
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivered To */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Received By
          </h2>
          <input
            type="text"
            value={deliveredTo}
            onChange={(e) => setDeliveredTo(e.target.value)}
            placeholder="Name of person receiving delivery"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
          />
        </div>

        {/* Controlled Substance ID Verification */}
        {detail.requiresIdVerification && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <h2 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-3">
              ID Verification Required (Controlled Substance)
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">ID Type</label>
                <select
                  value={idVerification.idType}
                  onChange={(e) =>
                    setIdVerification({
                      ...idVerification,
                      idType: e.target.value as IdVerification["idType"],
                    })
                  }
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  <option value="driver_license">Driver&apos;s License</option>
                  <option value="passport">Passport</option>
                  <option value="state_id">State ID</option>
                  <option value="military_id">Military ID</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">ID Number</label>
                <input
                  type="text"
                  value={idVerification.idNumber}
                  onChange={(e) =>
                    setIdVerification({ ...idVerification, idNumber: e.target.value })
                  }
                  placeholder="Enter ID number"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">
                  ID Expiration (optional)
                </label>
                <input
                  type="date"
                  value={idVerification.idExpiration || ""}
                  onChange={(e) =>
                    setIdVerification({ ...idVerification, idExpiration: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={idVerification.verifiedByDriver}
                  onChange={(e) =>
                    setIdVerification({
                      ...idVerification,
                      verifiedByDriver: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm text-red-800 font-medium">
                  I have verified the recipient&apos;s identity
                </span>
              </label>
            </div>
          </div>
        )}

        {/* GPS Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            GPS Location
          </h2>
          {gps ? (
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
              <div>
                <p className="text-sm text-gray-900">
                  {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                </p>
                {gps.accuracy && (
                  <p className="text-xs text-gray-500">
                    Accuracy: {Math.round(gps.accuracy)}m
                  </p>
                )}
              </div>
              <button
                onClick={captureGps}
                className="ml-auto text-xs text-[#40721D] hover:underline"
              >
                Refresh
              </button>
            </div>
          ) : gpsLoading ? (
            <p className="text-sm text-gray-500">Acquiring location...</p>
          ) : (
            <div>
              {gpsError && <p className="text-xs text-red-600 mb-2">{gpsError}</p>}
              <button
                onClick={captureGps}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Capture Location
              </button>
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Proof of Delivery Photo
          </h2>
          {photo ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Delivery proof"
                className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={() => setPhoto(null)}
                  className="px-3 py-1.5 border border-red-200 text-red-700 text-sm rounded-lg hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#40721D] hover:text-[#40721D] transition-colors"
            >
              Tap to take photo or upload
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Delivery Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Delivery Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Left at front door, handed to patient, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D] resize-none"
          />
        </div>

        {/* Signature Capture */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Recipient Signature
          </h2>
          {signature ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-green-700 font-medium">Signature captured</span>
              </div>
              <button
                onClick={() => setShowSignaturePad(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Re-sign
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSignaturePad(true)}
              className="w-full py-6 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
            >
              Capture Signature
            </button>
          )}

          {showSignaturePad && (
            <div className="mt-4">
              <SignaturePad onSave={handleSignatureSave} width={500} height={200} />
            </div>
          )}
        </div>

        {/* Summary Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Delivery Checklist
          </h2>
          <div className="space-y-2">
            <CheckItem label="Signature captured" done={!!signature} />
            <CheckItem label="GPS location acquired" done={!!gps} />
            <CheckItem label="Photo taken" done={!!photo} optional />
            {detail.requiresIdVerification && (
              <CheckItem label="ID verified (controlled)" done={idVerification.verifiedByDriver} />
            )}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirmDelivery}
          disabled={saving || !signature}
          className="w-full py-4 bg-[#40721D] text-white text-base font-semibold rounded-xl hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Confirming Delivery..." : "Confirm Delivery"}
        </button>
      </div>
    </div>
  );
}

// ── Helper Component ─────────────────────────────────────────

function CheckItem({
  label,
  done,
  optional,
}: {
  label: string;
  done: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-3 h-3 rounded-full shrink-0 ${
          done ? "bg-green-500" : optional ? "bg-gray-300" : "bg-yellow-400"
        }`}
      />
      <span className={`text-sm ${done ? "text-gray-700" : "text-gray-500"}`}>
        {label}
        {optional && !done && (
          <span className="text-xs text-gray-400 ml-1">(optional)</span>
        )}
      </span>
    </div>
  );
}
