import PermissionGuard from "@/components/auth/PermissionGuard";
import IntakeRealtimeWrapper from "./IntakeRealtimeWrapper";

export default async function IntakeQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string; source?: string; sort?: string }>;
}) {
  return (
    <PermissionGuard resource="prescriptions" action="read">
      <IntakeRealtimeWrapper searchParams={searchParams} />
    </PermissionGuard>
  );
}
