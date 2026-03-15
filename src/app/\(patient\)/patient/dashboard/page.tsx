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
      <div className="bg-gradient-to-r from-[#40721D] to-[#2D5114] text-white rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {patientName}!</h1>
        <p className="text-green-50">
          Manage your prescriptions and health information all in one place.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/patient/refills">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-2">💊</div>
            <h3 className="font-semibold text-gray-900">Request a Refill</h3>
            <p className="text-sm text-gray-600 mt-1">
              Refill your prescriptions online
            </p>
          </div>
        </Link>

        <Link href="/patient/messages">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-gray-900">Send a Message</h3>
            <p className="text-sm text-gray-600 mt-1">
              Communicate with our pharmacy
            </p>
          </div>
        </Link>
      </div>

      {/* Active Prescriptions Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Recent Prescriptions
          </h2>
          <Link href="/patient/prescriptions" className="text-[#40721D] text-sm font-medium hover:underline">
            View All
          </Link>
        </div>

        {prescriptions.length > 0 ? (
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {rx.item?.name || "Medication"}
                    </h3>
                    <p className="text-sm text-gray-600">Rx# {rx.rxNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: <span className="font-medium">{rx.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {rx.refillsRemaining} refill{rx.refillsRemaining !== 1 ? "s" : ""}
                    </p>
                    {rx.refillsRemaining > 0 && (
                      <Link
                        href="/patient/refills"
                        className="text-xs text-[#40721D] font-medium hover:underline mt-1 block"
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
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-600">No prescriptions yet</p>
          </div>
        )}
      </div>

      {/* Recent Refill Requests */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Recent Refill Requests
        </h2>

        {refillRequests.length > 0 ? (
          <div className="space-y-3">
            {refillRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Rx# {request.prescription.rxNumber}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested on{" "}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : request.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
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
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-600">No refill requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
