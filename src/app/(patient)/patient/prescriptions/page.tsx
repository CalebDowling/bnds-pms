"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Prescription {
  id: string;
  rxNumber: string;
  status: string;
  directions?: string;
  quantityPrescribed?: number;
  refillsRemaining: number;
  refillsAuthorized: number;
  dateFilled?: string;
  expirationDate?: string;
  item?: {
    name: string;
    strength?: string;
    strengthUnit?: string;
  };
}

export default function PrescriptionsPage(): React.ReactNode {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("patient_token");

      if (!token) {
        router.push("/patient");
        return;
      }

      fetchPrescriptions(token);
    };

    checkAuth();
  }, [router]);

  const fetchPrescriptions = async (token: string) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/patient-portal/prescriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      const data = await response.json();

      setPrescriptions(data.prescriptions);
    } catch (err) {
      setError("Failed to load prescriptions");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          My Prescriptions
        </h1>
        <p className="text-gray-600">
          View all your active prescriptions and refill information.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {prescriptions.length > 0 ? (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {rx.item?.name || "Medication"}
                    {rx.item?.strength && (
                      <span className="text-base font-normal text-gray-600 ml-2">
                        {rx.item.strength} {rx.item.strengthUnit}
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Rx Number</p>
                      <p className="font-mono text-sm font-medium text-gray-900">
                        {rx.rxNumber}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-1 ${
                          rx.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : rx.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : rx.status === "filled"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {rx.status.charAt(0).toUpperCase() +
                          rx.status.slice(1)}
                      </span>
                    </div>

                    {rx.directions && (
                      <div>
                        <p className="text-sm text-gray-600">Directions</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {rx.directions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Refills</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {rx.refillsRemaining}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        of {rx.refillsAuthorized} authorized
                      </p>
                    </div>

                    {rx.quantityPrescribed && (
                      <div>
                        <p className="text-sm text-gray-600">Quantity</p>
                        <p className="font-medium text-gray-900">
                          {rx.quantityPrescribed} units
                        </p>
                      </div>
                    )}

                    {rx.dateFilled && (
                      <div>
                        <p className="text-sm text-gray-600">Last Filled</p>
                        <p className="text-sm text-gray-900">
                          {new Date(rx.dateFilled).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {rx.expirationDate && (
                      <div>
                        <p className="text-sm text-gray-600">Expires</p>
                        <p className="text-sm text-gray-900">
                          {new Date(rx.expirationDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {rx.refillsRemaining > 0 &&
                    (!rx.expirationDate ||
                      new Date(rx.expirationDate) > new Date()) && (
                      <Link
                        href="/patient/refills"
                        className="inline-block mt-6 px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
                      >
                        Request Refill
                      </Link>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-600">No prescriptions found</p>
        </div>
      )}
    </div>
  );
}
