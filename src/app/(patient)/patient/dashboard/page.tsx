"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Prescription {
  id: string;
  rxNumber: string;
  status: string;
  refillsRemaining: number;
  item?: {
    name: string;
  };
}

interface RefillRequest {
  id: string;
  status: string;
  requestedAt: string;
  prescription: {
    rxNumber: string;
  };
}

export default function PatientDashboard(): React.ReactNode {
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refillRequests, setRefillRequests] = useState<RefillRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("patient_token");
      const name = localStorage.getItem("patient_name");

      if (!token) {
        router.push("/patient");
        return;
      }

      setPatientName(name || "");
      fetchDashboardData(token);
    };

    checkAuth();
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch prescriptions
      const rxResponse = await fetch("/api/patient-portal/prescriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!rxResponse.ok) throw new Error("Failed to fetch prescriptions");
      const rxData = await rxResponse.json();

      // Fetch refill requests
      const refillResponse = await fetch("/api/patient-portal/refills", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!refillResponse.ok) throw new Error("Failed to fetch refill requests");
      const refillData = await refillResponse.json();

      setPrescriptions(rxData.prescriptions.slice(0, 3)); // Show top 3
      setRefillRequests(refillData.refillRequests.slice(0, 3)); // Show top 3
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#40721D] to-[#5a9f2a] text-white rounded-2xl p-8 shadow-lg shadow-green-200/30">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {patientName}!</h1>
        <p className="text-green-50">
          Manage your prescriptions and health information all in one place.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link href="/patient/refills">
          <div className="p-6 border border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md hover:border-[#40721D]/30 transition-all cursor-pointer">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#40721D]/10 to-[#40721D]/5 rounded-lg mb-3">
              <span className="text-2xl">💊</span>
            </div>
            <h3 className="font-semibold text-gray-900">Request a Refill</h3>
            <p className="text-sm text-gray-600 mt-2">
              Refill your prescriptions online
            </p>
          </div>
        </Link>

        <Link href="/patient/messages">
          <div className="p-6 border border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md hover:border-[#40721D]/30 transition-all cursor-pointer">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#40721D]/10 to-[#40721D]/5 rounded-lg mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="font-semibold text-gray-900">Send a Message</h3>
            <p className="text-sm text-gray-600 mt-2">
              Communicate with our pharmacy
            </p>
          </div>
        </Link>
      </div>

      {/* Active Prescriptions Summary */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Recent Prescriptions
          </h2>
          <Link href="/patient/prescriptions" className="text-[#40721D] text-sm font-semibold hover:text-[#2D5114] transition-colors">
            View All
          </Link>
        </div>

        {prescriptions.length > 0 ? (
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-5 border border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md hover:border-[#40721D]/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {rx.item?.name || "Medication"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Rx# {rx.rxNumber}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Status: <span className="font-medium text-gray-700">{rx.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {rx.refillsRemaining} refill{rx.refillsRemaining !== 1 ? "s" : ""}
                    </p>
                    {rx.refillsRemaining > 0 && (
                      <Link
                        href="/patient/refills"
                        className="text-xs text-[#40721D] font-semibold hover:text-[#2D5114] transition-colors mt-2 block"
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
          <div className="text-center py-10 border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
            <p className="text-gray-600">No prescriptions yet</p>
          </div>
        )}
      </div>

      {/* Recent Refill Requests */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          Recent Refill Requests
        </h2>

        {refillRequests.length > 0 ? (
          <div className="space-y-3">
            {refillRequests.map((request) => (
              <div
                key={request.id}
                className="p-5 border border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Rx# {request.prescription.rxNumber}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Requested on{" "}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-3 py-1.5 text-xs font-semibold rounded-full ${
                        request.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : request.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() +
                        request.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
            <p className="text-gray-600">No refill requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
