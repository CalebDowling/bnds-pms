import Link from "next/link";
import { Plus } from "lucide-react";
import { getPatients } from "./actions";
import { formatDate, formatPhone, calculateAge, getInitials } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
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

  const content = (
    <PageShell
      title="Patients"
      subtitle={`${total.toLocaleString()} patient${total === 1 ? "" : "s"} on file`}
      actions={
        <>
          <ExportButton
            endpoint="/api/export/patients"
            filename={`patients_${new Date().toISOString().split("T")[0]}`}
            sheetName="Patients"
            params={{ status, search }}
          />
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Plus size={14} /> Add Patient
          </Link>
        </>
      }
      toolbar={
        <FilterBar
          search={
            <Suspense fallback={null}>
              <SearchBar
                placeholder="Search by name, MRN, phone, or email..."
                basePath="/patients"
              />
            </Suspense>
          }
          filters={
            <>
              {["active", "inactive", "all"].map((s) => (
                <Link
                  key={s}
                  href={`/patients?status=${s}${search ? `&search=${search}` : ""}`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: status === s ? "var(--color-primary)" : "transparent",
                    color: status === s ? "#fff" : "var(--text-secondary)",
                    borderColor: status === s ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Link>
              ))}
            </>
          }
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        {patients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "var(--text-muted)" }}>
              {search ? "No patients match your search" : "No patients yet"}
            </p>
            {!search && (
              <Link
                href="/patients/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Add your first patient
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>MRN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>DOB / Age</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Allergies</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Insurance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, idx) => {
                  const primaryPhone = patient.phoneNumbers.find((p) => p.isPrimary) || patient.phoneNumbers[0];
                  const allergyCount = patient.allergies.length;
                  const activeInsurance = patient.insurance.filter((i) => i.isActive);

                  return (
                    <tr
                      key={patient.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                      onMouseEnter={undefined}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/patients/${patient.id}`} className="flex items-center gap-3 no-underline">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "var(--color-primary)" }}
                          >
                            <span className="text-xs font-bold text-white">
                              {getInitials(patient.firstName, patient.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {formatPatientName({ firstName: patient.firstName, lastName: patient.lastName }, { format: "last-first" })}{patient.suffix ? ` ${patient.suffix}` : ""}
                            </p>
                            {patient.email && (
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{patient.email}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{patient.mrn}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(patient.dateOfBirth)}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{calculateAge(patient.dateOfBirth)} yrs</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {primaryPhone ? formatPhone(primaryPhone.number) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {allergyCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-full">
                            {allergyCount} allerg{allergyCount === 1 ? "y" : "ies"}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>NKDA</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {activeInsurance.length > 0 ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                            style={{ backgroundColor: "var(--green-100)", color: "var(--green-700)" }}
                          >
                            {activeInsurance.length} plan{activeInsurance.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Cash</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                          style={{
                            backgroundColor:
                              patient.status === "active"
                                ? "var(--green-100)"
                                : patient.status === "inactive"
                                ? "rgba(0,0,0,0.05)"
                                : "#fef2f2",
                            color:
                              patient.status === "active"
                                ? "var(--green-700)"
                                : patient.status === "inactive"
                                ? "var(--text-muted)"
                                : "#dc2626",
                          }}
                        >
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
    </PageShell>
  );

  return (
    <PermissionGuard resource="patients" action="read">
      {content}
    </PermissionGuard>
  );
}
