"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatMRN, nextMRNSeed } from "@/lib/utils/mrn";
import { validatePhone } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { PatientFormData, PhoneFormData, AddressFormData, AllergyFormData, InsuranceFormData } from "@/types/patient";

// ─── LIST / SEARCH ───────────────────────────

export async function getPatients({
  search = "",
  status = "active",
  page = 1,
  limit = 25,
}: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;

  const where: Prisma.PatientWhereInput = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    const terms = search.trim().split(/\s+/);
    if (terms.length === 1) {
      where.OR = [
        { firstName: { contains: terms[0], mode: "insensitive" } },
        { lastName: { contains: terms[0], mode: "insensitive" } },
        { mrn: { contains: terms[0], mode: "insensitive" } },
        { email: { contains: terms[0], mode: "insensitive" } },
        { phoneNumbers: { some: { number: { contains: terms[0] } } } },
      ];
    } else {
      // Assume "firstName lastName" search
      where.AND = [
        { firstName: { contains: terms[0], mode: "insensitive" } },
        { lastName: { contains: terms[terms.length - 1], mode: "insensitive" } },
      ];
    }
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        phoneNumbers: true,
        addresses: true,
        allergies: { select: { id: true } },
        insurance: { select: { id: true, priority: true, isActive: true } },
      },
      orderBy: { lastName: "asc" },
      skip,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    patients,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

// ─── GET SINGLE PATIENT ─────────────────────

export async function getPatient(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      phoneNumbers: true,
      addresses: true,
      allergies: { orderBy: { createdAt: "desc" } },
      insurance: {
        include: { thirdPartyPlan: true },
        orderBy: { priority: "asc" },
      },
      outsideMeds: { orderBy: { isActive: "desc" } },
      encounters: { orderBy: { encounterDate: "desc" } },
      customStatuses: true,
      prescriptions: {
        orderBy: { dateReceived: "desc" },
        take: 20,
        include: {
          prescriber: { select: { firstName: true, lastName: true, suffix: true } },
          item: { select: { name: true, strength: true } },
        },
      },
      facility: true,
      wing: true,
      room: true,
    },
  });

  // Audit PHI access
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    if (user) {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({ userId: user.id, action: "VIEW", resource: "patient", resourceId: id, details: { source: "getPatient" } });
    }
  } catch {}

  return patient;
}

// ─── CREATE PATIENT ─────────────────────────

