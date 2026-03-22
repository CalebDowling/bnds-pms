"use server";

import { Prisma } from "@prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── Read Operations ──────────────────────────────

export async function getUsers({
  search = "",
  page = 1,
  limit = 25,
}: { search?: string; page?: number; limit?: number } = {}) {
  const { prisma } = await import("@/lib/prisma");
  const skip = (page - 1) * limit;
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { roles: { include: { role: true } } },
      orderBy: { lastName: "asc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / limit), page };
}

export async function getUser(id: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
}

export async function getRoles() {
  const { prisma } = await import("@/lib/prisma");
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

// ─── User Invite / Create ─────────────────────────

export type UserFormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  isPharmacist: boolean;
  licenseNumber?: string;
  pin?: string;
  roleIds?: string[];
};

/**
 * Invite a new user:
 * 1. Create the user in Supabase Auth (sends invite email with magic link)
 * 2. Create the user record in our database
 * 3. Assign roles
 */
export async function inviteUser(data: UserFormData) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can invite users");

  const admin = createAdminClient();
  const email = data.email.toLowerCase().trim();

  // Check if email already exists in our DB
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with this email already exists");

  // Create user in Supabase Auth with invite (sends email)
  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("Supabase did not return a user");
  }

  // Create user in our database linked to Supabase
  const user = await prisma.user.create({
    data: {
      supabaseId: authData.user.id,
      email,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim() || null,
      department: data.department?.trim() || null,
      isPharmacist: data.isPharmacist,
      licenseNumber: data.licenseNumber?.trim() || null,
      pin: data.pin?.trim() || null,
      roles: data.roleIds?.length
        ? { create: data.roleIds.map((roleId) => ({ roleId })) }
        : undefined,
    },
  });

  revalidatePath("/users");
  return { user, inviteSent: true };
}

/**
 * Create a user with a temporary password (for cases where invite emails aren't needed).
 * Admin must share the temporary password with the user out-of-band.
 */
export async function createUserWithPassword(
  data: UserFormData,
  temporaryPassword: string
) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can create users");

  if (temporaryPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const admin = createAdminClient();
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with this email already exists");

  // Create user in Supabase Auth with password
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm since admin is creating
      user_metadata: {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
      },
    });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("Supabase did not return a user");
  }

  // Create in our database
  const user = await prisma.user.create({
    data: {
      supabaseId: authData.user.id,
      email,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim() || null,
      department: data.department?.trim() || null,
      isPharmacist: data.isPharmacist,
      licenseNumber: data.licenseNumber?.trim() || null,
      pin: data.pin?.trim() || null,
      roles: data.roleIds?.length
        ? { create: data.roleIds.map((roleId) => ({ roleId })) }
        : undefined,
    },
  });

  revalidatePath("/users");
  return { user, inviteSent: false };
}

/**
 * Legacy createUser — kept for backward compat but now routes through
 * createUserWithPassword with a generated temp password.
 */
export async function createUser(data: UserFormData) {
  // Generate a random temporary password
  const tempPassword =
    "Bnds" +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 4).toUpperCase() +
    "!";
  return createUserWithPassword(data, tempPassword);
}

// ─── Update Operations ────────────────────────────

export async function updateUser(id: string, data: UserFormData) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.update({
    where: { id },
    data: {
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim() || null,
      department: data.department?.trim() || null,
      isPharmacist: data.isPharmacist,
      licenseNumber: data.licenseNumber?.trim() || null,
      ...(data.pin ? { pin: data.pin.trim() } : {}),
    },
  });

  // Sync roles
  if (data.roleIds) {
    await prisma.userRole.deleteMany({ where: { userId: id } });
    if (data.roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
  }

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return user;
}

export async function toggleUserActive(id: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can deactivate users");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true, supabaseId: true },
  });
  if (!user) throw new Error("User not found");

  const newActive = !user.isActive;

  // Also update Supabase auth status
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.supabaseId, {
    ban_duration: newActive ? "none" : "876000h", // ~100 years = effectively permanent
  });

  await prisma.user.update({
    where: { id },
    data: { isActive: newActive },
  });

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
}

export async function verifyPin(userId: string, pin: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pin: true },
  });
  return user?.pin === pin;
}

// ─── Password Reset ───────────────────────────────

/**
 * Admin-triggered password reset: sends a password reset email to the user.
 */
export async function sendPasswordReset(userId: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can reset passwords");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new Error("User not found");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) throw new Error(`Failed to send reset: ${error.message}`);
  return { sent: true };
}

/**
 * Admin force-set a new password (no email required).
 */
export async function adminSetPassword(userId: string, newPassword: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can set passwords");

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { supabaseId: true },
  });
  if (!user) throw new Error("User not found");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.supabaseId, {
    password: newPassword,
  });

  if (error) throw new Error(`Failed to set password: ${error.message}`);
  return { updated: true };
}

// ─── Role Management ──────────────────────────────

export async function createRole(name: string, description?: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can create roles");

  const role = await prisma.role.create({
    data: { name, description: description || null },
  });
  revalidatePath("/users");
  return role;
}
