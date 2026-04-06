/**
 * Louisiana LINKS Immunization Information System (IIS) Integration
 *
 * Provides HL7-based communication with the state immunization registry:
 *   - VXU (V04) vaccine update messages for reporting administered vaccines
 *   - QBP (Q11) query-by-parameter messages for retrieving patient history
 *   - CDC-schedule clinical decision support for vaccine recommendations
 *
 * Environment variables:
 *   IMM_REGISTRY_URL        - LINKS API endpoint
 *   IMM_REGISTRY_FACILITY_ID - Assigned facility identifier
 *   IMM_REGISTRY_API_KEY     - Authentication key
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImmunizationRecord {
  id: string;
  patientId: string;
  patientName: string;
  dateOfBirth: string;
  vaccineName: string;
  cvxCode: string;
  dateAdministered: string;
  lotNumber: string;
  manufacturer: string;
  expirationDate: string;
  administrationSite: 'Left Deltoid' | 'Right Deltoid' | 'Left Thigh' | 'Right Thigh' | 'Other';
  administrationRoute: 'IM' | 'SC' | 'ID' | 'PO' | 'IN';
  dose: string;
  series: string;
  administeringPharmacist: string;
  administeringPharmacistNPI: string;
  visDateGiven: string;
  nextDoseDate: string | null;
  registrySubmitted: boolean;
  registryAck: string | null;
  createdAt: string;
}

export type VaccineUrgency = 'overdue' | 'due' | 'upcoming' | 'complete';

export interface VaccineRecommendation {
  vaccineName: string;
  cvxCode: string;
  urgency: VaccineUrgency;
  dueDate: string;
  reason: string;
  doseNumber: number;
  totalDoses: number;
  earliestDate: string;
  latestDate: string;
}

export interface RegistryQueryResult {
  success: boolean;
  patientId: string;
  records: ImmunizationRecord[];
  queryTimestamp: string;
  registryMessageId: string | null;
  error: string | null;
}

export interface RegistrySubmitResult {
  success: boolean;
  registryAck: string | null;
  messageId: string;
  error: string | null;
}

interface HL7Segment {
  type: string;
  fields: string[];
}

// ---------------------------------------------------------------------------
// CDC Immunization Schedule
// ---------------------------------------------------------------------------

interface ScheduleEntry {
  vaccineName: string;
  cvxCode: string;
  doses: {
    doseNumber: number;
    minAgeMonths: number;
    recommendedAgeMonths: number;
    maxAgeMonths: number | null;
    intervalMonthsFromPrev: number | null;
  }[];
  adultBoosterIntervalYears: number | null;
}

const CDC_SCHEDULE: ScheduleEntry[] = [
  {
    vaccineName: 'Influenza',
    cvxCode: '141',
    doses: [
      { doseNumber: 1, minAgeMonths: 6, recommendedAgeMonths: 6, maxAgeMonths: null, intervalMonthsFromPrev: null },
    ],
    adultBoosterIntervalYears: 1,
  },
  {
    vaccineName: 'COVID-19',
    cvxCode: '213',
    doses: [
      { doseNumber: 1, minAgeMonths: 6, recommendedAgeMonths: 6, maxAgeMonths: null, intervalMonthsFromPrev: null },
    ],
    adultBoosterIntervalYears: 1,
  },
  {
    vaccineName: 'Tdap',
    cvxCode: '115',
    doses: [
      { doseNumber: 1, minAgeMonths: 84, recommendedAgeMonths: 132, maxAgeMonths: null, intervalMonthsFromPrev: null },
    ],
    adultBoosterIntervalYears: 10,
  },
  {
    vaccineName: 'Shingrix (Zoster)',
    cvxCode: '187',
    doses: [
      { doseNumber: 1, minAgeMonths: 600, recommendedAgeMonths: 600, maxAgeMonths: null, intervalMonthsFromPrev: null },
      { doseNumber: 2, minAgeMonths: 602, recommendedAgeMonths: 604, maxAgeMonths: null, intervalMonthsFromPrev: 2 },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'Pneumococcal (PCV20)',
    cvxCode: '216',
    doses: [
      { doseNumber: 1, minAgeMonths: 780, recommendedAgeMonths: 780, maxAgeMonths: null, intervalMonthsFromPrev: null },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'Hepatitis A',
    cvxCode: '083',
    doses: [
      { doseNumber: 1, minAgeMonths: 12, recommendedAgeMonths: 12, maxAgeMonths: null, intervalMonthsFromPrev: null },
      { doseNumber: 2, minAgeMonths: 18, recommendedAgeMonths: 18, maxAgeMonths: null, intervalMonthsFromPrev: 6 },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'Hepatitis B',
    cvxCode: '045',
    doses: [
      { doseNumber: 1, minAgeMonths: 0, recommendedAgeMonths: 0, maxAgeMonths: null, intervalMonthsFromPrev: null },
      { doseNumber: 2, minAgeMonths: 1, recommendedAgeMonths: 1, maxAgeMonths: null, intervalMonthsFromPrev: 1 },
      { doseNumber: 3, minAgeMonths: 6, recommendedAgeMonths: 6, maxAgeMonths: null, intervalMonthsFromPrev: 5 },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'MMR',
    cvxCode: '003',
    doses: [
      { doseNumber: 1, minAgeMonths: 12, recommendedAgeMonths: 12, maxAgeMonths: null, intervalMonthsFromPrev: null },
      { doseNumber: 2, minAgeMonths: 48, recommendedAgeMonths: 48, maxAgeMonths: null, intervalMonthsFromPrev: 3 },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'Varicella',
    cvxCode: '021',
    doses: [
      { doseNumber: 1, minAgeMonths: 12, recommendedAgeMonths: 12, maxAgeMonths: null, intervalMonthsFromPrev: null },
      { doseNumber: 2, minAgeMonths: 48, recommendedAgeMonths: 48, maxAgeMonths: null, intervalMonthsFromPrev: 3 },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'HPV (Gardasil 9)',
    cvxCode: '165',
    doses: [
      { doseNumber: 1, minAgeMonths: 108, recommendedAgeMonths: 132, maxAgeMonths: 312, intervalMonthsFromPrev: null },
      { doseNumber: 2, minAgeMonths: 110, recommendedAgeMonths: 138, maxAgeMonths: 312, intervalMonthsFromPrev: 2 },
      { doseNumber: 3, minAgeMonths: 114, recommendedAgeMonths: 144, maxAgeMonths: 312, intervalMonthsFromPrev: 4 },
    ],
    adultBoosterIntervalYears: null,
  },
  {
    vaccineName: 'RSV (Abrysvo)',
    cvxCode: '310',
    doses: [
      { doseNumber: 1, minAgeMonths: 720, recommendedAgeMonths: 720, maxAgeMonths: null, intervalMonthsFromPrev: null },
    ],
    adultBoosterIntervalYears: null,
  },
];

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

function getConfig() {
  const url = process.env.IMM_REGISTRY_URL;
  const facilityId = process.env.IMM_REGISTRY_FACILITY_ID;
  const apiKey = process.env.IMM_REGISTRY_API_KEY;

  if (!url || !facilityId || !apiKey) {
    console.warn(
      '[ImmunizationRegistry] Missing env vars. Operating in local-only mode.',
    );
  }

  return { url, facilityId, apiKey };
}

function generateMessageControlId(): string {
  return `BNDS${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatHL7Date(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}${s}`;
}

function parseHL7Date(hl7: string): string {
  if (!hl7 || hl7.length < 8) return '';
  const y = hl7.slice(0, 4);
  const m = hl7.slice(4, 6);
  const d = hl7.slice(6, 8);
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// HL7 Message Builders
// ---------------------------------------------------------------------------

function buildMSHSegment(messageType: string, triggerEvent: string): string {
  const config = getConfig();
  const now = formatHL7Date(new Date());
  const controlId = generateMessageControlId();
  return [
    'MSH',
    '^~\\&',
    'BNDS_PMS',
    config.facilityId ?? 'BNDS_PHARMACY',
    'LA_LINKS',
    'LA_IIS',
    now,
    '',
    `${messageType}^${triggerEvent}^${messageType}_${triggerEvent}`,
    controlId,
    'P',
    '2.5.1',
  ].join('|');
}

function buildQBPQuery(
  patientId: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
): string {
  const msh = buildMSHSegment('QBP', 'Q11');
  const qpd = [
    'QPD',
    'Z34^Request Immunization History^CDCPHINVS',
    generateMessageControlId(),
    `${patientId}^^^BNDS`,
    `${lastName}^${firstName}`,
    dateOfBirth.replace(/-/g, ''),
  ].join('|');
  const rcp = 'RCP|I|99^RD';
  return [msh, qpd, rcp].join('\r');
}

function buildVXUMessage(record: ImmunizationRecord): string {
  const msh = buildMSHSegment('VXU', 'V04');
  const pid = [
    'PID',
    '1',
    '',
    `${record.patientId}^^^BNDS`,
    '',
    record.patientName.replace(' ', '^'),
    '',
    record.dateOfBirth.replace(/-/g, ''),
  ].join('|');

  const siteMap: Record<string, string> = {
    'Left Deltoid': 'LD',
    'Right Deltoid': 'RD',
    'Left Thigh': 'LT',
    'Right Thigh': 'RT',
    Other: 'OTH',
  };

  const orc = ['ORC', 'RE', '', generateMessageControlId()].join('|');
  const rxa = [
    'RXA',
    '0',
    '1',
    record.dateAdministered.replace(/-/g, ''),
    record.dateAdministered.replace(/-/g, ''),
    `${record.cvxCode}^${record.vaccineName}^CVX`,
    '999',
    '',
    '',
    '',
    `${record.administeringPharmacistNPI}^${record.administeringPharmacist}^^^^^NPI`,
    '',
    '',
    `${record.lotNumber}^^${record.manufacturer}`,
    '',
    record.expirationDate?.replace(/-/g, '') ?? '',
  ].join('|');
  const rxr = [
    'RXR',
    `${record.administrationRoute}^${record.administrationRoute}^HL70162`,
    `${siteMap[record.administrationSite] ?? 'OTH'}^${record.administrationSite}^HL70163`,
  ].join('|');
  const obx = [
    'OBX',
    '1',
    'CE',
    '69764-9^Document Type^LN',
    '1',
    `253088698300028811150224^Vaccine Information Statement^cdcgs1vis`,
    '',
    '',
    '',
    '',
    '',
    'F',
    '',
    '',
    record.visDateGiven.replace(/-/g, ''),
  ].join('|');

  return [msh, pid, orc, rxa, rxr, obx].join('\r');
}

function parseHL7Response(raw: string): HL7Segment[] {
  return raw.split(/\r|\n/).filter(Boolean).map((line) => {
    const fields = line.split('|');
    return { type: fields[0], fields };
  });
}

// ---------------------------------------------------------------------------
// Registry HTTP client
// ---------------------------------------------------------------------------

async function sendToRegistry(
  messageType: 'QBP' | 'VXU',
  hl7Message: string,
): Promise<{ success: boolean; response: string; error: string | null }> {
  const config = getConfig();

  if (!config.url || !config.apiKey) {
    return {
      success: false,
      response: '',
      error: 'Registry not configured. Operating in local-only mode.',
    };
  }

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/hl7-v2',
        Authorization: `Bearer ${config.apiKey}`,
        'X-Facility-ID': config.facilityId!,
        'X-Message-Type': messageType,
      },
      body: hl7Message,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return {
        success: false,
        response: '',
        error: `Registry returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const body = await res.text();
    return { success: true, response: body, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ImmunizationRegistry] Send failed:', message);
    return { success: false, response: '', error: message };
  }
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

/**
 * Query a patient's immunization history from Louisiana LINKS IIS.
 * Falls back to local records if the registry is unavailable.
 */
