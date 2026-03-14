import PatientForm from "../PatientForm";
import PermissionGuard from "@/components/auth/PermissionGuard";

function NewPatientPageContent() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Patient</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new patient record</p>
      </div>
      <PatientForm />
    </div>
  );
}
export default function NewPatientPage() {
  return (
    <PermissionGuard resource="patients" action="write">
      <NewPatientPageContent />
    </PermissionGuard>
  );
}
