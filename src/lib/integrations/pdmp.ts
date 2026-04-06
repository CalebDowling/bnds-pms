/**
 * PDMP (Prescription Drug Monitoring Program) Integration
 * Queries state PMP for controlled substance dispensing history
 *
 * Louisiana uses PMP InterConnect (via Appriss/Bamboo Health)
 * API: https://pmpi.bamboohealth.com
 *
 * Required credentials:
 * - PDMP_API_URL: PMP InterConnect endpoint
 * - PDMP_API_KEY: API key from state board enrollment
 * - PDMP_FACILITY_ID: DEA number or NCPDP number
 */

import { logger } from "@/lib/logger";
import { fetchWithRetry } from "./retry";

const PDMP_API_URL = process.env.PDMP_API_URL || "";
const PDMP_API_KEY = process.env.PDMP_API_KEY || "";
const PDMP_FACILITY_ID = process.env.PDMP_FACILITY_ID || "";

export interface PDMPPatientQuery {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  ssnLastFour?: string;
  state?: string; // Default: LA
}

export interface PDMPDispensation {
  dateWritten: string;
  dateFilled: string;
  drugName: string;
  drugSchedule: string; // "II", "III", "IV", "V"
  quantity: number;
  daysSupply: number;
  prescriberName: string;
  prescriberDEA: string;
  pharmacyName: string;
  pharmacyDEA: string;
  refillNumber: number;
  paymentType: string;
}

export interface PDMPResponse {
  success: boolean;
  patientMatch: boolean;
  dispensations: PDMPDispensation[];
  alerts: string[];
  queryId: string;
  error?: string;
}

/**
 * Check if PDMP is configured and available
 */
export function isPDMPConfigured(): boolean {
  return !!(PDMP_API_URL && PDMP_API_KEY && PDMP_FACILITY_ID);
}

/**
 * Query PDMP for a patient's controlled substance history
 */
export async function queryPDMP(query: PDMPPatientQuery): Promise<PDMPResponse> {
  if (!isPDMPConfigured()) {
    // Dev mode: return mock response
    logger.warn("PDMP not configured — returning mock response");
    return {
      success: true,
      patientMatch: true,
      dispensations: [],
      alerts: [],
      queryId: `mock_${Date.now()}`,
    };
  }

  try {
    const response = await fetchWithRetry(
      `${PDMP_API_URL}/api/v1/patient-query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PDMP_API_KEY}`,
          "X-Facility-ID": PDMP_FACILITY_ID,
        },
        body: JSON.stringify({
          patient: {
            firstName: query.firstName,
            lastName: query.lastName,
            dateOfBirth: query.dateOfBirth,
            ssnLast4: query.ssnLastFour,
          },
          requestingState: query.state || "LA",
          lookbackDays: 365,
        }),
      },
      { maxRetries: 2, baseDelayMs: 2000 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("PDMP query failed", { status: response.status, error: errorText });
      return {
        success: false,
        patientMatch: false,
        dispensations: [],
        alerts: [],
        queryId: "",
        error: `PDMP query failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      patientMatch: data.patientMatch ?? true,
      dispensations: data.dispensations || [],
      alerts: data.alerts || [],
      queryId: data.queryId || `pdmp_${Date.now()}`,
    };
  } catch (error) {
    logger.error("PDMP query error", { error });
    return {
      success: false,
      patientMatch: false,
      dispensations: [],
      alerts: [],
      queryId: "",
      error: error instanceof Error ? error.message : "PDMP query failed",
    };
  }
}

/**
 * Check PDMP for potential red flags
 */
export function analyzePDMPResults(dispensations: PDMPDispensation[]): {
  riskLevel: "low" | "moderate" | "high";
  flags: string[];
} {
  const flags: string[] = [];

  // Multiple prescribers for same schedule
  const scheduleII = dispensations.filter((d) => d.drugSchedule === "II");
  const uniquePrescribersDEA = new Set(scheduleII.map((d) => d.prescriberDEA));
  if (uniquePrescribersDEA.size >= 3) {
    flags.push(`${uniquePrescribersDEA.size} different prescribers for Schedule II in past year`);
  }

  // Multiple pharmacies
  const uniquePharmacies = new Set(dispensations.map((d) => d.pharmacyDEA));
  if (uniquePharmacies.size >= 4) {
    flags.push(`${uniquePharmacies.size} different pharmacies in past year`);
  }

  // Overlapping opioid fills
  const opioidFills = dispensations.filter((d) =>
    d.drugSchedule === "II" && d.daysSupply > 0
  );
  for (let i = 0; i < opioidFills.length; i++) {
    for (let j = i + 1; j < opioidFills.length; j++) {
      const fillA = new Date(opioidFills[i].dateFilled);
      const endA = new Date(fillA.getTime() + opioidFills[i].daysSupply * 86400000);
      const fillB = new Date(opioidFills[j].dateFilled);
      if (fillB < endA) {
        flags.push("Overlapping controlled substance fills detected");
        break;
      }
    }
    if (flags.some((f) => f.includes("Overlapping"))) break;
  }

  // Early refills (filled before 80% of days supply elapsed)
  for (const d of dispensations) {
    if (d.refillNumber > 0 && d.daysSupply > 0) {
      // Check against previous fill of same drug
      const sameDrug = dispensations.filter(
        (x) => x.drugName === d.drugName && x.dateFilled < d.dateFilled
      );
      if (sameDrug.length > 0) {
        const prev = sameDrug[sameDrug.length - 1];
        const prevFill = new Date(prev.dateFilled);
        const expected80 = new Date(prevFill.getTime() + prev.daysSupply * 0.8 * 86400000);
        const currentFill = new Date(d.dateFilled);
        if (currentFill < expected80) {
          flags.push(`Early refill: ${d.drugName} filled before 80% of previous supply elapsed`);
        }
      }
    }
  }

  const riskLevel = flags.length === 0 ? "low" : flags.length <= 2 ? "moderate" : "high";
  return { riskLevel, flags };
}
