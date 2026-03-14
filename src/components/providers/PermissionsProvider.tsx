/**
 * Permissions context provider - exposes user permissions to client components.
 * This fetches permissions server-side and makes them available via usePermissions hook.
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import type { PermissionResource, PermissionAction } from "@/lib/permissions";

interface PermissionsContextType {
  canAccess: (resource: PermissionResource, action: PermissionAction) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export interface PermissionsProviderProps {
  children: ReactNode;
  permissions: Record<string, string[]>;
}

export function PermissionsProvider({
  children,
  permissions,
}: PermissionsProviderProps) {
  const canAccess = (
    resource: PermissionResource,
    action: PermissionAction
  ): boolean => {
    // Admin wildcard
    if (permissions.all && (permissions.all.includes(action) || permissions.all.includes("admin"))) {
      return true;
    }
    return permissions[resource]?.includes(action) ?? false;
  };

  return (
    <PermissionsContext.Provider value={{ canAccess }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return context;
}
