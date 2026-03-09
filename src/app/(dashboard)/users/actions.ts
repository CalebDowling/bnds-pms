"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUsers({
  search = "",
  page = 1,
  limit = 25,
}: { search?: string; page?: number; limit?: number } = {}) {
  const skip = (page - 1) * limit;
  const where: any = {};

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
  return prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
}

export async function getRoles() {
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

export async function createRole(name: string, description?: string) {
  const role = await prisma.role.create({
    data: { name, description: description || null },
  });
  revalidatePath("/users");
  return role;
}

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

export async function createUser(data: UserFormData) {
  const user = await prisma.user.create({
    data: {
      supabaseId: `manual_${Date.now()}`,
      email: data.email.toLowerCase().trim(),
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
  return user;
}

export async function updateUser(id: string, data: UserFormData) {
  // Update user fields
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
  const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
  if (!user) throw new Error("User not found");

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
}

export async function verifyPin(userId: string, pin: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pin: true },
  });
  return user?.pin === pin;
}
