"use client";

import React, { useState } from "react";

export interface IntegrationInfo {
  name: string;
  description: string;
  status: "connected" | "configured" | "planned" | "error" | "not_configured";
  icon: string;
}

// Simple toast notification helper
function showToast(message: string, type: "success" | "error" = "success") {
  // Create a temporary notification div
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm font-medium animate-in fade-in-0 slide-in-from-bottom-2 z-50 ${
    type === "success" ? "bg-emerald-600" : "bg-red-600"
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

interface IntegrationCardProps {
  name: string;
  description: string;
  status: "connected" | "configured" | "planned" | "error" | "not_configured";
  icon: string;
  onTest: () => void;
  isLoading: boolean;
}

function IntegrationIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    database: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7v10c0 2.21 3.134 4 7 4s7-1.79 7-4V7m0 0c0 2.21-3.134 4-7 4S4 9.21 4 7m0 0c0-2.21 3.134-4 7-4s7 1.79 7 4"
        />
      </svg>
    ),
    prescription: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    shield: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m7.784-4.817a1 1 0 00-1.569-.434L5.894 10.07a1 1 0 001.415 1.414l10.236-9.236zm0 0L12 21m7.784-4.817l-2.569 2.27a1 1 0 01-1.415-1.414l2.569-2.27"
        />
      </svg>
    ),
    message: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    "credit-card": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    truck: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    brain: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5a4 4 0 100-8 4 4 0 000 8z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 flex items-center justify-center">
      {iconMap[icon] || iconMap.database}
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  status,
  icon,
  onTest,
  isLoading,
}: IntegrationCardProps) {
  const statusStyles = {
    connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    configured: "bg-blue-50 text-blue-700 border-blue-200",
    planned: "bg-gray-50 text-gray-600 border-gray-200",
    error: "bg-red-50 text-red-700 border-red-200",
    not_configured: "bg-gray-50 text-gray-600 border-gray-200",
  };

  const statusLabels = {
    connected: "Connected",
    configured: "Configured",
    planned: "Planned",
    error: "Error",
    not_configured: "Not Configured",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${statusStyles[status]} p-6 transition-all hover:shadow-md`}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <IntegrationIcon icon={icon} />
          <div className="flex-1">
            <h3 className="font-semibold text-base text-gray-900">{name}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]} border`}
          >
            {statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        {status === "planned" ? (
          <p className="text-xs text-gray-500">Coming soon</p>
        ) : (
          <>
            <button
              onClick={onTest}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white/50 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-current/20"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface IntegrationsClientProps {
  initialIntegrations: IntegrationInfo[];
}

export default function IntegrationsClient({ initialIntegrations }: IntegrationsClientProps) {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>(initialIntegrations);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  const handleTestIntegration = async (name: string) => {
    setTestingIntegration(name);
    try {
      const res = await fetch("/api/settings/test-integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const error = await res.json();
        showToast(`${name}: ${error.message || "Test failed"}`, "error");
        setIntegrations((prev) =>
          prev.map((i) =>
            i.name === name
              ? { ...i, status: "error" as const }
              : i
          )
        );
        return;
      }

      const result = await res.json();

      if (result.success) {
        showToast(`${name} connection successful`, "success");
        setIntegrations((prev) =>
          prev.map((i) =>
            i.name === name
              ? { ...i, status: "connected" as const }
              : i
          )
        );
      } else {
        showToast(`${name}: ${result.error || result.message}`, "error");
        setIntegrations((prev) =>
          prev.map((i) =>
            i.name === name
              ? { ...i, status: "error" as const }
              : i
          )
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Test failed";
      showToast(`${name}: ${errorMsg}`, "error");
    } finally {
      setTestingIntegration(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-base text-gray-600 mt-2">
          Manage external service connections for your pharmacy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.name}
            name={integration.name}
            description={integration.description}
            status={integration.status}
            icon={integration.icon}
            isLoading={testingIntegration === integration.name}
            onTest={() => handleTestIntegration(integration.name)}
          />
        ))}
      </div>

      {/* Help section */}
      <div className="mt-12 rounded-xl bg-blue-50 border border-blue-200 p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Integration Setup</h3>
            <p className="text-sm text-blue-700 mt-1">
              To configure integrations, add the required environment variables to your .env.local file and restart the application.
              Contact your system administrator if you need help setting up any integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
