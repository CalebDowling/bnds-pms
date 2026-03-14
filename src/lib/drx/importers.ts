/**
 * DRX → BNDS Data Importers
 *
 * Fetches records by ID from DRX's /api/v1/ endpoints,
 * maps fields to the BNDS Prisma schema, and upserts.
 * Records are linked by externalId for incremental sync.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  fetchPatientById,
  fetchDoctorById,
  fetchItemById,
  iterateByIdRange,
  type DrxPatient,
  type DrxDoctor,
  type DrxItem,
} from "./client";

export interface ImportProgress {
  entity: string;
  current: number;
  endId: number;
  imported: number;
  skipped: number;
  errors: number;
  found: number;
}

export type ProgressCallback = (progress: ImportProgress) => void;

// ─── DOCTORS → PRESCRIBERS ──────────────────

export async function importDoctors(
  prisma: PrismaClient,
  onProgress?: ProgressCallback,
  startId = 1,
  endId = 15000
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    entity: "doctors",
    current: 0,
    endId,
    imported: 0,
    skipped: 0,
    errors: 0,
    found: 0,
  };

  await iterateByIdRange(fetchDoctorById, startId, endId, {
    concurrency: 5,
    maxConsecutiveMisses: 500,
    onProgress: (current, total, found) => {
      progress.current = current;
      progress.found = found;
      onProgress?.(progress);
    },
    onRecord: async (drx: DrxDoctor) => {
      try {
        const extId = String(drx.id);
        const phone = drx.phone_numbers?.[0]?.number || drx.fax_number || null;
        const addr = drx.addresses?.[0];

        if (!drx.npi) {
          progress.skipped++;
          return;
        }

        try {
          await prisma.prescriber.upsert({
            where: { npi: drx.npi },
            create: {
              externalId: extId,
              npi: drx.npi,
              deaNumber: drx.dea || null,
              firstName: drx.first_name || "",
              lastName: drx.last_name || "",
              specialty: drx.prescriber_type || null,
              phone: phone,
              fax: drx.fax_number || null,
              email: drx.email || null,
              addressLine1: addr?.street || null,
              city: addr?.city || null,
              state: addr?.state || null,
              zip: addr?.zip_code || null,
              stateLicense: drx.state_license || null,
              isActive: true,
            },
            update: {
              externalId: extId,
              deaNumber: drx.dea || null,
              firstName: drx.first_name || "",
              lastName: drx.last_name || "",
              phone: phone,
              fax: drx.fax_number || null,
              isActive: true,
            },
          });
        } catch (deaErr: any) {
          // DEA unique constraint — retry without DEA number
          if (deaErr?.code === "P2002") {
            await prisma.prescriber.upsert({
              where: { npi: drx.npi },
              create: {
                externalId: extId,
                npi: drx.npi,
                deaNumber: null,
                firstName: drx.first_name || "",
                lastName: drx.last_name || "",
                specialty: drx.prescriber_type || null,
                phone: phone,
                fax: drx.fax_number || null,
                email: drx.email || null,
                addressLine1: addr?.street || null,
                city: addr?.city || null,
                state: addr?.state || null,
                zip: addr?.zip_code || null,
                stateLicense: drx.state_license || null,
                isActive: true,
              },
              update: {
                externalId: extId,
                firstName: drx.first_name || "",
                lastName: drx.last_name || "",
                phone: phone,
                fax: drx.fax_number || null,
                isActive: true,
              },
            });
          } else {
            throw deaErr;
          }
        }
        progress.imported++;
      } catch (e) {
        progress.errors++;
        console.error(`Doctor import error (DRX ${drx.id}):`, e);
      }
    },
  });

  return progress;
}

// ─── ITEMS / DRUG CATALOG ───────────────────

function mapDrxItem(drx: DrxItem) {
  const isControlled = !!drx.dea_schedule && String(drx.dea_schedule) !== "0";
  const isOtc = drx.otc_indicator === "Y" || drx.otc_indicator === "1";
  return {
    name: drx.name || drx.print_name || "Unknown",
    genericName: drx.generic_name || null,
    brandName: drx.brand_name || null,
    manufacturer: drx.manufacturer || null,
    strength: drx.strength || null,
    dosageForm: drx.dosage_form || drx.dosage_form_description || null,
    route: drx.route_of_administration || null,
    unitOfMeasure: drx.unit_of_measure || null,
    awp: drx.awp != null ? new Prisma.Decimal(drx.awp) : null,
    acquisitionCost:
      drx.unit_cost != null ? new Prisma.Decimal(drx.unit_cost) : null,
    isCompoundIngredient: drx.compounding_chemical || false,
    isOtc: isOtc,
    isControlled: isControlled,
    deaSchedule: drx.dea_schedule != null ? String(drx.dea_schedule) : null,
    isRefrigerated: drx.refrigerated || false,
    reorderPoint:
      drx.min_inventory != null
        ? new Prisma.Decimal(drx.min_inventory)
        : null,
    reorderQuantity:
      drx.max_inventory != null
        ? new Prisma.Decimal(drx.max_inventory)
        : null,
    isActive: drx.active !== false,
    externalId: String(drx.id),
    ndc: drx.ndc || null,
  };
}

export async function importItems(
  prisma: PrismaClient,
  onProgress?: ProgressCallback,
  startId = 1,
  endId = 250000
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    entity: "items",
    current: 0,
    endId,
    imported: 0,
    skipped: 0,
    errors: 0,
    found: 0,
  };

  const FETCH_CONCURRENCY = 50; // Fetch 50 IDs at a time from DRX
  const DB_BATCH_SIZE = 25; // Process 25 DB upserts in parallel
  let consecutiveMisses = 0;
  const MAX_MISSES = 1000;

  for (let i = startId; i <= endId; i += FETCH_CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(FETCH_CONCURRENCY, endId - i + 1) },
      (_, j) => i + j
    );

    // Fetch all IDs in this batch concurrently
    const results = await Promise.allSettled(
      batch.map((id) => fetchItemById(id))
    );

    // Collect found records
    const records: DrxItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        records.push(result.value);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
      }
    }
    progress.found += records.length;

    // Process DB writes in parallel batches
    for (let b = 0; b < records.length; b += DB_BATCH_SIZE) {
      const dbBatch = records.slice(b, b + DB_BATCH_SIZE);
      const dbResults = await Promise.allSettled(
        dbBatch.map(async (drx) => {
          const data = mapDrxItem(drx);
          // Use raw upsert — try create, if externalId exists, update
          try {
            await prisma.item.create({ data });
          } catch (createErr: any) {
            if (createErr?.code === "P2002") {
              // Already exists — update
              const existing = await prisma.item.findFirst({
                where: { externalId: String(drx.id) },
                select: { id: true },
              });
              if (existing) {
                const { externalId, ndc, ...updateData } = data;
                await prisma.item.update({
                  where: { id: existing.id },
                  data: updateData,
                });
              }
            } else {
              throw createErr;
            }
          }
        })
      );

      for (const r of dbResults) {
        if (r.status === "fulfilled") {
          progress.imported++;
        } else {
          progress.errors++;
          if (progress.errors <= 10) {
            console.error(`Item import error:`, r.reason);
          }
        }
      }
    }

    progress.current = i + batch.length - 1;
    if (progress.current % 500 < FETCH_CONCURRENCY) {
      onProgress?.(progress);
    }

    if (consecutiveMisses >= MAX_MISSES) {
      break;
    }
  }

  return progress;
}

// ─── PATIENTS (with phones, addresses, insurance) ─────

export async function importPatients(
  prisma: PrismaClient,
  onProgress?: ProgressCallback,
  startId = 1,
  endId = 60000
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    entity: "patients",
    current: 0,
    endId,
    imported: 0,
    skipped: 0,
    errors: 0,
    found: 0,
  };

  // MRN counter
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });
  let mrnCounter = lastPatient
    ? parseInt(lastPatient.mrn.replace(/\D/g, ""), 10) + 1
    : 1;

  await iterateByIdRange(fetchPatientById, startId, endId, {
    concurrency: 5,
    maxConsecutiveMisses: 500,
    onProgress: (current, total, found) => {
      progress.current = current;
      progress.found = found;
      if (current % 100 === 0) onProgress?.(progress);
    },
    onRecord: async (drx: DrxPatient) => {
      try {
        const extId = String(drx.id);

        // Check if already imported
        const existing = await prisma.patient.findFirst({
          where: { externalId: extId },
        });

        if (existing) {
          // Update core fields only
          await prisma.patient.update({
            where: { id: existing.id },
            data: {
              firstName: drx.first_name || "",
              middleName: drx.middle_initial || null,
              lastName: drx.last_name || "",
              email: drx.email || null,
              status: drx.active ? "active" : "inactive",
            },
          });
          progress.skipped++;
          return;
        }

        // Generate MRN
        const mrn = `BNDS-${String(mrnCounter++).padStart(7, "0")}`;

        // Map phone numbers
        const phoneData = (drx.phone_numbers || []).map((p, i) => ({
          phoneType: p.phone_type || "mobile",
          number: (p.number || "").replace(/\D/g, ""),
          isPrimary: i === 0,
          acceptsSms: p.phone_type === "mobile",
        }));

        // Map addresses
        const addressData = (drx.addresses || []).map((a, i) => ({
          addressType: a.type_ || "home",
          line1: a.street || "",
          line2: a.line_two || null,
          city: a.city || "",
          state: a.state || "",
          zip: a.zip_code || "",
          isDefault: i === 0,
        }));

        // Map allergies
        const allergyData = (drx.allergies || []).map((a) => ({
          allergen: a.concept_description || "Unknown",
          allergenCode: a.dam_concept_id != null ? String(a.dam_concept_id) : null,
          severity: "moderate",
          source: "drx_import",
          status: "active",
        }));

        // Create patient with nested data
        const patient = await prisma.patient.create({
          data: {
            mrn,
            externalId: extId,
            firstName: drx.first_name || "",
            middleName: drx.middle_initial || null,
            lastName: drx.last_name || "",
            dateOfBirth: drx.date_of_birth
              ? new Date(drx.date_of_birth)
              : new Date("1900-01-01"),
            gender: drx.gender || null,
            email: drx.email || null,
            preferredContact: "phone",
            preferredLanguage:
              drx.primary_language?.toLowerCase() === "spanish"
                ? "es"
                : "en",
            status: drx.active ? "active" : "inactive",
            phoneNumbers:
              phoneData.length > 0 ? { create: phoneData } : undefined,
            addresses:
              addressData.length > 0 ? { create: addressData } : undefined,
            allergies:
              allergyData.length > 0 ? { create: allergyData } : undefined,
          },
        });

        // Import patient insurance (third_parties)
        for (const tp of drx.third_parties || []) {
          try {
            // Find or create the plan by BIN
            let plan = await prisma.thirdPartyPlan.findFirst({
              where: { bin: tp.bin_number },
            });

            if (!plan) {
              plan = await prisma.thirdPartyPlan.create({
                data: {
                  planName: tp.name || "Unknown Plan",
                  bin: tp.bin_number,
                  pcn: tp.pcn || null,
                  isActive: true,
                },
              });
            }

            await prisma.patientInsurance.create({
              data: {
                patientId: patient.id,
                priority: String(tp.cardholder_relationship || "1"),
                memberId: tp.cardholder_id || "",
                groupNumber: tp.group_number || null,
                relationship: tp.relationship_code || null,
                cardholderId: tp.cardholder_id || null,
                thirdPartyPlanId: plan.id,
                isActive: true,
              },
            });
          } catch {
            // Insurance import failures are non-fatal
          }
        }

        progress.imported++;
      } catch (e) {
        progress.errors++;
        if (progress.errors <= 20) {
          console.error(`Patient import error (DRX ${drx.id}):`, e);
        }
      }
    },
  });

  return progress;
}
