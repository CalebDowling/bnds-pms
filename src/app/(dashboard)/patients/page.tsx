import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { getPatients, findDuplicatePatients, getPatientCounts, type PatientFilter } from "./actions";
import { formatDate, formatPhone, calculateAge, getInitials } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";

// BNDS PMS Redesign — Patients tabs match the Claude Design:
//   All N · Recent N · Flagged N · Birthdays this week N
// Filled forest pill for the active tab, paper-outlined pills with neutral
// count chips for the rest. Tabs sit above the FilterBar on a separate row.
const TABS: ReadonlyArray<{ value: PatientFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "flagged", label: "Flagged" },
  { value: "birthdays", label: "Birthdays this week" },
];

function isPatientFilter(value: string | undefined): value is PatientFilter {
  return value === "all" || value === "recent" || value === "flagged" || value === "birthdays";
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; filter?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const filter: PatientFilter = isPatientFilter(params.filter) ? params.filter : "all";
  // Legacy `?status=` URLs (from older bookmarks / exports) still resolve.
  const legacyStatus = params.status;

  const [{ patients, total, pages }, counts, duplicateClusters] = await Promise.all([
    getPatients({ search, filter, status: legacyStatus, page }),
    getPatientCounts(),
    // Surface duplicate-patient clusters so an admin can review and merge.
    // Detection is non-destructive — we only flag, never auto-merge, since
    // each row may carry distinct prescription / claim history.
    // Round 9 found "Broussard-Walker, Greta x2" and "Chesson Walker x2".
    findDuplicatePatients(),
  ]);

  const subtitleCount = counts.all.toLocaleString();
  const content = (
    <PageShell
      eyebrow="People"
      title="Patients"
      subtitle={`${subtitleCount} active patient${counts.all === 1 ? "" : "s"} on file`}
      actions={
        <>
          <ExportButton
            endpoint="/api/export/patients"
            filename={`patients_${new Date().toISOString().split("T")[0]}`}
            sheetName="Patients"
            params={{ filter, search }}
          />
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "7px 13px",
              fontSize: 13,
            }}
          >
            <Plus size={14} strokeWidth={2} /> Add Patient
          </Link>
        </>
      }
      toolbar={
        <div className="space-y-3">
          {/* Tabs row — heritage forest active, paper-outlined inactive, count chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((tab) => {
              const isActive = filter === tab.value;
              const count = counts[tab.value];
              const search_qs = search ? `&search=${encodeURIComponent(search)}` : "";
              return (
                <Link
                  key={tab.value}
                  href={`/patients?filter=${tab.value}${search_qs}`}
                  className="inline-flex items-center gap-2 rounded-md no-underline transition-colors"
                  style={{
                    backgroundColor: isActive ? "#1f5a3a" : "#ffffff",
                    color: isActive ? "#ffffff" : "#3a4a3c",
                    border: isActive ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "#f4ede0",
                      color: isActive ? "#ffffff" : "#5a6b58",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "1px 7px",
                      borderRadius: 999,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {count.toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Search bar */}
          <FilterBar
            search={
              <Suspense fallback={null}>
                <SearchBar
                  placeholder="Search by name, MRN, phone, or email..."
                  basePath="/patients"
                />
              </Suspense>
            }
          />
        </div>
      }
    >
      {duplicateClusters.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-900">
                {duplicateClusters.length} possible duplicate{duplicateClusters.length === 1 ? "" : "s"} on file
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                The following patients share the same name and date of birth. Review each pair and merge manually if they refer to the same person.
              </p>
              <ul className="mt-2 space-y-1.5">
                {duplicateClusters.slice(0, 5).map((cluster) => (
                  <li key={cluster.key} className="text-xs">
                    <span className="font-semibold text-amber-900">
                      {formatPatientName({ firstName: cluster.firstName, lastName: cluster.lastName }, { format: "last-first" })}
                    </span>
                    <span className="text-amber-800"> &middot; DOB {formatDate(cluster.dateOfBirth)} &middot; </span>
                    {cluster.patients.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ", "}
                        <Link href={`/patients/${p.id}`} className="underline hover:text-amber-900">
                          {p.mrn}
                        </Link>
                      </span>
                    ))}
                  </li>
                ))}
                {duplicateClusters.length > 5 && (
                  <li className="text-xs italic text-amber-800">
                    +{duplicateClusters.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {patients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>
              {search ? "No patients match your search" : "No patients yet"}
            </p>
            {!search && (
              <Link
                href="/patients/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "#1f5a3a" }}
              >
                Add your first patient
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>MRN</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>DOB / Age</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Phone</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Allergies</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Insurance</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
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
                      style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/patients/${patient.id}`} className="flex items-center gap-3 no-underline">
                          <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 999,
                              backgroundColor: "#1f5a3a",
                              color: "#ffffff",
                              fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          >
                            {getInitials(patient.firstName, patient.lastName)}
                          </div>
                          <div>
                            <p style={{ color: "#0f2e1f", fontWeight: 500, fontSize: 13 }}>
                              {formatPatientName({ firstName: patient.firstName, lastName: patient.lastName }, { format: "last-first" })}{patient.suffix ? ` ${patient.suffix}` : ""}
                            </p>
                            {patient.email && (
                              <p style={{ color: "#7a8a78", fontSize: 12 }}>{patient.email}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "#3a4a3c", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{patient.mrn}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#3a4a3c", fontSize: 13 }}>{formatDate(patient.dateOfBirth)}</p>
                        <p style={{ color: "#7a8a78", fontSize: 12 }}>{calculateAge(patient.dateOfBirth)} yrs</p>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "#3a4a3c", fontSize: 13 }}>
                          {primaryPhone ? formatPhone(primaryPhone.number) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {allergyCount > 0 ? (
                          <span
                            className="inline-flex items-center"
                            style={{
                              backgroundColor: "rgba(184,58,47,0.10)",
                              color: "#9a2c1f",
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            {allergyCount} allerg{allergyCount === 1 ? "y" : "ies"}
                          </span>
                        ) : (
                          <span style={{ color: "#7a8a78", fontSize: 12 }}>NKDA</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {activeInsurance.length > 0 ? (
                          <span
                            className="inline-flex items-center"
                            style={{
                              backgroundColor: "rgba(90,168,69,0.14)",
                              color: "#2d6a1f",
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            {activeInsurance.length} plan{activeInsurance.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span style={{ color: "#7a8a78", fontSize: 12 }}>Cash</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center capitalize"
                          style={{
                            backgroundColor:
                              patient.status === "active"
                                ? "rgba(90,168,69,0.14)"
                                : patient.status === "inactive"
                                ? "rgba(122,138,120,0.14)"
                                : "rgba(184,58,47,0.10)",
                            color:
                              patient.status === "active"
                                ? "#2d6a1f"
                                : patient.status === "inactive"
                                ? "#5a6b58"
                                : "#9a2c1f",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
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
