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
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Prescriptions</h1>
          <p className="text-sm sm:text-base text-gray-600">
            View all your active prescriptions and refill information.
          </p>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-40 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-24 animate-pulse"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-32 animate-pulse"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-28 animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-16 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-24 animate-pulse"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-32 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          My Prescriptions
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View all your active prescriptions and refill information.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {prescriptions.length > 0 ? (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {rx.item?.name || "Medication"}
                    {rx.item?.strength && (
                      <span className="text-base font-semibold text-gray-600 ml-2 block sm:inline">
                        {rx.item.strength} {rx.item.strengthUnit}
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between sm:block">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide font-semibold">Rx Number</p>
                        <p className="font-mono text-sm font-semibold text-gray-900 mt-1">
                          {rx.rxNumber}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide font-semibold">Status</p>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full mt-2 ${
                          rx.status === "completed"
                            ? "bg-green-100/80 text-green-700 ring-1 ring-green-300"
                            : rx.status === "pending"
                              ? "bg-yellow-100/80 text-yellow-700 ring-1 ring-yellow-300"
                              : rx.status === "filled"
                                ? "bg-blue-100/80 text-blue-700 ring-1 ring-blue-300"
                                : "bg-gray-100 text-gray-700 ring-1 ring-gray-300"
                        }`}
                      >
                        {rx.status.charAt(0).toUpperCase() +
                          rx.status.slice(1)}
                      </span>
                    </div>

                    {rx.directions && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide font-semibold">Directions</p>
                        <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                          {rx.directions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-[#40721D]/5 to-transparent p-4 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Refills Available</p>
                      <p className="text-3xl sm:text-4xl font-bold text-[#40721D] mt-2">
                        {rx.refillsRemaining}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        of {rx.refillsAuthorized} authorized
                      </p>
                    </div>

                    {rx.quantityPrescribed && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide font-semibold">Quantity</p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900 mt-1">
                          {rx.quantityPrescribed} units
                        </p>
                      </div>
                    )}

                    {rx.dateFilled && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide font-semibold">Last Filled</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(rx.dateFilled).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {rx.expirationDate && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide font-semibold">Expires</p>
                        <p className={`text-sm mt-1 font-medium ${new Date(rx.expirationDate) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
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
                        className="inline-block mt-6 px-5 py-2.5 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] hover:shadow-lg transition-all duration-200"
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
        <div className="text-center py-12 sm:py-16 border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
          <svg className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-base sm:text-lg text-gray-600 font-semibold">No prescriptions found</p>
          <p className="text-sm text-gray-500 mt-2">Your prescriptions will appear here once available</p>
        </div>
      )}
    </div>
  );
}
