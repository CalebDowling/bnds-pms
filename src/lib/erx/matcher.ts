import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import type { ParsedNewRx } from "./parser";

/**
 * Patient match result with confidence levels
 */
export interface PatientMatch {
  patientId: string | null;
  confidence: "exact" | "probable" | "possible" | "none";
  candidates: Array<{
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    dateOfBirth: Date;
    score: number;
  }>;
}

/**
 * Prescriber match result with confidence levels
 */
export interface PrescriberMatch {
  prescriberId: string | null;
  confidence: "exact" | "probable" | "possible" | "none";
  candidates: Array<{
    id: string;
    firstName: string;
    lastName: string;
    npi: string;
    score: number;
  }>;
}

/**
 * Drug match result with confidence levels
 */
export interface DrugMatch {
  itemId: string | null;
  formulaId: string | null;
  confidence: "exact" | "probable" | "possible" | "none";
  candidates: Array<{
    id: string;
    type: "item" | "formula";
    name: string;
    ndc?: string;
    score: number;
  }>;
}

/**
 * Combined match result for all three entities
 */
export interface MatchResult {
  patient: PatientMatch;
  prescriber: PrescriberMatch;
  drug: DrugMatch;
}

/**
 * Simple fuzzy match scoring (0-1 scale)
 * Compares two strings for similarity
 */
function fuzzyScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const shorter = s1.length < s2.length ? s1 : s2;
  const longer = s1.length >= s2.length ? s1 : s2;

  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  // Levenshtein-like simple distance
  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) {
      matches++;
    }
  }

  return matches / Math.max(s1.length, s2.length);
}

/**
 * Format date to YYYY-MM-DD for comparison
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string (flexible format: YYYY-MM-DD or other ISO formats)
 */
