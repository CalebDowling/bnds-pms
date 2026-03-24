/**
 * DRX → BNDS Shadow Mode Sync Engine
 *
 * Runs incremental sync from DRX to BNDS PMS Supabase database.
 * Uses the drx_sync_log table to track last sync times per entity.
 * Designed to run every 5 minutes via Vercel Cron (maxDuration 300s).
 *
 * IMPORTANT: Uses paginated LIST endpoints (/doctors?limit=100&offset=0)
 * for both initial and delta syncs. This is ~100x faster than iterating
 * by individual ID because each API call returns up to 100 records.
 */

"use server";

import { Prisma } from "@prisma/client";
import {
  fetchAllPages,
  type DrxPatient,
  type DrxDoctor,
  type DrxItem,
  type DrxPrescription,
  type DrxPrescriptionFill,
} from "./client";

export interface SyncResult {
  entity: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  duration: number;
  timedOut?: boolean;
}

// Time budget: stop 5s before Vercel's function limit to flush results.
// Hobby plan = 60s max, Pro plan = 300s max. Use 50s to be safe.
const SYNC_TIMEOUT_MS = 50_000;
let syncStartedAt = 0;

function timeRemaining(): number {
  return SYNC_TIMEOUT_MS - (Date.now() - syncStartedAt);
}

function hasTimeLeft(): boolean {
  return timeRemaining() > 10_000; // need at least 10s
}

// ─── Sync Log helpers ──────────────────────────

async function getLastSyncTime(prisma: any, entity: string): Promise<Date | null> {
  try {
    const rows = await prisma.$queryRaw`
      SELECT last_sync_at FROM drx_sync_log WHERE entity = ${entity} LIMIT 1
    `;
    const arr = rows as { last_sync_at: Date }[];
    return arr.length > 0 ? arr[0].last_sync_at : null;
  } catch {
    return null;
  }
}

