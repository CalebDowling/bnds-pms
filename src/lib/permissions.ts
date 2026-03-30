/**
 * Permission checking utilities for RBAC enforcement.
 *
 * Permissions are stored as JSON on the Role model:
 * { "prescriptions": ["read", "write", "verify"], "patients": ["read", "write"], ... }
 *
 * Special: admin role has { "all": ["read", "write", "admin"] }
 */

export type PermissionAction =
  | "read"
  | "write"
  | "verify"
  | "dispense"
  | "admin"
  | "create"
  | "edit"
  | "delete"
  | "view";

export type PermissionResource =
  | "prescriptions"
  | "patients"
  | "inventory"
  | "compounding"
  | "billing"
  | "insurance"
  | "shipping"
  | "messaging"
  | "pos"
  | "reports"
  | "settings"
  | "users"
  | "sync"
  | "all";

export type PermissionsMap = Partial<
  Record<PermissionResource, PermissionAction[]>
>;

/**
 * Check if a set of role permissions grants a specific action on a resource.
 */
export function checkPermission(
  rolePermissions: PermissionsMap[],
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  for (const perms of rolePermissions) {
    // Admin wildcard: "all" grants everything
    if (perms.all && (perms.all.includes(action) || perms.all.includes("admin"))) {
      return true;
    }
    if (perms[resource]?.includes(action)) {
      return true;
    }
  }
  return false;
}

/**
 * Server-side permission check using the current user's roles.
 * Throws if the user doesn't have the required permission.
 */
export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction
): Promise<void> {
  // Import dynamically to avoid circular deps
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();

  const { prisma } = await import("@/lib/prisma");
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  });

  const rolePermissions = userRoles.map(
    (ur) => (ur.role.permissions as PermissionsMap) || {}
  );

  if (!checkPermission(rolePermissions, resource, action)) {
    throw new Error(
      `Permission denied: ${resource}:${action}. Contact your administrator.`
    );
  }
}

/**
 * Non-throwing version — returns boolean.
 */
export async function canAccess(
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  try {
    await requirePermission(resource, action);
    return true;
  } catch {
    return false;
  }
}

/**
 * Default role permission templates for seeding.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionsMap> = {
  admin: {
    all: ["read", "write", "admin"],
  },
  pharmacist: {
    prescriptions: ["read", "write", "verify", "dispense"],
    compounding: ["read", "write", "verify"],
    patients: ["read", "write"],
    inventory: ["read", "write"],
    billing: ["read", "write"],
    messaging: ["read", "write"],
    reports: ["read"],
    settings: ["read", "write"],
    users: ["read", "write"],
    sync: ["read", "write"],
  },
  technician: {
    prescriptions: ["read", "write"],
    compounding: ["read", "write"],
    patients: ["read", "write"],
    inventory: ["read", "write"],
    messaging: ["read", "write"],
    billing: ["read"],
    reports: ["read"],
  },
  shipping_clerk: {
    prescriptions: ["read"],
    patients: ["read"],
    shipping: ["read", "write"],
    inventory: ["read"],
  },
  billing_specialist: {
    prescriptions: ["read"],
    patients: ["read"],
    billing: ["read", "write"],
    insurance: ["read", "write"],
    reports: ["read"],
  },
  cashier: {
    prescriptions: ["read"],
    patients: ["read"],
    pos: ["read", "write"],
  },
};
