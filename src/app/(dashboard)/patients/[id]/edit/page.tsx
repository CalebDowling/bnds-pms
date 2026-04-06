import { notFound } from "next/navigation";
import { getPatient } from "../../actions";
import PatientForm from "../../PatientForm";
import PermissionGuard from "@/components/auth/PermissionGuard";

async function EditPatientPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);

  if (!patient) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Patient</h1>
        <p className="text-sm text-gray-500 mt-1">
          {patient.lastName}, {patient.firstName} — {patient.mrn}
        </p>
      </div>
      <PatientForm
        patientId={id}
        initialData={{
          firstName: patient.firstName,
          middleName: patient.middleName || "",
          lastName: patient.lastName,
          suffix: patient.suffix || "",
          dateOfBirth: patient.dateOfBirth.toISOString().split("T")[0],
          gender: patient.gender || "",
          ssnLastFour: patient.ssnLastFour || "",
          email: patient.email || "",
          preferredContact: patient.preferredContact,
          preferredLanguage: patient.preferredLanguage,
          notes: patient.notes || "",
        }}
      />
    </div>
  );
}
export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PermissionGuard resource="patients" action="write">
      <EditPatientPageContent params={params} />
    </PermissionGuard>
  );
}
