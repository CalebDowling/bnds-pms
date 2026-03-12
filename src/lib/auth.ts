import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    // Look up the user in our database by supabaseId
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!dbUser) return null;

    // Update lastLogin
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLogin: new Date() },
    }).catch(() => {
      // Non-critical — don't fail the request if lastLogin update fails
    });

    return {
      id: dbUser.id,
      supabaseId: dbUser.supabaseId,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      isPharmacist: dbUser.isPharmacist,
      isAdmin: dbUser.roles.some((r) => r.role.name === "admin"),
      roles: dbUser.roles.map((r) => r.role.name),
      lastLogin: dbUser.lastLogin,
      createdAt: dbUser.createdAt,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