export async function createPatient(data: PatientFormData) {
  // Server-side phone guard — mirrors the client check so a placeholder
  // can't slip in via direct server-action calls or a tampered form.
  if (data.phone) {
    const phoneError = validatePhone(data.phone);
    if (phoneError) throw new Error(phoneError);
  }

  // The "read max, +1" pattern collides on two distinct failure modes:
  //   1. Concurrent inserts both reading the same max
  //   2. Pre-existing rows already at-or-above the proposed max
  // A pure "re-read on P2002" retry only fixes (1) — under (2) the
  // re-read returns the same max and we loop on the same value.
  // Solution: read the seed once, then increment locally on every
  // P2002 retry. Long-term fix is a Postgres SEQUENCE.
  const MAX_ATTEMPTS = 20;
  let lastError: unknown;
  let candidate = await nextMRNSeed();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const mrn = formatMRN(candidate);

    try {
      const patient = await prisma.patient.create({
        data: {
          mrn,
          firstName: data.firstName.trim(),
          middleName: data.middleName?.trim() || null,
          lastName: data.lastName.trim(),
          suffix: data.suffix?.trim() || null,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender || null,
          ssnLastFour: data.ssnLastFour?.trim() || null,
          email: data.email?.trim() || null,
          preferredContact: data.preferredContact || "phone",
          preferredLanguage: data.preferredLanguage || "en",
          notes: data.notes?.trim() || null,
          // Create phone number inline if provided
          ...(data.phone
            ? {
                phoneNumbers: {
                  create: {
                    phoneType: data.phoneType || "mobile",
                    number: data.phone.replace(/\D/g, ""),
                    isPrimary: true,
                    acceptsSms: data.phoneType === "mobile",
                  },
                },
              }
            : {}),
          // Create address inline if provided
          ...(data.addressLine1
            ? {
                addresses: {
                  create: {
                    addressType: "home",
                    line1: data.addressLine1.trim(),
                    line2: data.addressLine2?.trim() || null,
                    city: data.city?.trim() || "",
                    state: data.state?.trim() || "",
                    zip: data.zip?.trim() || "",
                    isDefault: true,
                  },
                },
              }
            : {}),
        },
      });

      revalidatePath("/patients");
      return patient;
    } catch (err) {
      lastError = err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        if (attempt === 0) {
          console.warn("[createPatient] P2002 on attempt 0", {
            candidate,
            target: err.meta?.target,
            modelName: err.meta?.modelName,
          });
        }
        candidate++;
        await new Promise((r) => setTimeout(r, 25 + Math.random() * 50));
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to allocate a unique MRN after retries");
}

// ─── UPDATE PATIENT ─────────────────────────

export async function updatePatient(id: string, data: PatientFormData) {
  const patient = await prisma.patient.update({
    where: { id },
    data: {
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || null,
      lastName: data.lastName.trim(),
      suffix: data.suffix?.trim() || null,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender || null,
      ssnLastFour: data.ssnLastFour?.trim() || null,
      email: data.email?.trim() || null,
      preferredContact: data.preferredContact || "phone",
      preferredLanguage: data.preferredLanguage || "en",
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
  return patient;
}

// ─── PHONE NUMBERS ──────────────────────────

export async function addPhoneNumber(patientId: string, data: PhoneFormData) {
  // Reject obvious placeholders here too — addPhoneNumber is reachable from
  // the patient detail page independently of PatientForm.
  const phoneError = validatePhone(data.number);
  if (phoneError) throw new Error(phoneError);

  // If setting as primary, unset existing primary
  if (data.isPrimary) {
    await prisma.patientPhoneNumber.updateMany({
      where: { patientId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const phone = await prisma.patientPhoneNumber.create({
    data: {
      patientId,
      phoneType: data.phoneType,
      number: data.number.replace(/\D/g, ""),
      extension: data.extension || null,
      isPrimary: data.isPrimary,
      acceptsSms: data.acceptsSms,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return phone;
}

export async function deletePhoneNumber(id: string, patientId: string) {
  await prisma.patientPhoneNumber.delete({ where: { id } });
  revalidatePath(`/patients/${patientId}`);
}

// ─── ADDRESSES ──────────────────────────────

export async function addAddress(patientId: string, data: AddressFormData) {
  if (data.isDefault) {
    await prisma.patientAddress.updateMany({
      where: { patientId, addressType: data.addressType, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.patientAddress.create({
    data: {
      patientId,
      addressType: data.addressType,
      line1: data.line1.trim(),
      line2: data.line2?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      zip: data.zip.trim(),
      country: data.country || "US",
      isDefault: data.isDefault,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return address;
}

export async function deleteAddress(id: string, patientId: string) {
  await prisma.patientAddress.delete({ where: { id } });
  revalidatePath(`/patients/${patientId}`);
}

// ─── ALLERGIES ──────────────────────────────

export async function addAllergy(patientId: string, data: AllergyFormData) {
  const allergy = await prisma.patientAllergy.create({
    data: {
      patientId,
      allergen: data.allergen.trim(),
      allergenCode: data.allergenCode?.trim() || null,
      reaction: data.reaction?.trim() || null,
      severity: data.severity,
      onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
      source: data.source || "self_reported",
      status: "active",
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return allergy;
}

export async function deleteAllergy(id: string, patientId: string) {
  await prisma.patientAllergy.update({
    where: { id },
    data: { status: "inactive" },
  });
  revalidatePath(`/patients/${patientId}`);
}

// ─── INSURANCE ──────────────────────────────

export async function addInsurance(patientId: string, data: InsuranceFormData) {
  const insurance = await prisma.patientInsurance.create({
    data: {
      patientId,
      priority: data.priority,
      memberId: data.memberId.trim(),
      personCode: data.personCode?.trim() || null,
      groupNumber: data.groupNumber?.trim() || null,
      relationship: data.relationship || null,
      cardholderName: data.cardholderName?.trim() || null,
      cardholderId: data.cardholderId?.trim() || null,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
      thirdPartyPlanId: data.thirdPartyPlanId || null,
      isActive: true,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return insurance;
}

export async function deactivateInsurance(id: string, patientId: string) {
  await prisma.patientInsurance.update({
    where: { id },
    data: { isActive: false },
  });
  revalidatePath(`/patients/${patientId}`);
}
