import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Find or create our User record linked to Supabase auth
  let user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { roles: true },
  });

  if (!user) {
    // Auto-create user record on first login
    const email = authUser.email || "";
    const nameParts = email.split("@")[0].split(".");
    const firstName = nameParts[0]
      ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      : "User";
    const lastName = nameParts[1]
      ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
      : "";

    user = await prisma.user.create({
      data: {
        supabaseId: authUser.id,
        email,
        firstName,
        lastName,
        isPharmacist: true, // Default for first user
      },
      include: { roles: true },
    });
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  }).catch(() => {}); // Non-blocking

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
