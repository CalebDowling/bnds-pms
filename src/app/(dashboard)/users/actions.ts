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

/**
 * Permanently delete a user. Admin-only.
 *
 * Safeguards:
 *   - Can't delete yourself
 *   - Can't delete the last active admin (would lock the system)
 *   - Confirms there are no "owned" records that can't be nulled
 *     (we use ON DELETE SET NULL for most user FKs, so this is safe
 *      for audit fields, but controlled-substance ledgers etc. may
 *      have hard FKs — if so, the delete will fail and we return an
 *      error suggesting deactivate instead.)
 *
 * Removes the user from both Supabase Auth and the BNDS database.
 * Returns a structured result so the UI can distinguish success /
 * safeguard-blocked / FK-constraint failures.
 */
export async function deleteUser(id: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const { logAudit } = await import("@/lib/audit");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can delete users");

  // Safeguard 1: can't delete yourself
  if (currentUser.id === id) {
    throw new Error("You can't delete your own account. Have another admin do it.");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      supabaseId: true,
      isActive: true,
      roles: { include: { role: true } },
    },
  });
  if (!target) throw new Error("User not found");

  // Safeguard 2: last admin check
  const targetIsAdmin = target.roles.some(
    (ur) => ur.role.name.toLowerCase() === "admin"
  );
  if (targetIsAdmin) {
    const otherAdminCount = await prisma.user.count({
      where: {
        id: { not: id },
        isActive: true,
        roles: { some: { role: { name: { equals: "Admin", mode: "insensitive" } } } },
      },
    });
    if (otherAdminCount === 0) {
      throw new Error(
        "Can't delete the last active admin. Promote another user to admin first."
      );
    }
  }

  const admin = createAdminClient();

  // Delete from Supabase Auth first. If this fails, we haven't touched our DB.
  try {
    const { error } = await admin.auth.admin.deleteUser(target.supabaseId);
    if (error && !/not.{0,10}found/i.test(error.message)) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  } catch (e) {
    throw new Error(
      `Failed to delete Supabase auth user: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Delete from our DB. Foreign keys are mostly ON DELETE SET NULL, so
  // audit records stay but de-associate. Any hard FK will make this throw.
  try {
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
  } catch (e) {
    throw new Error(
      `Database delete failed (likely foreign-key references). Consider deactivating the user instead. Error: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  await logAudit({
    userId: currentUser.id,
    action: "DELETE",
    resource: "users",
    resourceId: id,
    oldValues: {
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      wasActive: target.isActive,
      roles: target.roles.map((r) => r.role.name),
    },
  });

  revalidatePath("/users");
  return { deleted: true, email: target.email };
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
 * Admin-triggered password reset: generates a Supabase recovery link AND
 * actually emails it to the user via nodemailer. Previously this only
 * generated the link and never sent it — same bug as the invite flow had.
 *
 * Returns { sent, emailDelivered, setPasswordLink? } so the admin UI
 * can surface a manual-share link when SMTP isn't configured.
 */
export async function sendPasswordReset(userId: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const { sendEmail } = await import("@/lib/messaging/email");
  const currentUser = await requireUser();
  if (!currentUser.isAdmin) throw new Error("Only admins can reset passwords");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) throw new Error("User not found");

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pms.bndsrx.com";
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: {
      redirectTo: `${appUrl}/auth/callback?type=recovery`,
    },
  });

  if (error) throw new Error(`Failed to generate reset link: ${error.message}`);

  // Use hashed_token not action_link — see src/app/auth/callback/route.ts
  // for why. action_link uses implicit flow (hash fragment) which server
  // route handlers can't read.
  const hashedToken = data?.properties?.hashed_token;
  if (!hashedToken) {
    return { sent: false, emailDelivered: false, setPasswordLink: null };
  }
  const resetLink = `${appUrl}/auth/callback?token_hash=${hashedToken}&type=recovery`;

  // Actually email the link.
  const safeName = user.firstName.replace(/[<>"'&]/g, "");
  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#cbddd1;margin:0;padding:32px 16px;color:#0f260b;">
  <div style="max-width:520px;margin:0 auto;background:#e2ede6;border:1px solid #b8cfc0;border-radius:12px;overflow:hidden;">
    <div style="background:#415c43;padding:24px 32px;color:#fff;font-size:20px;font-weight:800;">
      Boudreaux&rsquo;s New Drug Store
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:800;">Password reset requested</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">
        Hi ${safeName}, an admin has initiated a password reset on your BNDS PMS account.
        Click below to choose a new password.
      </p>
      <div style="text-align:center;padding:12px 0;">
        <a href="${resetLink}" style="display:inline-block;background:#415c43;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
          Set a New Password
        </a>
      </div>
      <p style="margin:16px 0 0 0;font-size:12px;color:#5d7a64;">
        This link expires in 24 hours. If you didn&rsquo;t expect this email, contact your administrator.
      </p>
    </div>
  </div>
</body></html>`;
  const text = `Password reset for BNDS PMS\n\nHi ${safeName},\n\nAn admin has initiated a password reset on your account. Set a new password here:\n${resetLink}\n\nThis link expires in 24 hours.`;

  const emailResult = await sendEmail({
    to: user.email,
    subject: "BNDS PMS — password reset",
    html,
    text,
  });

  return {
    sent: true,
    emailDelivered: emailResult.success && emailResult.messageId !== "dev-mode",
    // Return the link so the UI can offer a manual-share fallback when SMTP
    // isn't configured or the send failed.
    setPasswordLink:
      emailResult.success && emailResult.messageId !== "dev-mode" ? null : resetLink,
  };
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
