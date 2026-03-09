import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatient } from "../actions";
import { formatDate, formatPhone, calculateAge, getInitials } from "@/lib/utils";
import PatientTabs from "./PatientTabs";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);

  if (!patient) {
    notFound();
  }

  const primaryPhone =
    patient.phoneNumbers.find((p) => p.isPrimary) || patient.phoneNumbers[0];
  const primaryAddress =
    patient.addresses.find((a) => a.isDefault) || patient.addresses[0];
  const activeAllergies = patient.allergies.filter((a) => a.status === "active");
  const activeInsurance = patient.insurance.filter((i) => i.isActive);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1B4F72] flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {getInitials(patient.firstName, patient.lastName)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.lastName}, {patient.firstName}
              {patient.middleName ? ` ${patient.middleName.charAt(0)}.` : ""}
              {patient.suffix ? ` ${patient.suffix}` : ""}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 font-mono">{patient.mrn}</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)} yrs)
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500 capitalize">{patient.gender || "—"}</span>
              <span className="text-gray-300">|</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  patient.status === "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {patient.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/patients/${id}/edit`}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
          <Link
            href="/patients"
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Phone */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Phone</p>
          <p className="text-sm text-gray-900">
            {primaryPhone ? formatPhone(primaryPhone.number) : "No phone"}
          </p>
          {primaryPhone && (
            <p className="text-xs text-gray-400 capitalize">{primaryPhone.phoneType}</p>
          )}
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Address</p>
          {primaryAddress ? (
            <>
              <p className="text-sm text-gray-900">{primaryAddress.line1}</p>
              <p className="text-xs text-gray-400">
                {primaryAddress.city}, {primaryAddress.state} {primaryAddress.zip}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No address</p>
          )}
        </div>

        {/* Allergies */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Allergies</p>
          {activeAllergies.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {activeAllergies.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    a.severity === "life_threatening" || a.severity === "severe"
                      ? "bg-red-100 text-red-800"
                      : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {a.allergen}
                </span>
              ))}
              {activeAllergies.length > 3 && (
                <span className="text-xs text-gray-400">+{activeAllergies.length - 3} more</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-green-600 font-medium">NKDA</p>
          )}
        </div>

        {/* Insurance */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Insurance</p>
          {activeInsurance.length > 0 ? (
            activeInsurance.map((ins) => (
              <p key={ins.id} className="text-sm text-gray-900">
                <span className="capitalize">{ins.priority}</span>: {ins.memberId}
              </p>
            ))
          ) : (
            <p className="text-sm text-gray-400">Cash / Self-pay</p>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <PatientTabs patient={patient} />
    </div>
  );
}
