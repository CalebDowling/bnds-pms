import { Suspense } from "react";
import HardwareClient from "./client";
import { getHardwareConfig } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

async function HardwareContent() {
  const config = await getHardwareConfig();

  return <HardwareClient initialConfig={config} />;
}

export default function HardwarePage() {
  return (
    <PermissionGuard resource="billing" action="admin">
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <HardwareContent />
      </Suspense>
    </PermissionGuard>
  );
}
