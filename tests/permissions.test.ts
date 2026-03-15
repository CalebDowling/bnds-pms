import { describe, it, expect } from "vitest";
import {
  checkPermission,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionsMap,
} from "@/lib/permissions";

describe("checkPermission", () => {
  it("grants admin access to any resource and action", () => {
    const adminPerms = [DEFAULT_ROLE_PERMISSIONS.admin];
    expect(checkPermission(adminPerms, "prescriptions", "read")).toBe(true);
    expect(checkPermission(adminPerms, "prescriptions", "write")).toBe(true);
    expect(checkPermission(adminPerms, "prescriptions", "verify")).toBe(true);
    expect(checkPermission(adminPerms, "users", "admin")).toBe(true);
    expect(checkPermission(adminPerms, "billing", "write")).toBe(true);
    expect(checkPermission(adminPerms, "settings", "admin")).toBe(true);
  });

  it("grants pharmacist prescriptions verify and dispense", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.pharmacist];
    expect(checkPermission(perms, "prescriptions", "read")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "write")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "verify")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "dispense")).toBe(true);
  });

  it("denies technician admin and verify permissions", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.technician];
    expect(checkPermission(perms, "prescriptions", "read")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "write")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "verify")).toBe(false);
    expect(checkPermission(perms, "prescriptions", "dispense")).toBe(false);
    expect(checkPermission(perms, "users", "admin")).toBe(false);
    expect(checkPermission(perms, "settings", "write")).toBe(false);
  });

  it("denies cashier access to billing and inventory", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.cashier];
    expect(checkPermission(perms, "pos", "read")).toBe(true);
    expect(checkPermission(perms, "pos", "write")).toBe(true);
    expect(checkPermission(perms, "billing", "read")).toBe(false);
    expect(checkPermission(perms, "billing", "write")).toBe(false);
    expect(checkPermission(perms, "inventory", "read")).toBe(false);
  });

  it("shipping clerk can write shipping but not prescriptions", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.shipping_clerk];
    expect(checkPermission(perms, "shipping", "write")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "read")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "write")).toBe(false);
    expect(checkPermission(perms, "inventory", "write")).toBe(false);
  });

  it("billing specialist can write billing and insurance", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.billing_specialist];
    expect(checkPermission(perms, "billing", "write")).toBe(true);
    expect(checkPermission(perms, "insurance", "write")).toBe(true);
    expect(checkPermission(perms, "prescriptions", "write")).toBe(false);
    expect(checkPermission(perms, "users", "read")).toBe(false);
  });

  it("merges permissions across multiple roles", () => {
    // User with both technician and billing_specialist roles
    const perms = [
      DEFAULT_ROLE_PERMISSIONS.technician,
      DEFAULT_ROLE_PERMISSIONS.billing_specialist,
    ];
    // From technician:
    expect(checkPermission(perms, "compounding", "write")).toBe(true);
    // From billing_specialist:
    expect(checkPermission(perms, "billing", "write")).toBe(true);
    expect(checkPermission(perms, "insurance", "write")).toBe(true);
    // Neither role has this:
    expect(checkPermission(perms, "shipping", "write")).toBe(false);
    expect(checkPermission(perms, "users", "admin")).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(checkPermission([], "prescriptions", "read")).toBe(false);
  });

  it("returns false for unknown resource", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.pharmacist];
    expect(checkPermission(perms, "all" as any, "read")).toBe(false);
  });

  it("admin wildcard grants even for unknown actions", () => {
    const perms = [DEFAULT_ROLE_PERMISSIONS.admin];
    // admin has "admin" in all, which is a wildcard
    expect(checkPermission(perms, "shipping", "admin")).toBe(true);
  });
});

describe("DEFAULT_ROLE_PERMISSIONS", () => {
  it("has all 6 expected roles defined", () => {
    const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS);
    expect(roles).toContain("admin");
    expect(roles).toContain("pharmacist");
    expect(roles).toContain("technician");
    expect(roles).toContain("shipping_clerk");
    expect(roles).toContain("billing_specialist");
    expect(roles).toContain("cashier");
    expect(roles).toHaveLength(6);
  });

  it("admin only has the 'all' wildcard key", () => {
    const admin = DEFAULT_ROLE_PERMISSIONS.admin;
    expect(Object.keys(admin)).toEqual(["all"]);
    expect(admin.all).toContain("admin");
  });

  it("pharmacist has the most resources of any non-admin role", () => {
    const pharmacist = Object.keys(DEFAULT_ROLE_PERMISSIONS.pharmacist);
    const technician = Object.keys(DEFAULT_ROLE_PERMISSIONS.technician);
    expect(pharmacist.length).toBeGreaterThan(technician.length);
  });
});
