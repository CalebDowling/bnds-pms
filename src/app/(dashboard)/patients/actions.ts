"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatMRN, nextMRNSeed } from "@/lib/utils/mrn";
import { validatePhone } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { PatientFormData, PhoneFormData, AddressFormData, AllergyFormData, InsuranceFormData } from "@/types/patient";

// ─── LIST / SEARCH ───────────────────────────

export type PatientFilter = "all" | "recent" | "flagged" | "birthdays";

// Helper: compute the start/end month-day strings for the current week
// (Mon-Sun). Used by the "Birthdays this week" filter.
function getCurrentWeekMonthDayRange(): { startMD: string; endMD: string; wraps: boolean } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startMD = fmt(start);
  const endMD = fmt(end);
  // Week spans Dec→Jan (e.g. Mon Dec 30 → Sun Jan 5)
  const wraps = startMD > endMD;
  return { startMD, endMD, wraps };
}

// Returns patient IDs whose date_of_birth (month/day, ignoring year)
// falls inside the current week. Uses raw SQL since Prisma's filter
// API can't extract month/day from a Date column.
async function getBirthdayThisWeekIds(): Promise<string[]> {
  const { startMD, endMD, wraps } = getCurrentWeekMonthDayRange();
  const rows = wraps
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS id FROM patients
        WHERE status = 'active'
          AND (
            to_char(date_of_birth, 'MM-DD') >= ${startMD}
            OR to_char(date_of_birth, 'MM-DD') <= ${endMD}
          )
      `
    : await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS id FROM patients
        WHERE status = 'active'
          AND to_char(date_of_birth, 'MM-DD') BETWEEN ${startMD} AND ${endMD}
      `;
  return rows.map((r) => r.id);
}

// Build the Prisma where clause for the active filter set, excluding the
// search term (which gets layered on top by getPatients / count helpers).
async function buildFilterWhere(filter: PatientFilter): Promise<Prisma.PatientWhereInput> {
  const where: Prisma.PatientWhereInput = { status: "active" };

  if (filter === "recent") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    where.createdAt = { gte: thirtyDaysAgo };
  } else if (filter === "flagged") {
    // Flagged = has at least one active allergy. Easy to extend later
    // (custom statuses, alert flags) without breaking the URL contract.
    where.allergies = { some: { status: "active" } };
  } else if (filter === "birthdays") {
    const ids = await getBirthdayThisWeekIds();
    where.id = { in: ids.length > 0 ? ids : ["__no_match__"] };
  }
  // filter === "all" → just status: "active"

  return where;
}

export async function getPatients({
  search = "",
  filter = "all",
  status,
  page = 1,
  limit = 25,
}: {
  search?: string;
  filter?: PatientFilter;
  /** @deprecated use `filter` instead. Kept so old links keep working. */
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;

  // If a legacy `status` param is passed, honor it and skip the new filter
  // tabs (so /patients?status=inactive still works for admin views).
  let where: Prisma.PatientWhereInput;
  if (status) {
    where = {};
    if (status !== "all") where.status = status;
  } else {
    where = await buildFilterWhere(filter);
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
        allergies: {
          // Need both id (count) and severity (Allergy/DUR pill rendering).
          // Inactive allergies are ignored — they're tombstones, not flags.
          where: { status: "active" },
          select: { id: true, severity: true, allergen: true },
        },
        insurance: {
          // Pull plan name for the new "Insurance" column. Cardholder filter
          // (priority asc + isActive) is applied at render time so we can
          // pick the primary plan without a second query.
          where: { isActive: true },
          orderBy: { priority: "asc" },
          select: {
            id: true,
            priority: true,
            isActive: true,
            thirdPartyPlan: { select: { planName: true } },
          },
        },
        // BNDS PMS Redesign: list shows "Active Rx" (count) and "Last fill"
        // (relative date). _count is cheap (single SQL aggregate); the
        // most-recent dateFilled needs a take:1 ordered by dateFilled desc.
        _count: {
          select: {
            prescriptions: { where: { isActive: true } },
          },
        },
        prescriptions: {
          where: { isActive: true, dateFilled: { not: null } },
          orderBy: { dateFilled: "desc" },
          take: 1,
          select: { id: true, dateFilled: true },
        },
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

// ─── TAB COUNTS ─────────────────────────────
//
// Used by the Patients page tabs. Each tab shows a count badge — these
// queries run in parallel so the page render isn't bottlenecked on the
// slowest one. Birthdays uses a raw SQL query (see getBirthdayThisWeekIds).

export async function getPatientCounts(): Promise<{
  all: number;
  recent: number;
  flagged: number;
  birthdays: number;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { startMD, endMD, wraps } = getCurrentWeekMonthDayRange();

  const [allCount, recentCount, flaggedCount, birthdayRows] = await Promise.all([
    prisma.patient.count({ where: { status: "active" } }),
    prisma.patient.count({
      where: { status: "active", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.patient.count({
      where: {
        status: "active",
        allergies: { some: { status: "active" } },
      },
    }),
    wraps
      ? prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM patients
          WHERE status = 'active'
            AND (
              to_char(date_of_birth, 'MM-DD') >= ${startMD}
              OR to_char(date_of_birth, 'MM-DD') <= ${endMD}
            )
        `
      : prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM patients
          WHERE status = 'active'
            AND to_char(date_of_birth, 'MM-DD') BETWEEN ${startMD} AND ${endMD}
        `,
  ]);

  return {
    all: allCount,
    recent: recentCount,
    flagged: flaggedCount,
    birthdays: Number(birthdayRows[0]?.count ?? 0),
  };
}

// ─── DUPLICATE DETECTION ────────────────────
//
// Round 9 pharmacist test surfaced obvious duplicate patient rows
// ("Broussard-Walker, Greta" x2, "Chesson Walker" x2). The DRX import
// occasionally creates a fresh patient instead of matching when the
// external ID changes mid-stream, or when a name spelling shifts.
//
// We do NOT auto-merge — every patient row may have prescriptions,
// claims, encounters, allergies pinned to it, and a wrong merge
// destroys clinical history. Instead we surface clusters so an admin
// can review and merge in a future tool.
//
// Cluster key: lowercased+trimmed firstName + lastName + ISO DOB. This
// catches the common case (same name + DOB) without false-positives
// from twins (which would also need the same DOB but we'd surface them
// regardless — the admin can dismiss).

export interface PatientDuplicateCluster {
  key: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  patients: Array<{
    id: string;
    mrn: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: Date;
    status: string;
  }>;
}

export async function findDuplicatePatients(): Promise<PatientDuplicateCluster[]> {
  // Pull all active patients — duplicate detection runs against the live
  // roster only. If an admin has already inactivated one row of a pair
  // it will fall out of the cluster and the warning self-clears.
  const patients = await prisma.patient.findMany({
    where: { status: "active" },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      status: true,
    },
    orderBy: { lastName: "asc" },
  });

  const buckets = new Map<string, PatientDuplicateCluster>();
  for (const p of patients) {
    const first = (p.firstName || "").trim().toLowerCase().replace(/\s+/g, " ");
    const last = (p.lastName || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!first || !last) continue;
    const dobIso = p.dateOfBirth.toISOString().slice(0, 10);
    const key = `${last}|${first}|${dobIso}`;
    let cluster = buckets.get(key);
    if (!cluster) {
      cluster = {
        key,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        patients: [],
      };
      buckets.set(key, cluster);
    }
    cluster.patients.push(p);
  }

  return Array.from(buckets.values()).filter((c) => c.patients.length > 1);
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
