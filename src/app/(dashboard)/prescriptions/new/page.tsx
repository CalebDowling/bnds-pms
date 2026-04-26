import PermissionGuard from "@/components/auth/PermissionGuard";
import NewPrescriptionForm from "./NewPrescriptionForm";
import { getPatientForRx } from "@/app/(dashboard)/prescriptions/actions";

// Server-rendered entry: reads ?patientId=... so a "+ New Rx" button on a
// patient's page can pre-select the patient. The actual form is a client
// component (NewPrescriptionForm) that receives `initialPatient` as an
// optional prop.
export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawPatientId = Array.isArray(sp.patientId) ? sp.patientId[0] : sp.patientId;
  const initialPatient = rawPatientId ? await getPatientForRx(rawPatientId) : null;

  return (
    <PermissionGuard resource="prescriptions" action="write">
      <NewPrescriptionForm initialPatient={initialPatient} />
    </PermissionGuard>
  );
}
