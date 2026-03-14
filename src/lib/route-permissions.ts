/**
 * Route permission map - defines the required permissions for each dashboard route.
 */

import { PermissionResource, PermissionAction } from "./permissions";

export interface RoutePermission {
  resource: PermissionResource;
  action: PermissionAction;
}

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Dashboard - accessible to all authenticated users
  "/dashboard": { resource: "all", action: "read" },

  // Main sections - read access
  "/patients": { resource: "patients", action: "read" },
  "/prescriptions": { resource: "prescriptions", action: "read" },
  "/compounding": { resource: "compounding", action: "read" },
  "/inventory": { resource: "inventory", action: "read" },
  "/billing": { resource: "billing", action: "read" },
  "/insurance": { resource: "insurance", action: "read" },
  "/shipping": { resource: "shipping", action: "read" },
  "/pos": { resource: "pos", action: "read" },
  "/reports": { resource: "reports", action: "read" },
  "/settings": { resource: "settings", action: "read" },
  "/users": { resource: "users", action: "read" },

  // Create/edit actions - write access
  "/patients/new": { resource: "patients", action: "write" },
  "/patients/[id]/edit": { resource: "patients", action: "write" },
  "/prescriptions/new": { resource: "prescriptions", action: "write" },
  "/prescriptions/[id]": { resource: "prescriptions", action: "write" },
  "/prescriptions/prescribers/new": { resource: "prescriptions", action: "write" },
  "/compounding/batches/new": { resource: "compounding", action: "write" },
  "/compounding/batches/[id]": { resource: "compounding", action: "write" },
  "/compounding/formulas/new": { resource: "compounding", action: "write" },
  "/compounding/formulas/[id]": { resource: "compounding", action: "write" },
  "/inventory/new": { resource: "inventory", action: "write" },
  "/inventory/[id]": { resource: "inventory", action: "write" },
  "/insurance/plans/new": { resource: "insurance", action: "write" },
  "/shipping/new": { resource: "shipping", action: "write" },
  "/shipping/[id]": { resource: "shipping", action: "write" },
  "/users/new": { resource: "users", action: "write" },
  "/users/[id]": { resource: "users", action: "write" },
};

/**
 * Get the permission required for a given path.
 * Returns null if the path is accessible to all authenticated users.
 */
export function getRoutePermission(path: string): RoutePermission | null {
  // Exact match first
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }

  // Check for route patterns
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    // Simple pattern matching for [id] routes
    if (route.includes("[id]")) {
      const pattern = route.replace("[id]", "[^/]+");
      if (new RegExp(`^${pattern}$`).test(path)) {
        return permission;
      }
    }
  }

  return null;
}
