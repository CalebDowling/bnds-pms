import { Suspense } from "react";
import { getIntegrationStatuses } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";
import IntegrationsClient from "./client";

export const dynamic = "force-dynamic";

async function IntegrationsContent() {
  const integrations = await getIntegrationStatuses();

  return <IntegrationsClient initialIntegrations={integrations} />;
}

export default function IntegrationsPage() {
  return (
    <PermissionGuard resource="settings" action="read">
      <Suspense fallback={<IntegrationsLoading />}>
        <IntegrationsContent />
      </Suspense>
    </PermissionGuard>
  );
}

function IntegrationsLoading() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
          <svg className="animate-spin w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-600">Loading integrations...</p>
      </div>
    </div>
  );
}
