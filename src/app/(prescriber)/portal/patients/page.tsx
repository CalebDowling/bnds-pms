"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HumanPatient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  phone?: string;
  lastOrderDate?: string;
  orderCount: number;
  status: string;
  type: "human";
}

interface AnimalPatient {
  id: string;
  name: string;
  species: string;
  breed?: string;
  ownerName: string;
  ownerPhone?: string;
  lastOrderDate?: string;
  orderCount: number;
  status: string;
  type: "animal";
}

type Patient = HumanPatient | AnimalPatient;

type PatientTab = "human" | "animal";

export default function PatientsPage(): React.ReactNode {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<PatientTab>("human");

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("prescriber_token");

      if (!token) {
        router.push("/portal");
        return;
      }

      await fetchPatients(token);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    filterPatients();
  }, [patients, activeTab, searchTerm]);

  const fetchPatients = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/prescriber-portal/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("prescriber_token");
          router.push("/portal");
          return;
        }
        throw new Error("Failed to fetch patients");
      }

      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load patients"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filterPatients = () => {
    let filtered = patients.filter((p) => p.type === activeTab);

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((patient) => {
        if (patient.type === "human") {
          return (
            patient.firstName.toLowerCase().includes(searchLower) ||
            patient.lastName.toLowerCase().includes(searchLower) ||
            patient.phone?.toLowerCase().includes(searchLower)
          );
        } else {
          return (
            patient.name.toLowerCase().includes(searchLower) ||
            patient.species.toLowerCase().includes(searchLower) ||
            patient.ownerName.toLowerCase().includes(searchLower) ||
            patient.ownerPhone?.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    setFilteredPatients(filtered);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading patients...</div>
      </div>
    );
  }

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
        .tab-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #40721D;
          animation: fadeUp 0.3s ease-out;
        }
      `}</style>

      {/* Page Header */}
      <div className="mb-8" style={{ animation: "fadeUp 0.5s ease-out" }}>
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">Patients</h1>
          <p className="text-[13px] text-gray-600 mt-2">
            View and manage your patients
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={
            activeTab === "human"
              ? "Search by patient name or phone..."
              : "Search by animal name, species, or owner..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-100">
        <button
          onClick={() => {
            setActiveTab("human");
            setSearchTerm("");
          }}
          className={`relative px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
            activeTab === "human"
              ? "text-[#40721D] tab-active"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Human Patients
        </button>
        <button
          onClick={() => {
            setActiveTab("animal");
            setSearchTerm("");
          }}
          className={`relative px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
            activeTab === "animal"
              ? "text-[#40721D] tab-active"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Animal Patients
        </button>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-gray-600">
              {searchTerm
                ? "No patients match your search"
                : `No ${activeTab} patients found`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {activeTab === "human" ? "Name" : "Animal/Owner"}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {activeTab === "human" ? "Date of Birth" : "Species/Breed"}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Last Order
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    # Orders
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-[#f8faf6] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">
                      {patient.type === "human"
                        ? `${patient.firstName} ${patient.lastName}`
                        : `${patient.name} / ${patient.ownerName}`}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-600">
                      {patient.type === "human"
                        ? new Date(patient.dob).toLocaleDateString()
                        : `${patient.species}${patient.breed ? ` - ${patient.breed}` : ""}`}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-600">
                      {patient.type === "human"
                        ? patient.phone || "-"
                        : patient.ownerPhone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-600">
                      {patient.lastOrderDate
                        ? new Date(patient.lastOrderDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-semibold text-[#40721D]">
                      {patient.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          patient.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {patient.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          router.push(`/portal/patients/${patient.id}`)
                        }
                        className="text-[#40721D] hover:text-[#355f1a] text-[13px] font-semibold transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
