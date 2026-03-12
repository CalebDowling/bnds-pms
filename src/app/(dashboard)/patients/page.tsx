import Link from "next/link";
import { getPatients } from "./actions";
import { formatDate, formatPhone, calculateAge, getInitials } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "active";

  const { patients, total, pages } = await getPatients({ search, status, page });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">{total} patients</p>
        </div>
        <Link
          href="/patients/new"
          className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
        >
          + Add Patient
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <Suspense fallback={null}>
            <SearchBar
              placeholder="Search by name, MRN, phone, or email..."
              basePath="/patients"
            />
          </Suspense>
          <div className="flex gap-2">
            {["active", "inactive", "all"].map((s) => (
              <Link
                key={s}
                href={`/patients?status=${s}${search ? `&search=${search}` : ""}`}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  status === s
                    ? "bg-[#40721D] text-white border-[#40721D]"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {patients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">
              {search ? "No patients match your search" : "No patients yet"}
            </p>
            {!search && (
              <Link
                href="/patients/new"
                className="text-[#40721D] text-sm font-medium hover:underline"
              >
                Add your first patient
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MRN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DOB / Age</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Allergies</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Insurance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient) => {
                  const primaryPhone = patient.phoneNumbers.find((p) => p.isPrimary) || patient.phoneNumbers[0];
                  const allergyCount = patient.allergies.length;
                  const activeInsurance = patient.insurance.filter((i) => i.isActive);

                  return (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/patients/${patient.id}`} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#40721D] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                              {getInitials(patient.firstName, patient.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {patient.lastName}, {patient.firstName}{patient.suffix ? ` ${patient.suffix}` : ""}
                            </p>
                            {patient.email && <p className="text-xs text-gray-400">{patient.email}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 font-mono">{patient.mrn}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{formatDate(patient.dateOfBirth)}</p>
                        <p className="text-xs text-gray-400">{calculateAge(patient.dateOfBirth)} yrs</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {primaryPhone ? formatPhone(primaryPhone.number) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {allergyCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-full">
                            {allergyCount} allerg{allergyCount === 1 ? "y" : "ies"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">NKDA</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {activeInsurance.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            {activeInsurance.length} plan{activeInsurance.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Cash</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          patient.status === "active" ? "bg-green-50 text-green-700"
                            : patient.status === "inactive" ? "bg-gray-100 text-gray-600"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/patients" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