async function updateSyncLog(
  prisma: any,
  entity: string,
  result: SyncResult
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO drx_sync_log (entity, last_sync_at, records_synced, errors, duration_ms)
      VALUES (${entity}, NOW(), ${result.imported + result.updated}, ${result.errors}, ${result.duration})
      ON CONFLICT (entity) DO UPDATE SET
        last_sync_at = NOW(),
        records_synced = ${result.imported + result.updated},
        errors = ${result.errors},
        duration_ms = ${result.duration},
        sync_count = drx_sync_log.sync_count + 1
    `;
  } catch (e) {
    console.error(`Failed to update sync log for ${entity}:`, e);
  }
}

// ─── Mappers ───────────────────────────────────

function mapDrxItemToDb(drx: DrxItem) {
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
    acquisitionCost: drx.unit_cost != null ? new Prisma.Decimal(drx.unit_cost) : null,
    isCompoundIngredient: drx.compounding_chemical || false,
    isOtc,
    isControlled,
    deaSchedule: drx.dea_schedule != null ? String(drx.dea_schedule) : null,
    isRefrigerated: drx.refrigerated || false,
    reorderPoint: drx.min_inventory != null ? new Prisma.Decimal(drx.min_inventory) : null,
    reorderQuantity: drx.max_inventory != null ? new Prisma.Decimal(drx.max_inventory) : null,
    isActive: drx.active !== false,
    externalId: String(drx.id),
    ndc: drx.ndc || null,
  };
}

/**
 * Map DRX fill status to BNDS workflow status.
 * DRX fill statuses: Hold, Adjudicating, Rejected, Print, OOS, Scan, Verify,
 *                    Waiting Bin, Sold, Pre-Check
 * These correspond to the queue positions visible in the DRX UI.
 */
function mapDrxFillStatus(drxStatus: string | null | undefined): string {
  if (!drxStatus) return "intake";
  const statusMap: Record<string, string> = {
    // DRX fill statuses → BNDS workflow statuses
    "pre-check": "intake",
    "adjudicating": "in_progress",
    "print": "in_progress",
    "scan": "in_progress",
    "verify": "ready_for_verification",
    "hold": "on_hold",
    "oos": "on_hold",
    "rejected": "on_hold",
    "waiting bin": "ready",
    "sold": "dispensed",
  };
  return statusMap[drxStatus.toLowerCase()] || drxStatus.toLowerCase() || "intake";
}

/**
 * Map DRX prescription last_fill_status to BNDS status.
 * Uses the same fill status mapping.
 */
function mapDrxPrescriptionStatus(lastFillStatus: string | null | undefined, inactivated: boolean): string {
  if (inactivated) return "cancelled";
  if (!lastFillStatus) return "intake";
  return mapDrxFillStatus(lastFillStatus);
}

// ─── Entity Sync Functions (paginated list endpoints) ─────

async function syncDoctors(prisma: any, lastSync: Date | null): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { entity: "doctors", imported: 0, updated: 0, skipped: 0, errors: 0, duration: 0 };

  try {
    // Streaming page-by-page for both full and delta sync
    const extraParams: Record<string, string> = lastSync ? { updatedAfter: lastSync.toISOString() } : {};
    await fetchAllPages<DrxDoctor>("/doctors", 100, async (batch) => {
      for (const drx of batch) {
        if (!hasTimeLeft()) { result.timedOut = true; return; }
        try {
          if (!drx.npi) { result.skipped++; continue; }
          const extId = String(drx.id);
          const phone = drx.phone_numbers?.[0]?.number || drx.fax_number || null;
          const addr = drx.addresses?.[0];

          const existing = await prisma.prescriber.findFirst({
            where: { externalId: extId },
            select: { id: true },
          });

          if (existing) {
            await prisma.prescriber.update({
              where: { id: existing.id },
              data: {
                firstName: drx.first_name || "",
                lastName: drx.last_name || "",
                phone, fax: drx.fax_number || null,
              },
            });
            result.updated++;
          } else {
            try {
              await prisma.prescriber.create({
                data: {
                  externalId: extId, npi: drx.npi,
                  deaNumber: drx.dea || null,
                  firstName: drx.first_name || "", lastName: drx.last_name || "",
                  specialty: drx.prescriber_type || null, phone, fax: drx.fax_number || null,
                  email: drx.email || null,
                  addressLine1: addr?.street || null, city: addr?.city || null,
                  state: addr?.state || null, zip: addr?.zip_code || null,
                  stateLicense: drx.state_license || null, isActive: true,
                },
              });
              result.imported++;
            } catch (e: any) {
              if (e?.code === "P2002") { result.skipped++; } else throw e;
            }
          }
        } catch { result.errors++; }
      }
    }, extraParams, hasTimeLeft);
  } catch (e) {
    console.error("Doctor sync error:", e);
    result.errors++;
  }

  result.duration = Date.now() - start;
  return result;
}

async function syncItems(prisma: any, lastSync: Date | null): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { entity: "items", imported: 0, updated: 0, skipped: 0, errors: 0, duration: 0 };

  try {
    // Streaming page-by-page for both full and delta sync
    const extraParams: Record<string, string> = lastSync ? { updatedAfter: lastSync.toISOString() } : {};
    await fetchAllPages<DrxItem>("/items", 100, async (batch) => {
      for (const drx of batch) {
        if (!hasTimeLeft()) { result.timedOut = true; return; }
        try {
          const data = mapDrxItemToDb(drx);
          const existing = await prisma.item.findFirst({
            where: { externalId: String(drx.id) },
            select: { id: true },
          });
          if (existing) {
            const { externalId, ndc, ...updateData } = data;
            await prisma.item.update({ where: { id: existing.id }, data: updateData });
            result.updated++;
          } else {
            try {
              await prisma.item.create({ data });
              result.imported++;
            } catch (e: any) {
              if (e?.code === "P2002") result.skipped++; else throw e;
            }
          }
        } catch { result.errors++; }
      }
    }, extraParams, hasTimeLeft);
  } catch (e) {
    console.error("Item sync error:", e);
    result.errors++;
  }

  result.duration = Date.now() - start;
  return result;
}

async function syncPatients(prisma: any, lastSync: Date | null): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { entity: "patients", imported: 0, updated: 0, skipped: 0, errors: 0, duration: 0 };

  // MRN counter
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });
  let mrnCounter = lastPatient
    ? parseInt(lastPatient.mrn.replace(/\D/g, ""), 10) + 1
    : 1;

  async function processPatient(drx: DrxPatient) {
    const extId = String(drx.id);
    const existing = await prisma.patient.findFirst({
      where: { externalId: extId },
      select: { id: true },
    });

    if (existing) {
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
      result.updated++;
    } else {
      const mrn = `BNDS-${String(mrnCounter++).padStart(7, "0")}`;
      const phoneData = (drx.phone_numbers || []).map((p, i) => ({
        phoneType: p.phone_type || "mobile",
        number: (p.number || "").replace(/\D/g, ""),
        isPrimary: i === 0,
        acceptsSms: p.phone_type === "mobile",
      }));
      const addressData = (drx.addresses || []).map((a, i) => ({
        addressType: a.type_ || "home",
        line1: a.street || "",
        line2: a.line_two || null,
        city: a.city || "",
        state: a.state || "",
        zip: a.zip_code || "",
        isDefault: i === 0,
      }));
      const allergyData = (drx.allergies || []).map((a) => ({
        allergen: a.concept_description || "Unknown",
        allergenCode: a.dam_concept_id != null ? String(a.dam_concept_id) : null,
        severity: "moderate",
        source: "drx_import",
        status: "active",
      }));

      await prisma.patient.create({
        data: {
          mrn, externalId: extId,
          firstName: drx.first_name || "", middleName: drx.middle_initial || null,
          lastName: drx.last_name || "",
          dateOfBirth: drx.date_of_birth ? new Date(drx.date_of_birth) : new Date("1900-01-01"),
          gender: drx.gender || null, email: drx.email || null,
          preferredContact: "phone",
          preferredLanguage: drx.primary_language?.toLowerCase() === "spanish" ? "es" : "en",
          status: drx.active ? "active" : "inactive",
          phoneNumbers: phoneData.length > 0 ? { create: phoneData } : undefined,
          addresses: addressData.length > 0 ? { create: addressData } : undefined,
          allergies: allergyData.length > 0 ? { create: allergyData } : undefined,
        },
      });

      // Import insurance
      for (const tp of drx.third_parties || []) {
        try {
          let plan = await prisma.thirdPartyPlan.findFirst({ where: { bin: tp.bin_number } });
          if (!plan) {
            plan = await prisma.thirdPartyPlan.create({
              data: { planName: tp.name || "Unknown Plan", bin: tp.bin_number, pcn: tp.pcn || null, isActive: true },
            });
          }
          const createdPatient = await prisma.patient.findFirst({ where: { externalId: extId }, select: { id: true } });
          if (createdPatient) {
            await prisma.patientInsurance.create({
              data: {
                patientId: createdPatient.id, priority: "primary",
                memberId: tp.cardholder_id || "", groupNumber: tp.group_number || null,
                relationship: tp.relationship_code || null, cardholderId: tp.cardholder_id || null,
                thirdPartyPlanId: plan.id, isActive: true,
              },
            });
          }
        } catch { /* Insurance import failures non-fatal */ }
      }

      result.imported++;
    }
  }

  try {
    // Use streaming page-by-page processing for both full and delta sync.
    // fetchModifiedSince collects ALL records into memory before processing,
    // which causes timeouts for large datasets like patients (168K+).
    const extraParams: Record<string, string> = lastSync ? { updatedAfter: lastSync.toISOString() } : {};
    await fetchAllPages<DrxPatient>("/patients", 100, async (batch) => {
      for (const drx of batch) {
        if (!hasTimeLeft()) { result.timedOut = true; return; }
        try { await processPatient(drx); } catch { result.errors++; }
      }
    }, extraParams, hasTimeLeft);
  } catch (e) {
    console.error("Patient sync error:", e);
    result.errors++;
  }

  result.duration = Date.now() - start;
  return result;
}

async function syncPrescriptions(prisma: any, lastSync: Date | null): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { entity: "prescriptions", imported: 0, updated: 0, skipped: 0, errors: 0, duration: 0 };

  async function processRx(drx: DrxPrescription) {
    const extId = String(drx.id);

    // Resolve foreign keys — DRX nests patient/doctor/item as objects
    const patient = drx.patient?.id
      ? await prisma.patient.findFirst({ where: { externalId: String(drx.patient.id) }, select: { id: true } })
      : null;
    const prescriber = drx.doctor?.id
      ? await prisma.prescriber.findFirst({ where: { externalId: String(drx.doctor.id) }, select: { id: true } })
      : null;
    const item = drx.prescribed_item?.id
      ? await prisma.item.findFirst({ where: { externalId: String(drx.prescribed_item.id) }, select: { id: true } })
      : null;

    if (!patient || !prescriber) { result.skipped++; return; }

    const existing = await prisma.prescription.findFirst({
      where: { externalId: extId },
      select: { id: true },
    });

    // Get the most recent fill status for workflow queue
    const latestFillStatus = drx.last_fill_status
      || drx.prescription_fills?.[0]?.status
      || null;

    const data = {
      status: mapDrxPrescriptionStatus(latestFillStatus, drx.inactivated),
      directions: drx.sig || drx.sig_code || null,
      dawCode: drx.daw_code || (drx.daw ? "1" : "0"),
      refillsAuthorized: drx.refills || 0,
      refillsRemaining: drx.total_qty_remaining || 0,
      dateWritten: drx.written_date ? new Date(drx.written_date) : new Date(),
      dateFilled: drx.last_filled_on ? new Date(drx.last_filled_on) : null,
      expirationDate: drx.expiration_date ? new Date(drx.expiration_date) : null,
      priority: "normal",
      isCompound: false,
    };

    if (existing) {
      await prisma.prescription.update({ where: { id: existing.id }, data });
      result.updated++;
    } else {
      try {
        await prisma.prescription.create({
          data: {
            ...data,
            externalId: extId,
            rxNumber: `DRX-${drx.id}`,
            patientId: patient.id,
            prescriberId: prescriber.id,
            itemId: item?.id || null,
            source: drx.origin_code || "drx_sync",
            dateReceived: drx.created_at ? new Date(drx.created_at) : new Date(),
            isActive: !drx.inactivated,
          },
        });
        result.imported++;
      } catch (e: any) {
        if (e?.code === "P2002") result.skipped++; else throw e;
      }
    }
  }

  try {
    // Streaming page-by-page for both full and delta sync
    const extraParams: Record<string, string> = lastSync ? { updatedAfter: lastSync.toISOString() } : {};
    await fetchAllPages<DrxPrescription>("/prescriptions", 100, async (batch) => {
      for (const drx of batch) {
        if (!hasTimeLeft()) { result.timedOut = true; return; }
        try { await processRx(drx); } catch { result.errors++; }
      }
    }, extraParams, hasTimeLeft);
  } catch (e) {
    console.error("Prescription sync error:", e);
    result.errors++;
  }

  result.duration = Date.now() - start;
  return result;
}

async function syncPrescriptionFills(prisma: any, lastSync: Date | null): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { entity: "fills", imported: 0, updated: 0, skipped: 0, errors: 0, duration: 0 };

  async function processFill(drx: DrxPrescriptionFill) {
    // DRX nests fill data under drx.fill, prescription under drx.prescription
    const fill = drx.fill;
    if (!fill?.id) { result.skipped++; return; }

    const extId = String(fill.id);
    const rx = drx.prescription?.id
      ? await prisma.prescription.findFirst({ where: { externalId: String(drx.prescription.id) }, select: { id: true } })
      : null;
    if (!rx) { result.skipped++; return; }

    const item = drx.dispensed_item?.id
      ? await prisma.item.findFirst({ where: { externalId: String(drx.dispensed_item.id) }, select: { id: true } })
      : null;

    const existing = await prisma.prescriptionFill.findFirst({
      where: { externalId: extId },
      select: { id: true },
    });

    const data = {
      fillNumber: fill.refill || 0,
      ndc: drx.dispensed_item?.ndc || null,
      quantity: new Prisma.Decimal(fill.dispensed_quantity || 0),
      daysSupply: fill.days_supply,
      status: fill.status || "pending",
      binLocation: fill.will_call_location || null,
      copayAmount: fill.patient_pay_amount != null ? new Prisma.Decimal(fill.patient_pay_amount) : null,
      ingredientCost: fill.fill_cost != null ? new Prisma.Decimal(fill.fill_cost) : null,
      dispensingFee: fill.dispensing_fee != null ? new Prisma.Decimal(fill.dispensing_fee) : null,
      totalPrice: fill.retail_amount != null ? new Prisma.Decimal(fill.retail_amount) : null,
      filledAt: fill.fill_date ? new Date(fill.fill_date) : null,
      verifiedAt: null,
      dispensedAt: fill.first_sold_on ? new Date(fill.first_sold_on) : null,
    };

    if (existing) {
      await prisma.prescriptionFill.update({ where: { id: existing.id }, data });
      result.updated++;
    } else {
      try {
        await prisma.prescriptionFill.create({
          data: {
            ...data,
            externalId: extId,
            prescriptionId: rx.id,
            itemId: item?.id || null,
          },
        });
        result.imported++;
      } catch (e: any) {
        if (e?.code === "P2002") result.skipped++; else throw e;
      }
    }
  }

  try {
    // Streaming page-by-page for both full and delta sync
    const extraParams: Record<string, string> = lastSync ? { updatedAfter: lastSync.toISOString() } : {};
    await fetchAllPages<DrxPrescriptionFill>("/prescription-fills", 100, async (batch) => {
      for (const drx of batch) {
        if (!hasTimeLeft()) { result.timedOut = true; return; }
        try { await processFill(drx); } catch { result.errors++; }
      }
    }, extraParams, hasTimeLeft);
  } catch (e) {
    console.error("Fill sync error:", e);
    result.errors++;
  }

  result.duration = Date.now() - start;
  return result;
}

// ─── Targeted Queue Sync ──────────────────────
// Fetches only active fills (non-Sold) by each DRX queue status.
// Much faster than a full resync — ~500 fills total vs 238K.

const ACTIVE_DRX_STATUSES = [
  "Pre-Check",
  "Adjudicating",
  "Print",
  "Scan",
  "Verify",
  "OOS",
  "Hold",
  "Waiting Bin",
  "Rejected",
];

export async function syncActiveQueues(): Promise<{
  statusCounts: Record<string, number>;
  totalUpdated: number;
  totalCreated: number;
  totalSkipped: number;
  errors: number;
  duration: number;
}> {
  const { prisma } = await import("@/lib/prisma");
  syncStartedAt = Date.now();

  const statusCounts: Record<string, number> = {};
  let totalUpdated = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let errors = 0;

  for (const drxStatus of ACTIVE_DRX_STATUSES) {
    if (!hasTimeLeft()) break;

    try {
      let statusTotal = 0;
      await fetchAllPages<DrxPrescriptionFill>(
        "/prescription-fills",
        100,
        async (batch) => {
          for (const drx of batch) {
            if (!hasTimeLeft()) return;
            try {
              const fill = drx.fill;
              if (!fill?.id) { totalSkipped++; continue; }

              const extId = String(fill.id);
              const existing = await prisma.prescriptionFill.findFirst({
                where: { externalId: extId },
                select: { id: true },
              });

              if (existing) {
                // Update the status to the raw DRX status
                await prisma.prescriptionFill.update({
                  where: { id: existing.id },
                  data: {
                    status: fill.status || drxStatus,
                    binLocation: fill.will_call_location || null,
                    copayAmount: fill.patient_pay_amount != null ? new Prisma.Decimal(fill.patient_pay_amount) : null,
                    filledAt: fill.fill_date ? new Date(fill.fill_date) : null,
                    dispensedAt: fill.first_sold_on ? new Date(fill.first_sold_on) : null,
                  },
                });
                totalUpdated++;
              } else {
                // Fill doesn't exist in our DB yet — try to create it
                const rx = drx.prescription?.id
                  ? await prisma.prescription.findFirst({ where: { externalId: String(drx.prescription.id) }, select: { id: true } })
                  : null;
                if (!rx) { totalSkipped++; continue; }

                const item = drx.dispensed_item?.id
                  ? await prisma.item.findFirst({ where: { externalId: String(drx.dispensed_item.id) }, select: { id: true } })
                  : null;

                try {
                  await prisma.prescriptionFill.create({
                    data: {
                      externalId: extId,
                      prescriptionId: rx.id,
                      itemId: item?.id || null,
                      fillNumber: fill.refill || 0,
                      ndc: drx.dispensed_item?.ndc || null,
                      quantity: new Prisma.Decimal(fill.dispensed_quantity || 0),
                      daysSupply: fill.days_supply,
                      status: fill.status || drxStatus,
                      binLocation: fill.will_call_location || null,
                      copayAmount: fill.patient_pay_amount != null ? new Prisma.Decimal(fill.patient_pay_amount) : null,
                      ingredientCost: fill.fill_cost != null ? new Prisma.Decimal(fill.fill_cost) : null,
                      dispensingFee: fill.dispensing_fee != null ? new Prisma.Decimal(fill.dispensing_fee) : null,
                      totalPrice: fill.retail_amount != null ? new Prisma.Decimal(fill.retail_amount) : null,
                      filledAt: fill.fill_date ? new Date(fill.fill_date) : null,
                      dispensedAt: fill.first_sold_on ? new Date(fill.first_sold_on) : null,
                    },
                  });
                  totalCreated++;
                } catch (e: any) {
                  if (e?.code === "P2002") totalSkipped++; else errors++;
                }
              }
              statusTotal++;
            } catch { errors++; }
          }
        },
        { status: drxStatus },
        hasTimeLeft
      );
      statusCounts[drxStatus] = statusTotal;
      console.log(`[Queue Sync] ${drxStatus}: ${statusTotal} fills`);
    } catch (e) {
      console.error(`[Queue Sync] Error fetching ${drxStatus}:`, e);
      errors++;
    }
  }

  const duration = Date.now() - syncStartedAt;
  console.log(`[Queue Sync] Done: ${totalUpdated} updated, ${totalCreated} created, ${totalSkipped} skipped, ${errors} errors (${duration}ms)`);

  return { statusCounts, totalUpdated, totalCreated, totalSkipped, errors, duration };
}

// ─── Main Sync Orchestrator ────────────────────

export type SyncEntity = "doctors" | "items" | "patients" | "prescriptions" | "fills" | "all";

export async function runSync(
  entities: SyncEntity = "all",
  fullResync = false
): Promise<SyncResult[]> {
  const { prisma } = await import("@/lib/prisma");

  syncStartedAt = Date.now();

  // Ensure sync log table exists
  await ensureSyncLogTable(prisma);

  const results: SyncResult[] = [];

  // Priority order for sync
  const allEntities: SyncEntity[] = ["doctors", "items", "patients", "prescriptions", "fills"];

  if (entities !== "all") {
    // Specific entity requested — sync just that one
    const entity = entities;
    const lastSync = fullResync ? null : await getLastSyncTime(prisma, entity);
    console.log(`[DRX Sync] Starting ${entity} (${lastSync ? `delta since ${lastSync.toISOString()}` : "full"}) [${Math.round(timeRemaining() / 1000)}s budget]`);
    const result = await runEntitySync(prisma, entity, lastSync);
    console.log(`[DRX Sync] ${entity}: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors (${result.duration}ms)${result.timedOut ? " [PARTIAL]" : ""}`);
    await updateSyncLog(prisma, entity, result);
    results.push(result);
    return results;
  }

  // "all" mode: pick ONE entity per cron run to stay within timeout.
  // Priority: entities that have never been synced first, then oldest sync.
  const syncTimes: { entity: SyncEntity; lastSync: Date | null }[] = [];
  for (const e of allEntities) {
    const ls = fullResync ? null : await getLastSyncTime(prisma, e);
    syncTimes.push({ entity: e, lastSync: ls });
  }

  // Sort: never-synced first, then oldest lastSync
  syncTimes.sort((a, b) => {
    if (!a.lastSync && !b.lastSync) return 0;
    if (!a.lastSync) return -1;
    if (!b.lastSync) return 1;
    return a.lastSync.getTime() - b.lastSync.getTime();
  });

  // Pick the first (highest priority) entity
  const target = syncTimes[0];
  console.log(`[DRX Sync] Picking ${target.entity} (${target.lastSync ? `delta since ${target.lastSync.toISOString()}` : "full"}) [${Math.round(timeRemaining() / 1000)}s budget]`);

  const result = await runEntitySync(prisma, target.entity, target.lastSync);

  console.log(`[DRX Sync] ${target.entity}: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors (${result.duration}ms)${result.timedOut ? " [PARTIAL]" : ""}`);

  await updateSyncLog(prisma, target.entity, result);
  results.push(result);

  return results;
}

async function runEntitySync(prisma: any, entity: SyncEntity, lastSync: Date | null): Promise<SyncResult> {
  switch (entity) {
    case "doctors":
      return syncDoctors(prisma, lastSync);
    case "items":
      return syncItems(prisma, lastSync);
    case "patients":
      return syncPatients(prisma, lastSync);
    case "prescriptions":
      return syncPrescriptions(prisma, lastSync);
    case "fills":
      return syncPrescriptionFills(prisma, lastSync);
    default:
      return { entity, imported: 0, updated: 0, skipped: 0, errors: 0, duration: 0 };
  }
}

// ─── Ensure sync log table ─────────────────────

async function ensureSyncLogTable(prisma: any): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS drx_sync_log (
        entity VARCHAR(50) PRIMARY KEY,
        last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        records_synced INT NOT NULL DEFAULT 0,
        errors INT NOT NULL DEFAULT 0,
        duration_ms INT NOT NULL DEFAULT 0,
        sync_count INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  } catch {
    // Table may already exist
  }
}

// ─── Get sync status for dashboard ─────────────

export async function getSyncStatus(): Promise<{
  enabled: boolean;
  entities: {
    entity: string;
    lastSync: string | null;
    recordsSynced: number;
    errors: number;
    durationMs: number;
    syncCount: number;
  }[];
}> {
  const { prisma } = await import("@/lib/prisma");
  const hasKey = !!process.env.DRX_API_KEY;

  if (!hasKey) {
    return { enabled: false, entities: [] };
  }

  try {
    await ensureSyncLogTable(prisma);
    const rows = await prisma.$queryRaw`
      SELECT entity, last_sync_at, records_synced, errors, duration_ms, sync_count
      FROM drx_sync_log ORDER BY entity
    `;
    const arr = rows as any[];
    return {
      enabled: true,
      entities: arr.map((r) => ({
        entity: r.entity,
        lastSync: r.last_sync_at?.toISOString() || null,
        recordsSynced: r.records_synced || 0,
        errors: r.errors || 0,
        durationMs: r.duration_ms || 0,
        syncCount: r.sync_count || 0,
      })),
    };
  } catch {
    return { enabled: true, entities: [] };
  }
}