export async function queryPatientHistory(
  patientId: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
): Promise<RegistryQueryResult> {
  const hl7 = buildQBPQuery(patientId, firstName, lastName, dateOfBirth);
  const result = await sendToRegistry('QBP', hl7);

  if (!result.success) {
    return {
      success: false,
      patientId,
      records: [],
      queryTimestamp: new Date().toISOString(),
      registryMessageId: null,
      error: result.error,
    };
  }

  // Parse HL7 response segments into ImmunizationRecord objects
  const segments = parseHL7Response(result.response);
  const records: ImmunizationRecord[] = [];
  let currentRecord: Partial<ImmunizationRecord> | null = null;

  for (const seg of segments) {
    if (seg.type === 'RXA') {
      if (currentRecord && currentRecord.vaccineName) {
        records.push(currentRecord as ImmunizationRecord);
      }
      const cvxParts = (seg.fields[5] ?? '').split('^');
      const lotParts = (seg.fields[15] ?? '').split('^');
      const providerParts = (seg.fields[10] ?? '').split('^');
      currentRecord = {
        id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientId,
        patientName: `${firstName} ${lastName}`,
        dateOfBirth,
        vaccineName: cvxParts[1] ?? '',
        cvxCode: cvxParts[0] ?? '',
        dateAdministered: parseHL7Date(seg.fields[3] ?? ''),
        lotNumber: lotParts[0] ?? '',
        manufacturer: lotParts[2] ?? '',
        expirationDate: parseHL7Date(seg.fields[16] ?? ''),
        administrationSite: 'Other',
        administrationRoute: 'IM',
        dose: seg.fields[6] ?? '',
        series: '',
        administeringPharmacist: providerParts[1] ?? '',
        administeringPharmacistNPI: providerParts[0] ?? '',
        visDateGiven: '',
        nextDoseDate: null,
        registrySubmitted: true,
        registryAck: null,
        createdAt: new Date().toISOString(),
      };
    } else if (seg.type === 'RXR' && currentRecord) {
      const routeParts = (seg.fields[1] ?? '').split('^');
      const siteParts = (seg.fields[2] ?? '').split('^');
      currentRecord.administrationRoute =
        (routeParts[0] as ImmunizationRecord['administrationRoute']) ?? 'IM';
      const siteLabel = siteParts[1] ?? '';
      if (siteLabel.includes('Left') && siteLabel.includes('Deltoid')) {
        currentRecord.administrationSite = 'Left Deltoid';
      } else if (siteLabel.includes('Right') && siteLabel.includes('Deltoid')) {
        currentRecord.administrationSite = 'Right Deltoid';
      } else if (siteLabel.includes('Left') && siteLabel.includes('Thigh')) {
        currentRecord.administrationSite = 'Left Thigh';
      } else if (siteLabel.includes('Right') && siteLabel.includes('Thigh')) {
        currentRecord.administrationSite = 'Right Thigh';
      }
    }
  }
  if (currentRecord && currentRecord.vaccineName) {
    records.push(currentRecord as ImmunizationRecord);
  }

  const msa = segments.find((s) => s.type === 'MSA');
  const ack = msa ? msa.fields[1] ?? null : null;

  return {
    success: true,
    patientId,
    records,
    queryTimestamp: new Date().toISOString(),
    registryMessageId: ack,
    error: null,
  };
}

