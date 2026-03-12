"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────

export type PrescriberFormData = {
  npi: string;
  deaNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  specialty?: string;
  phone?: string;
  fax?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  stateLicense?: string;
  licenseState?: string;
};

// ─── LIST / SEARCH ───────────────────────────

export async function getPrescribers({
  search = "",
  page = 1,
  limit = 25,
}: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: any = { isActive: true };

  if (search) {
    const terms = search.trim().split(/\s+/);
    if (terms.length === 1) {
      where.OR = [
        { firstName: { contains: terms[0], mode: "insensitive" } },
        { lastName: { contains: terms[0], mode: "insensitive" } },
        { npi: { contains: terms[0], mode: "insensitive" } },
        { deaNumber: { contains: terms[0], mode: "insensitive" } },
        { specialty: { contains: terms[0], mode: "insensitive" } },
      ];
    } else {
      where.AND = [
        { firstName: { contains: terms[0], mode: "insensitive" } },
        { lastName: { contains: terms[terms.length - 1], mode: "insensitive" } },
      ];
    }
  }

  const [prescribers, total] = await Promise.all([
    prisma.prescriber.findMany({
      where,
      orderBy: { lastName: "asc" },
      skip,
      take: limit,
    }),
    prisma.prescriber.count({ where }),
  ]);

  return {
    prescribers,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

// ─── GET SINGLE ─────────────────────────────

export async function getPrescriber(id: string) {
  return prisma.prescriber.findUnique({
    where: { id },
    include: {
      prescriptions: {
        orderBy: { dateReceived: "desc" },
        take: 20,
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          item: { select: { name: true, strength: true } },
        },
      },
    },
  });
}

// ─── CREATE ─────────────────────────────────

export async function createPrescriber(data: PrescriberFormData) {
  const prescriber = await prisma.prescriber.create({
    data: {
      npi: data.npi.trim(),
      deaNumber: data.deaNumber?.trim() || null,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || null,
      lastName: data.lastName.trim(),
      suffix: data.suffix?.trim() || null,
      specialty: data.specialty?.trim() || null,
      phone: data.phone?.replace(/\D/g, "") || null,
      fax: data.fax?.replace(/\D/g, "") || null,
      email: data.email?.trim() || null,
      addressLine1: data.addressLine1?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zip: data.zip?.trim() || null,
      stateLicense: data.stateLicense?.trim() || null,
      licenseState: data.licenseState?.trim() || null,
    },
  });

  revalidatePath("/prescriptions");
  return prescriber;
}

// ─── UPDATE ─────────────────────────────────

export async function updatePrescriber(id: string, data: PrescriberFormData) {
  const prescriber = await prisma.prescriber.update({
    where: { id },
    data: {
      npi: data.npi.trim(),
      deaNumber: data.deaNumber?.trim() || null,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || null,
      lastName: data.lastName.trim(),
      suffix: data.suffix?.trim() || null,
      specialty: data.specialty?.trim() || null,
      phone: data.phone?.replace(/\D/g, "") || null,
      fax: data.fax?.replace(/\D/g, "") || null,
      email: data.email?.trim() || null,
      addressLine1: data.addressLine1?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zip: data.zip?.trim() || null,
      stateLicense: data.stateLicense?.trim() || null,
      licenseState: data.licenseState?.trim() || null,
    },
  });

  revalidatePath("/prescriptions");
  return prescriber;
}

// ─── SEARCH (for prescription form dropdown) ─

export async function searchPrescribers(query: string) {
  if (!query || query.length < 2) return [];

  return prisma.prescriber.findMany({
    where: {
      isActive: true,
      OR: [
        { lastName: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { npi: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      suffix: true,
      npi: true,
      specialty: true,
    },
    take: 10,
    orderBy: { lastName: "asc" },
  });
}
