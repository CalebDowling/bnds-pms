/**
 * Client-side permission guard component.
 * Uses the PermissionsProvider context to check if the current user
 * has the required permission before rendering children.
 */

"use client";

import { usePermissions } from "@/components/providers/PermissionsProvider";
import type { PermissionResource, PermissionAction } from "@/lib/permissions";
import Link from "next/link";

interface PermissionGuardProps {
  resource: PermissionResource;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({
  resource,
  action,
  children,
  fallback,
}: PermissionGuardProps) {
  const { canAccess } = usePermissions();
  const hasPermission = canAccess(resource, action);

  if (!hasPermission) {
    return fallback || (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            You don&apos;t have permission to view this page. Please contact your
            administrator if you believe this is an error.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#40721D] text-white text-sm font-medium hover:bg-[#2D5114] transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