function parsePatientDob(dobString: string): Date | null {
  try {
    const date = new Date(dobString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Match patient by name and DOB
 * Strategy: exact match first, then fuzzy match, then name only
 */
export async function matchPatient(
  patientData: ParsedNewRx["patient"]
): Promise<PatientMatch> {
  try {
    const candidates: PatientMatch["candidates"] = [];

    // Parse the incoming DOB
    const incomingDob = parsePatientDob(patientData.dateOfBirth);
    const incomingDobStr = incomingDob ? formatDate(incomingDob) : null;

    // Query all patients (we'll score them)
    const allPatients = await prisma.patient.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        dateOfBirth: true,
        mrn: true,
      },
    });

    // Score each patient
    for (const patient of allPatients) {
      const patientDobStr = formatDate(patient.dateOfBirth);

      // Exact match: first + last name + DOB
      if (
        patient.firstName.toLowerCase() === patientData.firstName.toLowerCase() &&
        patient.lastName.toLowerCase() === patientData.lastName.toLowerCase() &&
        incomingDobStr &&
        patientDobStr === incomingDobStr
      ) {
        candidates.push({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          mrn: patient.mrn,
          dateOfBirth: patient.dateOfBirth,
          score: 1.0,
        });
        continue;
      }

      // Fuzzy match: last name + DOB similar
      if (incomingDobStr && patientDobStr === incomingDobStr) {
        const nameScore = fuzzyScore(
          patientData.lastName,
          patient.lastName
        );
        if (nameScore > 0.7) {
          candidates.push({
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            mrn: patient.mrn,
            dateOfBirth: patient.dateOfBirth,
            score: nameScore * 0.9, // Slight penalty for fuzzy
          });
          continue;
        }
      }

      // Possible match: last name only (lower confidence)
      const nameScore = fuzzyScore(
        patientData.lastName,
        patient.lastName
      );
      if (nameScore > 0.8) {
        candidates.push({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          mrn: patient.mrn,
          dateOfBirth: patient.dateOfBirth,
          score: nameScore * 0.5, // Lower confidence
        });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Determine confidence level
    let confidence: PatientMatch["confidence"] = "none";
    let patientId: string | null = null;

    if (candidates.length > 0) {
      const topScore = candidates[0].score;
      if (topScore === 1.0) {
        confidence = "exact";
        patientId = candidates[0].id;
      } else if (topScore > 0.8) {
        confidence = "probable";
        patientId = candidates[0].id;
      } else if (topScore > 0.6) {
        confidence = "possible";
      }
    }

    return {
      patientId,
      confidence,
      candidates: candidates.slice(0, 5), // Top 5 candidates
    };
  } catch (error) {
    throw new Error(
      `Failed to match patient: ${getErrorMessage(error)}`
    );
  }
}

/**
 * Match prescriber by NPI, DEA, or name
 */
export async function matchPrescriber(
  prescriberData: ParsedNewRx["prescriber"]
): Promise<PrescriberMatch> {
  try {
    const candidates: PrescriberMatch["candidates"] = [];

    // Strategy 1: Match by NPI (exact)
    if (prescriberData.npi) {
      const byNpi = await prisma.prescriber.findMany({
        where: {
          npi: prescriberData.npi,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          npi: true,
        },
      });

      for (const prescriber of byNpi) {
        candidates.push({
          id: prescriber.id,
          firstName: prescriber.firstName,
          lastName: prescriber.lastName,
          npi: prescriber.npi || "",
          score: 1.0,
        });
      }

      if (candidates.length > 0) {
        return {
          prescriberId: candidates[0].id,
          confidence: "exact",
          candidates: candidates.slice(0, 5),
        };
      }
    }

    // Strategy 2: Match by DEA number
    if (prescriberData.deaNumber) {
      const byDea = await prisma.prescriber.findMany({
        where: {
          deaNumber: prescriberData.deaNumber,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          npi: true,
        },
      });

      for (const prescriber of byDea) {
        candidates.push({
          id: prescriber.id,
          firstName: prescriber.firstName,
          lastName: prescriber.lastName,
          npi: prescriber.npi || "",
          score: 0.95,
        });
      }

      if (candidates.length > 0) {
        return {
          prescriberId: candidates[0].id,
          confidence: "exact",
          candidates: candidates.slice(0, 5),
        };
      }
    }

    // Strategy 3: Match by name (fuzzy)
    const allPrescribers = await prisma.prescriber.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        npi: true,
      },
    });

    for (const prescriber of allPrescribers) {
      const firstNameScore = fuzzyScore(
        prescriberData.firstName,
        prescriber.firstName
      );
      const lastNameScore = fuzzyScore(
        prescriberData.lastName,
        prescriber.lastName
      );

      // Average of name scores
      const score = (firstNameScore + lastNameScore) / 2;

      if (score > 0.7) {
        candidates.push({
          id: prescriber.id,
          firstName: prescriber.firstName,
          lastName: prescriber.lastName,
          npi: prescriber.npi || "",
          score,
        });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Determine confidence
    let confidence: PrescriberMatch["confidence"] = "none";
    let prescriberId: string | null = null;

    if (candidates.length > 0) {
      const topScore = candidates[0].score;
      if (topScore > 0.9) {
        confidence = "probable";
        prescriberId = candidates[0].id;
      } else if (topScore > 0.7) {
        confidence = "possible";
      }
    }

    return {
      prescriberId,
      confidence,
      candidates: candidates.slice(0, 5),
    };
  } catch (error) {
    throw new Error(
      `Failed to match prescriber: ${getErrorMessage(error)}`
    );
  }
}

/**
 * Match drug by NDC or drug name (fuzzy)
 */
export async function matchDrug(
  medicationData: ParsedNewRx["medication"]
): Promise<DrugMatch> {
  try {
    const candidates: DrugMatch["candidates"] = [];
    let itemId: string | null = null;
    let formulaId: string | null = null;

    // Strategy 1: Match by NDC (exact)
    if (medicationData.ndc) {
      const byNdc = await prisma.item.findMany({
        where: {
          ndc: medicationData.ndc,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          ndc: true,
        },
      });

      for (const item of byNdc) {
        candidates.push({
          id: item.id,
          type: "item",
          name: item.name,
          ndc: item.ndc || undefined,
          score: 1.0,
        });
        if (!itemId) itemId = item.id;
      }

      if (candidates.length > 0) {
        return {
          itemId,
          formulaId,
          confidence: "exact",
          candidates: candidates.slice(0, 5),
        };
      }
    }

    // Strategy 2: Match drug name (fuzzy - non-compound)
    if (!medicationData.isCompound) {
      const allItems = await prisma.item.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          ndc: true,
        },
      });

      for (const item of allItems) {
        const score = fuzzyScore(medicationData.drugName, item.name);
        if (score > 0.7) {
          candidates.push({
            id: item.id,
            type: "item",
            name: item.name,
            ndc: item.ndc || undefined,
            score,
          });
        }
      }
    }

    // Strategy 3: Match formula (for compounds)
    if (medicationData.isCompound) {
      const allFormulas = await prisma.formula.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const formula of allFormulas) {
        const score = fuzzyScore(medicationData.drugName, formula.name);
        if (score > 0.7) {
          candidates.push({
            id: formula.id,
            type: "formula",
            name: formula.name,
            score,
          });
        }
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Determine confidence
    let confidence: DrugMatch["confidence"] = "none";
    if (candidates.length > 0) {
      const topScore = candidates[0].score;
      if (topScore > 0.95) {
        confidence = "probable";
        if (candidates[0].type === "item") {
          itemId = candidates[0].id;
        } else {
          formulaId = candidates[0].id;
        }
      } else if (topScore > 0.8) {
        confidence = "possible";
      }
    }

    return {
      itemId,
      formulaId,
      confidence,
      candidates: candidates.slice(0, 5),
    };
  } catch (error) {
    throw new Error(`Failed to match drug: ${getErrorMessage(error)}`);
  }
}

/**
 * Match all entities (patient, prescriber, drug)
 */
export async function matchAll(
  parsed: ParsedNewRx
): Promise<MatchResult> {
  const [patient, prescriber, drug] = await Promise.all([
    matchPatient(parsed.patient),
    matchPrescriber(parsed.prescriber),
    matchDrug(parsed.medication),
  ]);

  return {
    patient,
    prescriber,
    drug,
  };
}