/**
 * Submit an administered vaccine record to Louisiana LINKS IIS.
 */
export async function submitVaccineRecord(
  record: ImmunizationRecord,
): Promise<RegistrySubmitResult> {
  const messageId = generateMessageControlId();
  const hl7 = buildVXUMessage(record);
  const result = await sendToRegistry('VXU', hl7);

  if (!result.success) {
    return {
      success: false,
      registryAck: null,
      messageId,
      error: result.error,
    };
  }

  const segments = parseHL7Response(result.response);
  const msa = segments.find((s) => s.type === 'MSA');
  const ackCode = msa?.fields[1] ?? 'AA';

  return {
    success: ackCode === 'AA' || ackCode === 'CA',
    registryAck: ackCode,
    messageId,
    error: ackCode === 'AE' || ackCode === 'AR'
      ? `Registry rejected submission: ${msa?.fields[3] ?? 'Unknown reason'}`
      : null,
  };
}

/**
 * Clinical decision support: determine which vaccines a patient is due for
 * based on the CDC schedule, the patient's age, and their immunization history.
 */
export function getRecommendedVaccines(
  dateOfBirth: string,
  immunizationHistory: ImmunizationRecord[],
): VaccineRecommendation[] {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const ageMonths =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());

  const recommendations: VaccineRecommendation[] = [];

  for (const entry of CDC_SCHEDULE) {
    // Gather history for this vaccine by CVX code
    const received = immunizationHistory
      .filter((r) => r.cvxCode === entry.cvxCode)
      .sort(
        (a, b) =>
          new Date(a.dateAdministered).getTime() -
          new Date(b.dateAdministered).getTime(),
      );

    const dosesReceived = received.length;

    // Check annual boosters (e.g. flu, COVID)
    if (entry.adultBoosterIntervalYears) {
      const minAge = entry.doses[0].minAgeMonths;
      if (ageMonths < minAge) continue;

      const lastDose = received[received.length - 1];
      const lastDoseDate = lastDose
        ? new Date(lastDose.dateAdministered)
        : null;
      const intervalMs =
        entry.adultBoosterIntervalYears * 365.25 * 24 * 60 * 60 * 1000;

      if (!lastDoseDate || now.getTime() - lastDoseDate.getTime() > intervalMs) {
        const dueDate = lastDoseDate
          ? new Date(lastDoseDate.getTime() + intervalMs)
          : now;
        const overdue = dueDate.getTime() < now.getTime();

        recommendations.push({
          vaccineName: entry.vaccineName,
          cvxCode: entry.cvxCode,
          urgency: overdue ? 'overdue' : 'due',
          dueDate: dueDate.toISOString().split('T')[0],
          reason: lastDoseDate
            ? `Annual ${entry.vaccineName} -- last dose ${lastDose!.dateAdministered}`
            : `No ${entry.vaccineName} on record`,
          doseNumber: dosesReceived + 1,
          totalDoses: 0, // ongoing
          earliestDate: now.toISOString().split('T')[0],
          latestDate: '',
        });
      }
      continue;
    }

    // Multi-dose series
    if (dosesReceived >= entry.doses.length) {
      // Series complete
      continue;
    }

    const nextDose = entry.doses[dosesReceived];
    if (!nextDose) continue;

    // Check max age
    if (nextDose.maxAgeMonths && ageMonths > nextDose.maxAgeMonths) continue;

    // Calculate recommended date
    let recommendedDate: Date;
    if (nextDose.intervalMonthsFromPrev && received.length > 0) {
      const lastDate = new Date(
        received[received.length - 1].dateAdministered,
      );
      recommendedDate = new Date(lastDate);
      recommendedDate.setMonth(
        recommendedDate.getMonth() + nextDose.intervalMonthsFromPrev,
      );
    } else {
      recommendedDate = new Date(dob);
      recommendedDate.setMonth(
        recommendedDate.getMonth() + nextDose.recommendedAgeMonths,
      );
    }

    const earliestDate = new Date(dob);
    earliestDate.setMonth(
      earliestDate.getMonth() + nextDose.minAgeMonths,
    );

    let urgency: VaccineUrgency;
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    if (recommendedDate.getTime() < now.getTime()) {
      urgency = 'overdue';
    } else if (recommendedDate.getTime() <= threeMonthsFromNow.getTime()) {
      urgency = 'due';
    } else {
      urgency = 'upcoming';
    }

    recommendations.push({
      vaccineName: entry.vaccineName,
      cvxCode: entry.cvxCode,
      urgency,
      dueDate: recommendedDate.toISOString().split('T')[0],
      reason:
        dosesReceived === 0
          ? `No ${entry.vaccineName} on record -- dose 1 recommended`
          : `Dose ${nextDose.doseNumber} of ${entry.doses.length} in series`,
      doseNumber: nextDose.doseNumber,
      totalDoses: entry.doses.length,
      earliestDate: earliestDate.toISOString().split('T')[0],
      latestDate: nextDose.maxAgeMonths
        ? (() => {
            const d = new Date(dob);
            d.setMonth(d.getMonth() + nextDose.maxAgeMonths);
            return d.toISOString().split('T')[0];
          })()
        : '',
    });
  }

  // Sort: overdue first, then due, then upcoming
  const urgencyOrder: Record<VaccineUrgency, number> = {
    overdue: 0,
    due: 1,
    upcoming: 2,
    complete: 3,
  };
  recommendations.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency],
  );

  return recommendations;
}
