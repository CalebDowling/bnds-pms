import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getPatient } from "../actions";
import { formatDate, formatPhone, calculateAge, getInitials } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import PatientTabs from "./PatientTabs";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { BreadcrumbLabel } from "@/components/ui/Breadcrumbs";

async function PatientDetailPageContent({
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
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      {/* Replace the UUID segment in the global breadcrumb with the
          patient's name (e.g. "Patients > John Smith" instead of
          "Patients > #abc12345..."). */}
      <BreadcrumbLabel segment={id} label={formatPatientName(patient)} />

      {/* BNDS PMS Redesign — Patient header pattern: 64px initials avatar +
          Source Serif 4 name + meta chips (MRN | DOB | gender | status) */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {getInitials(patient.firstName, patient.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-semibold uppercase"
              style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
            >
              Patient
            </div>
            <h1
              className="truncate"
              style={{
                fontFamily:
                  "var(--font-serif), 'Source Serif 4', Georgia, serif",
                fontSize: 28,
                fontWeight: 500,
                color: "#0f2e1f",
                marginTop: 2,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {formatPatientName(patient, { format: "last-first-mi" })}
              {patient.suffix ? ` ${patient.suffix}` : ""}
            </h1>
            <div
              className="flex items-center gap-2 flex-wrap mt-1"
              style={{ fontSize: 13, color: "#5a6b58" }}
            >
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                {patient.mrn}
              </span>
              <span style={{ color: "#a3a89c" }}>·</span>
              <span>
                {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)} yrs)
              </span>
              <span style={{ color: "#a3a89c" }}>·</span>
              <span className="capitalize">{patient.gender || "—"}</span>
              <span style={{ color: "#a3a89c" }}>·</span>
              <span
                className="inline-flex items-center capitalize"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor:
                    patient.status === "active"
                      ? "rgba(90,168,69,0.12)"
                      : "rgba(122,138,120,0.14)",
                  color: patient.status === "active" ? "#2d6a1f" : "#5a6b58",
                }}
              >
                {patient.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Pre-fill the patient on /prescriptions/new via ?patientId=...
              so the tech doesn't have to re-find them in the picker. */}
          <Link
            href={`/prescriptions/new?patientId=${id}`}
            className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "7px 13px",
              fontSize: 13,
            }}
          >
            <Plus size={14} strokeWidth={2} />
            New Rx
          </Link>
          <Link
            href={`/patients/${id}/edit`}
            className="inline-flex items-center rounded-md font-medium no-underline transition-colors"
            style={{
              backgroundColor: "#ffffff",
              color: "#0f2e1f",
              border: "1px solid #d9d2c2",
              padding: "7px 13px",
              fontSize: 13,
            }}
          >
            Edit
          </Link>
          <Link
            href="/patients"
            className="inline-flex items-center font-medium transition-colors no-underline"
            style={{
              color: "#7a8a78",
              padding: "7px 10px",
              fontSize: 13,
            }}
          >
            Back to List
          </Link>
        </div>
      </header>

      {/* Quick info — paper cards (white bg + #e3ddd1 line border) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Phone */}
        <div
          className="rounded-lg"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e3ddd1",
            padding: "12px 14px",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase mb-1"
            style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
          >
            Phone
          </p>
          <p style={{ fontSize: 14, color: "#0f2e1f" }}>
            {primaryPhone ? formatPhone(primaryPhone.number) : "No phone"}
          </p>
          {primaryPhone && (
            <p
              className="capitalize"
              style={{ fontSize: 12, color: "#7a8a78", marginTop: 2 }}
            >
              {primaryPhone.phoneType}
            </p>
          )}
        </div>

        {/* Address */}
        <div
          className="rounded-lg"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e3ddd1",
            padding: "12px 14px",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase mb-1"
            style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
          >
            Address
          </p>
          {primaryAddress ? (
            <>
              <p style={{ fontSize: 14, color: "#0f2e1f" }}>
                {primaryAddress.line1}
              </p>
              <p style={{ fontSize: 12, color: "#7a8a78", marginTop: 2 }}>
                {primaryAddress.city}, {primaryAddress.state} {primaryAddress.zip}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 14, color: "#7a8a78" }}>No address</p>
          )}
        </div>

        {/* Allergies */}
        <div
          className="rounded-lg"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e3ddd1",
            padding: "12px 14px",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase mb-1"
            style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
          >
            Allergies
          </p>
          {activeAllergies.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {activeAllergies.slice(0, 3).map((a) => {
                const severe =
                  a.severity === "life_threatening" || a.severity === "severe";
                return (
                  <span
                    key={a.id}
                    className="inline-flex items-center"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor: severe
                        ? "rgba(184,58,47,0.10)"
                        : "rgba(212,138,40,0.12)",
                      color: severe ? "#9a2c1f" : "#8a5a17",
                    }}
                  >
                    {a.allergen}
                  </span>
                );
              })}
              {activeAllergies.length > 3 && (
                <span style={{ fontSize: 11, color: "#7a8a78" }}>
                  +{activeAllergies.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "#2d6a1f", fontWeight: 500 }}>
              NKDA
            </p>
          )}
        </div>

        {/* Insurance */}
        <div
          className="rounded-lg"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e3ddd1",
            padding: "12px 14px",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase mb-1"
            style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
          >
            Insurance
          </p>
          {activeInsurance.length > 0 ? (
            activeInsurance.map((ins) => (
              <p key={ins.id} style={{ fontSize: 14, color: "#0f2e1f" }}>
                <span className="capitalize">{ins.priority}</span>: {ins.memberId}
              </p>
            ))
          ) : (
            <p style={{ fontSize: 14, color: "#7a8a78" }}>Cash / Self-pay</p>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <PatientTabs patient={patient} />
    </div>
  );
}
export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PermissionGuard resource="patients" action="read">
      <PatientDetailPageContent params={params} />
    </PermissionGuard>
  );
}
