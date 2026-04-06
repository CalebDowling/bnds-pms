// @ts-nocheck -- TODO: add proper types to replace this flag
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  queryPatientHistory,
  submitVaccineRecord,
  getRecommendedVaccines,
  type ImmunizationRecord,
  type VaccineRecommendation,
} from '@/lib/integrations/immunization-registry';

// ---------------------------------------------------------------------------
// Helpers -- StoreSetting-backed JSON persistence
// ---------------------------------------------------------------------------

async function getStoredRecords(): Promise<ImmunizationRecord[]> {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: 'immunization_records' },
  });
  if (!setting?.value) return [];
  try {
    const parsed = JSON.parse(setting.value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveStoredRecords(records: ImmunizationRecord[]): Promise<void> {
  await prisma.storeSetting.upsert({
    where: { key: 'immunization_records' },
    update: { value: JSON.stringify(records) },
    create: { key: 'immunization_records', value: JSON.stringify(records) },
  });
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export interface ImmunizationDashboard {
  vaccinesGivenToday: number;
  vaccinesGivenMonth: number;
  patientsDueForVaccines: number;
  recentVaccinations: ImmunizationRecord[];
}

export async function getImmunizationDashboard(): Promise<ImmunizationDashboard> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const records = await getStoredRecords();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const vaccinesGivenToday = records.filter(
    (r) => r.dateAdministered === todayStr,
  ).length;

  const vaccinesGivenMonth = records.filter(
    (r) => r.dateAdministered.startsWith(monthStr),
  ).length;

  // Count unique patients that have upcoming/overdue recommendations
  const patientIds = [...new Set(records.map((r) => r.patientId))];
  let patientsDue = 0;
  for (const pid of patientIds) {
    const patientRecords = records.filter((r) => r.patientId === pid);
    if (patientRecords.length > 0) {
      const recs = getRecommendedVaccines(
        patientRecords[0].dateOfBirth,
        patientRecords,
      );
      if (recs.some((r) => r.urgency === 'overdue' || r.urgency === 'due')) {
        patientsDue++;
      }
    }
  }

  // Recent vaccinations sorted by date descending
  const recentVaccinations = [...records]
    .sort(
      (a, b) =>
        new Date(b.dateAdministered).getTime() -
        new Date(a.dateAdministered).getTime(),
    )
    .slice(0, 20);

  return {
    vaccinesGivenToday,
    vaccinesGivenMonth,
    patientsDueForVaccines: patientsDue,
    recentVaccinations,
  };
}

// ---------------------------------------------------------------------------
// Patient immunization history
// ---------------------------------------------------------------------------

export async function getPatientImmunizations(
  patientId: string,
): Promise<{ local: ImmunizationRecord[]; registry: ImmunizationRecord[]; merged: ImmunizationRecord[] }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const allLocal = await getStoredRecords();
  const local = allLocal.filter((r) => r.patientId === patientId);

  // Attempt to query the state registry
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  let registry: ImmunizationRecord[] = [];
  if (patient) {
    const result = await queryPatientHistory(
      patientId,
      patient.firstName,
      patient.lastName,
      patient.dateOfBirth.toISOString().split('T')[0],
    );
    if (result.success) {
      registry = result.records;
    }
  }

  // Merge: local records take precedence, add registry-only records
  const localIds = new Set(local.map((r) => `${r.cvxCode}-${r.dateAdministered}`));
  const registryOnly = registry.filter(
    (r) => !localIds.has(`${r.cvxCode}-${r.dateAdministered}`),
  );

  const merged = [...local, ...registryOnly].sort(
    (a, b) =>
      new Date(b.dateAdministered).getTime() -
      new Date(a.dateAdministered).getTime(),
  );

  return { local, registry, merged };
}

// ---------------------------------------------------------------------------
// Vaccine recommendations
// ---------------------------------------------------------------------------

export async function getVaccineRecommendations(
  patientId: string,
): Promise<VaccineRecommendation[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });
  if (!patient) throw new Error('Patient not found');

  const { merged } = await getPatientImmunizations(patientId);

  return getRecommendedVaccines(
    patient.dateOfBirth.toISOString().split('T')[0],
    merged,
  );
}

// ---------------------------------------------------------------------------
// Record a vaccination
// ---------------------------------------------------------------------------

export interface RecordVaccinationInput {
  patientId: string;
  patientName: string;
  dateOfBirth: string;
  vaccineName: string;
  cvxCode: string;
  lotNumber: string;
  manufacturer: string;
  expirationDate: string;
  administrationSite: ImmunizationRecord['administrationSite'];
  administrationRoute: ImmunizationRecord['administrationRoute'];
  dose: string;
  series: string;
  visDateGiven: string;
  nextDoseDate: string | null;
}

export async function recordVaccination(
  data: RecordVaccinationInput,
): Promise<{ success: boolean; record: ImmunizationRecord; registryResult: { submitted: boolean; error: string | null } }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const record: ImmunizationRecord = {
    id: `imm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    patientId: data.patientId,
    patientName: data.patientName,
    dateOfBirth: data.dateOfBirth,
    vaccineName: data.vaccineName,
    cvxCode: data.cvxCode,
    dateAdministered: new Date().toISOString().split('T')[0],
    lotNumber: data.lotNumber,
    manufacturer: data.manufacturer,
    expirationDate: data.expirationDate,
    administrationSite: data.administrationSite,
    administrationRoute: data.administrationRoute,
    dose: data.dose,
    series: data.series,
    administeringPharmacist: user.name ?? user.email ?? 'Unknown',
    administeringPharmacistNPI: (user as Record<string, unknown>).npi as string ?? '',
    visDateGiven: data.visDateGiven,
    nextDoseDate: data.nextDoseDate,
    registrySubmitted: false,
    registryAck: null,
    createdAt: new Date().toISOString(),
  };

  // Persist locally
  const records = await getStoredRecords();
  records.push(record);
  await saveStoredRecords(records);

  // Submit to state registry
  const registryResult = await submitVaccineRecord(record);
  if (registryResult.success) {
    record.registrySubmitted = true;
    record.registryAck = registryResult.registryAck;
    // Update persisted record with registry ack
    const updated = records.map((r) => (r.id === record.id ? record : r));
    await saveStoredRecords(updated);
  }

  return {
    success: true,
    record,
    registryResult: {
      submitted: registryResult.success,
      error: registryResult.error,
    },
  };
}

// ---------------------------------------------------------------------------
// Patient search
// ---------------------------------------------------------------------------

export interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mrn: string;
  phone: string | null;
}

export async function searchPatients(
  query: string,
): Promise<PatientSearchResult[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!query || query.trim().length < 2) return [];

  const term = query.trim();

  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { mrn: { contains: term, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { lastName: 'asc' },
  });

  return patients.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
    mrn: p.mrn ?? '',
    phone: p.phone ?? null,
  }));
}
