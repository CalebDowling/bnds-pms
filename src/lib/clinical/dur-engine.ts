/**
 * Drug Utilization Review (DUR) Engine
 *
 * Full clinical decision support for pharmacy fills:
 * - Drug-drug interaction checks (OpenFDA / built-in reference)
 * - Drug-allergy cross-reference
 * - Therapeutic duplication detection
 * - Dose range verification
 * - Age/gender appropriateness screening
 * - Severity levels: critical (block), major (warn + require override), moderate (warn), minor (info)
 * - Override recording with reason codes
 *
 * DUR alerts and overrides are stored in StoreSetting JSON for persistence.
 */

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type DURSeverity = "critical" | "major" | "moderate" | "minor";
export type DURAlertType =
  | "drug_interaction"
  | "drug_allergy"
  | "therapeutic_duplication"
  | "dose_range"
  | "age_gender"
  | "refill_too_soon";

export interface DURAlert {
  id: string;
  fillId: string;
  patientId: string;
  alertType: DURAlertType;
  severity: DURSeverity;
  drugA: string;
  drugB?: string;
  description: string;
  clinicalEffect: string;
  recommendation: string;
  overridden: boolean;
  overriddenBy?: string;
  /**
   * Display name of the pharmacist who overrode the alert. Stored on the
   * alert at override-time so we don't have to re-resolve the user every
   * time the audit panel renders. Optional for backwards compat with alerts
   * stored before this field existed (those still surface the UUID).
   */
  overriddenByName?: string;
  overriddenAt?: string;
  overrideReasonCode?: string;
  /**
   * Display label for the override reason code (e.g. "Dose Verified with
   * Prescriber" for code "05"). Stored alongside the code so the audit
   * panel can render the full NCPDP Result-of-Service label without
   * looking the code up on every render.
   */
  overrideReasonLabel?: string;
  overrideNotes?: string;
  createdAt: string;
}

export interface DURResult {
  fillId: string;
  patientId: string;
  drug: string;
  alerts: DURAlert[];
  hasCritical: boolean;
  hasMajor: boolean;
  totalAlerts: number;
  checkedAt: string;
}

export interface DUROverrideReasonCode {
  code: string;
  label: string;
}

// ═══════════════════════════════════════════════
// OVERRIDE REASON CODES
// ═══════════════════════════════════════════════

export const DUR_OVERRIDE_REASON_CODES: DUROverrideReasonCode[] = [
  { code: "00", label: "Not Specified" },
  { code: "01", label: "Prescriber Contacted - Approved" },
  { code: "02", label: "Prescriber Contacted - Changed" },
  { code: "03", label: "Patient Informed of Risk" },
  { code: "04", label: "Therapeutic Appropriateness Confirmed" },
  { code: "05", label: "Dose Verified with Prescriber" },
  { code: "06", label: "Allergy Documented - Not True Allergy" },
  { code: "07", label: "Short-term Use Justified" },
  { code: "08", label: "No Suitable Alternative" },
  { code: "09", label: "Patient Tolerates Medication" },
  { code: "10", label: "Duplicate Therapy Intended" },
  { code: "99", label: "Other (See Notes)" },
];

// ═══════════════════════════════════════════════
// BUILT-IN INTERACTION DATABASE
// ═══════════════════════════════════════════════

interface InteractionEntry {
  drugA: string;
  drugB: string;
  severity: DURSeverity;
  description: string;
  clinicalEffect: string;
  management: string;
}

/**
 * Built-in drug-drug interaction reference.
 * Drug names are stored as lowercase generic names for matching.
 */
const INTERACTION_DB: InteractionEntry[] = [
  { drugA: "warfarin", drugB: "aspirin", severity: "major", description: "Increased bleeding risk", clinicalEffect: "Additive anticoagulant and antiplatelet effects significantly increase bleeding risk", management: "Avoid combination unless clinically necessary. Monitor INR closely." },
  { drugA: "warfarin", drugB: "ibuprofen", severity: "major", description: "Increased bleeding risk", clinicalEffect: "NSAIDs inhibit platelet function and may increase warfarin levels via CYP2C9 inhibition", management: "Use acetaminophen instead. If NSAID required, monitor INR frequently." },
  { drugA: "warfarin", drugB: "fluconazole", severity: "critical", description: "Severe bleeding risk - CYP2C9 inhibition", clinicalEffect: "Fluconazole strongly inhibits CYP2C9, dramatically increasing warfarin levels", management: "Reduce warfarin dose by 50% and monitor INR within 3-5 days." },
  { drugA: "warfarin", drugB: "amiodarone", severity: "critical", description: "Severe bleeding risk", clinicalEffect: "Amiodarone inhibits CYP2C9 and CYP3A4, increasing warfarin effect for weeks", management: "Reduce warfarin dose by 33-50%. Monitor INR weekly for several months." },
  { drugA: "simvastatin", drugB: "amiodarone", severity: "major", description: "Increased risk of rhabdomyolysis", clinicalEffect: "Amiodarone inhibits CYP3A4, increasing statin levels and myopathy risk", management: "Limit simvastatin to 20mg daily or switch to pravastatin/rosuvastatin." },
  { drugA: "metformin", drugB: "contrast dye", severity: "major", description: "Lactic acidosis risk", clinicalEffect: "Iodinated contrast can impair renal function, leading to metformin accumulation", management: "Hold metformin 48 hours before and after contrast administration." },
  { drugA: "ssri", drugB: "tramadol", severity: "major", description: "Serotonin syndrome risk", clinicalEffect: "Additive serotonergic effects can cause potentially fatal serotonin syndrome", management: "Avoid combination. Use non-serotonergic analgesic alternatives." },
  { drugA: "ssri", drugB: "maoi", severity: "critical", description: "Serotonin syndrome - potentially fatal", clinicalEffect: "Combined serotonergic effect can cause hyperthermia, rigidity, myoclonus, death", management: "CONTRAINDICATED. Allow 14-day washout between agents." },
  { drugA: "methotrexate", drugB: "trimethoprim", severity: "critical", description: "Pancytopenia risk", clinicalEffect: "Both are folate antagonists; combination causes severe bone marrow suppression", management: "Avoid combination. If unavoidable, monitor CBC closely and supplement with leucovorin." },
  { drugA: "lisinopril", drugB: "potassium", severity: "major", description: "Hyperkalemia risk", clinicalEffect: "ACE inhibitors reduce aldosterone, decreasing potassium excretion", management: "Monitor potassium levels closely. Avoid potassium supplements unless documented hypokalemia." },
  { drugA: "lisinopril", drugB: "spironolactone", severity: "major", description: "Hyperkalemia risk", clinicalEffect: "Both agents increase serum potassium through different mechanisms", management: "Monitor potassium levels within 1 week and periodically thereafter." },
  { drugA: "ciprofloxacin", drugB: "tizanidine", severity: "critical", description: "Severe hypotension and sedation", clinicalEffect: "Ciprofloxacin inhibits CYP1A2, increasing tizanidine AUC 10-fold", management: "CONTRAINDICATED. Use alternative antibiotic or muscle relaxant." },
  { drugA: "clarithromycin", drugB: "simvastatin", severity: "critical", description: "Rhabdomyolysis risk", clinicalEffect: "Clarithromycin strongly inhibits CYP3A4, markedly increasing statin levels", management: "CONTRAINDICATED. Suspend statin during macrolide therapy." },
  { drugA: "fluoxetine", drugB: "tramadol", severity: "major", description: "Serotonin syndrome and seizure risk", clinicalEffect: "Fluoxetine inhibits CYP2D6 (reducing tramadol efficacy) and adds serotonergic activity", management: "Avoid combination. Use non-serotonergic analgesic." },
  { drugA: "metronidazole", drugB: "alcohol", severity: "major", description: "Disulfiram-like reaction", clinicalEffect: "Inhibition of aldehyde dehydrogenase causes nausea, vomiting, flushing, headache", management: "Avoid alcohol during and for 3 days after metronidazole therapy." },
  { drugA: "digoxin", drugB: "amiodarone", severity: "major", description: "Digoxin toxicity", clinicalEffect: "Amiodarone increases digoxin levels by inhibiting P-glycoprotein", management: "Reduce digoxin dose by 50% and monitor levels within 1 week." },
  { drugA: "amlodipine", drugB: "simvastatin", severity: "moderate", description: "Increased statin levels", clinicalEffect: "Amlodipine weakly inhibits CYP3A4, modestly increasing simvastatin exposure", management: "Limit simvastatin to 20mg daily when used with amlodipine." },
  { drugA: "omeprazole", drugB: "clopidogrel", severity: "major", description: "Reduced antiplatelet effect", clinicalEffect: "Omeprazole inhibits CYP2C19, reducing conversion of clopidogrel to active metabolite", management: "Use pantoprazole instead. Avoid omeprazole/esomeprazole with clopidogrel." },
  { drugA: "carbamazepine", drugB: "oral contraceptives", severity: "major", description: "Contraceptive failure", clinicalEffect: "Carbamazepine induces CYP3A4, reducing contraceptive hormone levels", management: "Use higher-dose or non-oral contraception. Advise backup method." },
];

/**
 * SSRI drug names for class-level matching
 */
const SSRI_DRUGS = [
  "fluoxetine", "sertraline", "paroxetine", "citalopram",
  "escitalopram", "fluvoxamine",
];

const MAOI_DRUGS = [
  "phenelzine", "tranylcypromine", "isocarboxazid", "selegiline",
];

const ACE_INHIBITOR_DRUGS = [
  "lisinopril", "enalapril", "benazepril", "captopril", "ramipril",
  "quinapril", "fosinopril", "perindopril", "trandolapril", "moexipril",
];

// ═══════════════════════════════════════════════
// THERAPEUTIC CLASS MAP
// ═══════════════════════════════════════════════

const THERAPEUTIC_CLASSES: Record<string, string[]> = {
  "ACE Inhibitors": ACE_INHIBITOR_DRUGS,
  "SSRIs": SSRI_DRUGS,
  "Statins": ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin", "fluvastatin", "pitavastatin"],
  "PPIs": ["omeprazole", "esomeprazole", "lansoprazole", "pantoprazole", "rabeprazole", "dexlansoprazole"],
  "ARBs": ["losartan", "valsartan", "irbesartan", "candesartan", "olmesartan", "telmisartan", "azilsartan"],
  "Benzodiazepines": ["alprazolam", "lorazepam", "diazepam", "clonazepam", "temazepam", "oxazepam", "triazolam"],
  "Opioids": ["oxycodone", "hydrocodone", "morphine", "codeine", "fentanyl", "tramadol", "hydromorphone", "methadone", "buprenorphine"],
  "NSAIDs": ["ibuprofen", "naproxen", "diclofenac", "meloxicam", "celecoxib", "indomethacin", "ketorolac", "piroxicam"],
  "Sulfonylureas": ["glipizide", "glyburide", "glimepiride"],
  "Beta Blockers": ["metoprolol", "atenolol", "propranolol", "carvedilol", "bisoprolol", "nebivolol", "labetalol"],
  "Calcium Channel Blockers": ["amlodipine", "nifedipine", "diltiazem", "verapamil", "felodipine"],
  "Thiazide Diuretics": ["hydrochlorothiazide", "chlorthalidone", "indapamide", "metolazone"],
};

// ═══════════════════════════════════════════════
// DOSE RANGE REFERENCE
// ═══════════════════════════════════════════════

interface DoseRange {
  minDaily: number;
  maxDaily: number;
  unit: string;
  typicalDaysSupply: { min: number; max: number };
}

const DOSE_RANGES: Record<string, DoseRange> = {
  lisinopril: { minDaily: 2.5, maxDaily: 80, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  metformin: { minDaily: 500, maxDaily: 2550, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  atorvastatin: { minDaily: 10, maxDaily: 80, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  amlodipine: { minDaily: 2.5, maxDaily: 10, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  metoprolol: { minDaily: 25, maxDaily: 400, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  omeprazole: { minDaily: 10, maxDaily: 40, unit: "mg", typicalDaysSupply: { min: 14, max: 90 } },
  sertraline: { minDaily: 25, maxDaily: 200, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  fluoxetine: { minDaily: 10, maxDaily: 80, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
  gabapentin: { minDaily: 100, maxDaily: 3600, unit: "mg", typicalDaysSupply: { min: 14, max: 90 } },
  amoxicillin: { minDaily: 500, maxDaily: 3000, unit: "mg", typicalDaysSupply: { min: 5, max: 30 } },
  azithromycin: { minDaily: 250, maxDaily: 500, unit: "mg", typicalDaysSupply: { min: 3, max: 10 } },
  prednisone: { minDaily: 1, maxDaily: 80, unit: "mg", typicalDaysSupply: { min: 3, max: 90 } },
  warfarin: { minDaily: 0.5, maxDaily: 15, unit: "mg", typicalDaysSupply: { min: 28, max: 90 } },
};

// ═══════════════════════════════════════════════
// AGE/GENDER CONTRAINDICATIONS
// ═══════════════════════════════════════════════

interface AgeGenderRule {
  drug: string;
  minAge?: number;
  maxAge?: number;
  contraindicatedGender?: string;
  severity: DURSeverity;
  reason: string;
}

const AGE_GENDER_RULES: AgeGenderRule[] = [
  { drug: "fluoroquinolone", minAge: 18, severity: "major", reason: "Fluoroquinolones may cause tendon damage in pediatric patients" },
  { drug: "ciprofloxacin", minAge: 18, severity: "major", reason: "Ciprofloxacin may cause tendon damage in patients under 18" },
  { drug: "tetracycline", minAge: 8, severity: "major", reason: "Tetracyclines cause permanent tooth discoloration in children under 8" },
  { drug: "doxycycline", minAge: 8, severity: "moderate", reason: "Doxycycline may cause tooth discoloration in children under 8" },
  { drug: "finasteride", contraindicatedGender: "female", severity: "critical", reason: "Finasteride is contraindicated in women of childbearing age (teratogenic)" },
  { drug: "dutasteride", contraindicatedGender: "female", severity: "critical", reason: "Dutasteride is contraindicated in women (teratogenic)" },
  { drug: "estradiol", contraindicatedGender: "male", severity: "moderate", reason: "Verify intended use of estrogen therapy in male patients" },
  { drug: "testosterone", contraindicatedGender: "female", severity: "moderate", reason: "Verify intended use of testosterone in female patients" },
  { drug: "metformin", maxAge: 100, minAge: 10, severity: "moderate", reason: "Metformin not typically used in patients under 10" },
];

// ═══════════════════════════════════════════════
// UTILITY: GENERATE ID
// ═══════════════════════════════════════════════

function generateAlertId(): string {
  return `dur-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalize a drug name for matching: lowercase, strip strength/form info
 */
function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+\s*(mg|mcg|ml|g|%|units?|tablets?|capsules?|caps?)\b/gi, "")
    .replace(/\s*(tablet|capsule|solution|suspension|cream|ointment|patch|injection)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a drug name matches a reference name (fuzzy contains match)
 */
function drugMatches(drugName: string, referenceName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return normalized.includes(referenceName) || referenceName.includes(normalized);
}

/**
 * Determine what therapeutic class a drug belongs to
 */
function getTherapeuticClass(drugName: string): string | null {
  const normalized = normalizeDrugName(drugName);
  for (const [className, drugs] of Object.entries(THERAPEUTIC_CLASSES)) {
    for (const drug of drugs) {
      if (drugMatches(normalized, drug)) return className;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════
// DUR CHECK: DRUG-DRUG INTERACTIONS
// ═══════════════════════════════════════════════

export function checkInteractions(
  currentDrug: string,
  otherDrugs: string[]
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedCurrent = normalizeDrugName(currentDrug);

  // Expand class-level names
  const isCurrentSSRI = SSRI_DRUGS.some((s) => drugMatches(normalizedCurrent, s));
  const isCurrentMAOI = MAOI_DRUGS.some((m) => drugMatches(normalizedCurrent, m));
  const isCurrentACEI = ACE_INHIBITOR_DRUGS.some((a) => drugMatches(normalizedCurrent, a));

  for (const otherDrug of otherDrugs) {
    const normalizedOther = normalizeDrugName(otherDrug);

    for (const entry of INTERACTION_DB) {
      const matchAB =
        (drugMatches(normalizedCurrent, entry.drugA) && drugMatches(normalizedOther, entry.drugB)) ||
        (drugMatches(normalizedCurrent, entry.drugB) && drugMatches(normalizedOther, entry.drugA));

      // Class-level matching for SSRIs
      const matchSSRI =
        entry.drugA === "ssri" &&
        isCurrentSSRI &&
        drugMatches(normalizedOther, entry.drugB);

      const matchSSRI2 =
        entry.drugB === "ssri" &&
        isCurrentSSRI &&
        drugMatches(normalizedOther, entry.drugA);

      const matchMAOI =
        entry.drugA === "maoi" &&
        isCurrentMAOI &&
        SSRI_DRUGS.some((s) => drugMatches(normalizedOther, s));

      // Class-level matching for ACE inhibitors
      const matchACEI =
        entry.drugA === "lisinopril" &&
        isCurrentACEI &&
        drugMatches(normalizedOther, entry.drugB);

      if (matchAB || matchSSRI || matchSSRI2 || matchMAOI || matchACEI) {
        alerts.push({
          id: generateAlertId(),
          fillId: "",
          patientId: "",
          alertType: "drug_interaction",
          severity: entry.severity,
          drugA: currentDrug,
          drugB: otherDrug,
          description: entry.description,
          clinicalEffect: entry.clinicalEffect,
          recommendation: entry.management,
          overridden: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// DUR CHECK: DRUG-ALLERGY
// ═══════════════════════════════════════════════

export function checkAllergies(
  drugName: string,
  allergies: { allergen: string; severity: string }[]
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = normalizeDrugName(drugName);

  // Cross-reactivity classes
  const CROSS_REACTIVITY: Record<string, string[]> = {
    penicillin: ["amoxicillin", "ampicillin", "piperacillin", "nafcillin", "dicloxacillin", "penicillin"],
    cephalosporin: ["cephalexin", "cefazolin", "ceftriaxone", "cefdinir", "cefepime", "cefuroxime"],
    sulfa: ["sulfamethoxazole", "sulfasalazine", "trimethoprim-sulfamethoxazole", "bactrim"],
    nsaid: ["ibuprofen", "naproxen", "diclofenac", "meloxicam", "celecoxib", "ketorolac", "indomethacin", "aspirin"],
    aspirin: ["aspirin", "ibuprofen", "naproxen"],
  };

  for (const allergy of allergies) {
    const normalizedAllergen = allergy.allergen.toLowerCase().trim();

    // Direct match
    if (drugMatches(normalizedDrug, normalizedAllergen)) {
      alerts.push({
        id: generateAlertId(),
        fillId: "",
        patientId: "",
        alertType: "drug_allergy",
        severity: "critical",
        drugA: drugName,
        description: `Patient has documented allergy to ${allergy.allergen}`,
        clinicalEffect: `Previous reaction: ${allergy.severity}. Direct allergen match.`,
        recommendation: "Do NOT dispense without prescriber approval and documented override.",
        overridden: false,
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    // Cross-reactivity check
    for (const [allergyClass, members] of Object.entries(CROSS_REACTIVITY)) {
      const allergenInClass =
        normalizedAllergen.includes(allergyClass) ||
        members.some((m) => normalizedAllergen.includes(m));

      if (allergenInClass) {
        const drugInClass = members.some((m) => drugMatches(normalizedDrug, m));
        if (drugInClass) {
          alerts.push({
            id: generateAlertId(),
            fillId: "",
            patientId: "",
            alertType: "drug_allergy",
            severity: "major",
            drugA: drugName,
            description: `Potential cross-reactivity: patient allergic to ${allergy.allergen} (${allergyClass} class)`,
            clinicalEffect: `Cross-sensitivity within ${allergyClass} class. Previous reaction severity: ${allergy.severity}.`,
            recommendation: `Verify with prescriber. Consider alternative outside the ${allergyClass} class.`,
            overridden: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// DUR CHECK: THERAPEUTIC DUPLICATION
// ═══════════════════════════════════════════════

export function checkDuplication(
  drugName: string,
  activeMeds: string[]
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const currentClass = getTherapeuticClass(drugName);

  if (!currentClass) return alerts;

  for (const med of activeMeds) {
    const medClass = getTherapeuticClass(med);
    if (medClass === currentClass && normalizeDrugName(med) !== normalizeDrugName(drugName)) {
      alerts.push({
        id: generateAlertId(),
        fillId: "",
        patientId: "",
        alertType: "therapeutic_duplication",
        severity: "moderate",
        drugA: drugName,
        drugB: med,
        description: `Therapeutic duplication: both are ${currentClass}`,
        clinicalEffect: `Patient already receiving ${med} in the same therapeutic class (${currentClass}). Duplicate therapy may increase adverse effects.`,
        recommendation: `Verify with prescriber that duplicate ${currentClass} therapy is intended.`,
        overridden: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// DUR CHECK: DOSE RANGE
// ═══════════════════════════════════════════════

/**
 * Parse strength string (e.g. "10 mg", "500MG", "2.5 mg") into a number of mg.
 * Returns null if the string is missing or not in mg.
 */
export function parseStrengthMg(strength: string | null | undefined): number | null {
  if (!strength) return null;
  const s = strength.trim().toLowerCase();
  // Match "<number> mg" — accept decimals, optional whitespace
  const mgMatch = s.match(/(\d+(?:\.\d+)?)\s*mg\b/);
  if (mgMatch) {
    const n = parseFloat(mgMatch[1]);
    return isFinite(n) && n > 0 ? n : null;
  }
  // Convert micrograms → mg
  const mcgMatch = s.match(/(\d+(?:\.\d+)?)\s*(mcg|µg|ug)\b/);
  if (mcgMatch) {
    const n = parseFloat(mcgMatch[1]);
    return isFinite(n) && n > 0 ? n / 1000 : null;
  }
  // Convert grams → mg
  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (gMatch) {
    const n = parseFloat(gMatch[1]);
    return isFinite(n) && n > 0 ? n * 1000 : null;
  }
  return null;
}

/**
 * Parse a sig/directions string for tablets-or-capsules per day.
 * Recognizes "1 tablet daily", "2 caps bid", "1 tab twice daily", "1 tablet q12h", etc.
 * Returns null if it cannot determine a quantity-per-dose AND a frequency.
 */
export function parseTabletsPerDayFromSig(
  directions: string | null | undefined
): number | null {
  if (!directions) return null;
  const sig = directions.toLowerCase();

  // Quantity per dose: "take N", "N tab", "N tablet", "N cap", or leading "N "
  let perDose: number | null = null;
  const qtyMatch =
    sig.match(/take\s+(\d+(?:\.\d+)?)\b/) ||
    sig.match(/(\d+(?:\.\d+)?)\s*(?:tab|tablet|cap|capsule)/) ||
    sig.match(/^\s*(\d+(?:\.\d+)?)\b/);
  if (qtyMatch) {
    const n = parseFloat(qtyMatch[1]);
    if (isFinite(n) && n > 0) perDose = n;
  }

  // Frequency per day
  let perDay: number | null = null;
  if (/\b(qid|four times (?:a |per )?day|4 times (?:a |per )?day)\b/.test(sig)) perDay = 4;
  else if (/\b(tid|three times (?:a |per )?day|3 times (?:a |per )?day|q8h)\b/.test(sig)) perDay = 3;
  else if (/\b(bid|twice (?:a |per )?day|two times (?:a |per )?day|2 times (?:a |per )?day|q12h)\b/.test(sig)) perDay = 2;
  else if (/\b(qd|once (?:a |per )?day|daily|every day|q24h|qhs|qam|qpm|at bedtime|in the morning|nightly)\b/.test(sig)) perDay = 1;
  else if (/\bq6h\b/.test(sig)) perDay = 4;
  else if (/\bq4h\b/.test(sig)) perDay = 6;

  if (perDose !== null && perDay !== null) return perDose * perDay;
  return null;
}

/**
 * Compute daily dose in mg for solid oral forms.
 * Returns null when we can't reliably compute (non-tablet form, missing/unparseable strength,
 * etc.) so dose alerts are skipped rather than producing wrong numbers.
 */
export function computeDailyDoseMg(args: {
  strength: string | null | undefined;
  dosageForm: string | null | undefined;
  directions: string | null | undefined;
  quantity: number;
  daysSupply: number;
}): { dailyDoseMg: number; tabletsPerDay: number } | null {
  const { strength, dosageForm, directions, quantity, daysSupply } = args;

  // Only handle solid oral forms reliably. For liquids/creams/patches, strength
  // units differ (mg/mL, mcg/hr, %) and we'd need volume-per-dose to compute mg/day.
  const form = (dosageForm || "").toLowerCase();
  const isSolidOral =
    !form ||
    form.includes("tab") ||
    form.includes("cap") ||
    form.includes("caplet") ||
    form.includes("pill");
  if (!isSolidOral) return null;

  const strengthMg = parseStrengthMg(strength);
  if (strengthMg === null) return null;

  // Prefer sig-derived tablets/day; fall back to quantity ÷ daysSupply (which
  // is tablets/day, NOT mg/day — that confusion was the bug).
  let tabletsPerDay = parseTabletsPerDayFromSig(directions);
  if (tabletsPerDay === null) {
    if (daysSupply > 0 && quantity > 0) tabletsPerDay = quantity / daysSupply;
    else return null;
  }

  if (!isFinite(tabletsPerDay) || tabletsPerDay <= 0) return null;

  return { dailyDoseMg: strengthMg * tabletsPerDay, tabletsPerDay };
}

export function checkDoseRange(
  drugName: string,
  quantity: number,
  daysSupply: number,
  context?: {
    strength?: string | null;
    dosageForm?: string | null;
    directions?: string | null;
  }
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalized = normalizeDrugName(drugName);

  // Find matching dose range entry
  let matchedDrug: string | null = null;
  let range: DoseRange | null = null;

  for (const [refDrug, refRange] of Object.entries(DOSE_RANGES)) {
    if (drugMatches(normalized, refDrug)) {
      matchedDrug = refDrug;
      range = refRange;
      break;
    }
  }

  if (!matchedDrug || !range || daysSupply <= 0) return alerts;

  // Compute true daily dose in mg using strength × tablets/day.
  // If we can't compute it (non-tablet form, missing strength, etc.), skip
  // the dose-too-high/low check rather than emitting bogus mg values.
  const computed = computeDailyDoseMg({
    strength: context?.strength,
    dosageForm: context?.dosageForm,
    directions: context?.directions,
    quantity,
    daysSupply,
  });

  if (computed !== null && range.unit === "mg") {
    const dailyDose = computed.dailyDoseMg;

    if (dailyDose > range.maxDaily) {
      alerts.push({
        id: generateAlertId(),
        fillId: "",
        patientId: "",
        alertType: "dose_range",
        severity: "major",
        drugA: drugName,
        description: `Daily dose exceeds maximum: ${dailyDose.toFixed(1)} ${range.unit}/day (max: ${range.maxDaily} ${range.unit}/day)`,
        clinicalEffect: `Calculated daily dose of ${dailyDose.toFixed(1)} ${range.unit} exceeds the recommended maximum of ${range.maxDaily} ${range.unit}/day for ${matchedDrug}.`,
        recommendation: `Verify dose with prescriber. Confirm quantity (${quantity}) and days supply (${daysSupply}) are correct.`,
        overridden: false,
        createdAt: new Date().toISOString(),
      });
    } else if (dailyDose < range.minDaily) {
      alerts.push({
        id: generateAlertId(),
        fillId: "",
        patientId: "",
        alertType: "dose_range",
        severity: "minor",
        drugA: drugName,
        description: `Daily dose below minimum: ${dailyDose.toFixed(1)} ${range.unit}/day (min: ${range.minDaily} ${range.unit}/day)`,
        clinicalEffect: `Calculated daily dose of ${dailyDose.toFixed(1)} ${range.unit} is below the typical minimum of ${range.minDaily} ${range.unit}/day for ${matchedDrug}. May be subtherapeutic.`,
        recommendation: `Verify dose with prescriber. May be an initial titration dose.`,
        overridden: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Days supply check
  if (daysSupply > range.typicalDaysSupply.max) {
    alerts.push({
      id: generateAlertId(),
      fillId: "",
      patientId: "",
      alertType: "dose_range",
      severity: "minor",
      drugA: drugName,
      description: `Days supply (${daysSupply}) exceeds typical range (${range.typicalDaysSupply.min}-${range.typicalDaysSupply.max} days)`,
      clinicalEffect: `Extended days supply may indicate a data entry error.`,
      recommendation: `Verify days supply is correct.`,
      overridden: false,
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// DUR CHECK: AGE/GENDER
// ═══════════════════════════════════════════════

function checkAgeGender(
  drugName: string,
  patientAge: number,
  patientGender: string | null
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalized = normalizeDrugName(drugName);

  for (const rule of AGE_GENDER_RULES) {
    if (!drugMatches(normalized, rule.drug)) continue;

    // Age check
    if (rule.minAge !== undefined && patientAge < rule.minAge) {
      alerts.push({
        id: generateAlertId(),
        fillId: "",
        patientId: "",
        alertType: "age_gender",
        severity: rule.severity,
        drugA: drugName,
        description: `Age concern: patient is ${patientAge} years old (minimum: ${rule.minAge})`,
        clinicalEffect: rule.reason,
        recommendation: `Verify with prescriber that use in a ${patientAge}-year-old patient is appropriate.`,
        overridden: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Gender check
    if (rule.contraindicatedGender && patientGender) {
      const normalizedGender = patientGender.toLowerCase();
      if (normalizedGender === rule.contraindicatedGender || normalizedGender.startsWith(rule.contraindicatedGender.charAt(0))) {
        alerts.push({
          id: generateAlertId(),
          fillId: "",
          patientId: "",
          alertType: "age_gender",
          severity: rule.severity,
          drugA: drugName,
          description: `Gender concern: ${rule.drug} contraindicated in ${rule.contraindicatedGender} patients`,
          clinicalEffect: rule.reason,
          recommendation: `Verify with prescriber. This medication is typically contraindicated for ${rule.contraindicatedGender} patients.`,
          overridden: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// FULL DUR CHECK
// ═══════════════════════════════════════════════

/**
 * Run a complete Drug Utilization Review for a fill.
 * Checks: interactions, allergies, duplication, dose range, age/gender.
 * Stores results in StoreSetting JSON under "dur_alerts".
 */
export async function runFullDUR(fillId: string): Promise<DURResult> {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: {
            include: {
              allergies: { where: { status: "active" } },
              prescriptions: {
                where: { isActive: true },
                include: {
                  item: { select: { name: true, genericName: true } },
                  formula: { select: { name: true } },
                  fills: {
                    where: { status: { notIn: ["cancelled"] } },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
          item: { select: { name: true, genericName: true, strength: true, dosageForm: true } },
          formula: { select: { name: true } },
        },
      },
    },
  });

  if (!fill) throw new Error("Fill not found");

  const rx = fill.prescription;
  const patient = rx.patient;
  const drugName = rx.item?.genericName || rx.item?.name || rx.formula?.name || "Unknown";

  // Build list of other active medications for the patient (excluding current)
  const activeMeds: string[] = [];
  for (const otherRx of patient.prescriptions) {
    if (otherRx.id === rx.id) continue;
    // Only include if there is a non-cancelled fill
    if (otherRx.fills.length === 0) continue;
    const medName = otherRx.item?.genericName || otherRx.item?.name || otherRx.formula?.name;
    if (medName) activeMeds.push(medName);
  }

  // Calculate patient age
  const dob = new Date(patient.dateOfBirth);
  const now = new Date();
  let patientAge = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    patientAge--;
  }

  const quantity = fill.quantity.toNumber();
  const daysSupply = fill.daysSupply || rx.daysSupply || 30;

  // ── Run all checks ──
  const allAlerts: DURAlert[] = [];

  // 1. Drug-drug interactions
  const interactionAlerts = checkInteractions(drugName, activeMeds);
  allAlerts.push(...interactionAlerts);

  // 2. Drug-allergy cross-reference
  const allergyAlerts = checkAllergies(
    drugName,
    patient.allergies.map((a) => ({ allergen: a.allergen, severity: a.severity }))
  );
  allAlerts.push(...allergyAlerts);

  // 3. Therapeutic duplication
  const dupAlerts = checkDuplication(drugName, activeMeds);
  allAlerts.push(...dupAlerts);

  // 4. Dose range — pass strength + form + sig so we can compute mg/day correctly.
  const doseAlerts = checkDoseRange(drugName, quantity, daysSupply, {
    strength: rx.item?.strength ?? null,
    dosageForm: rx.item?.dosageForm ?? null,
    directions: rx.directions ?? null,
  });
  allAlerts.push(...doseAlerts);

  // 5. Age/gender
  const ageGenderAlerts = checkAgeGender(drugName, patientAge, patient.gender);
  allAlerts.push(...ageGenderAlerts);

  // Stamp fillId and patientId on all alerts
  for (const alert of allAlerts) {
    alert.fillId = fillId;
    alert.patientId = patient.id;
  }

  const result: DURResult = {
    fillId,
    patientId: patient.id,
    drug: drugName,
    alerts: allAlerts,
    hasCritical: allAlerts.some((a) => a.severity === "critical"),
    hasMajor: allAlerts.some((a) => a.severity === "major"),
    totalAlerts: allAlerts.length,
    checkedAt: new Date().toISOString(),
  };

  // ── Store alerts in StoreSetting ──
  await storeDurAlerts(fillId, allAlerts);

  logger.info(
    `[DUR] Completed review for fill ${fillId}: ${allAlerts.length} alerts (${interactionAlerts.length} interactions, ${allergyAlerts.length} allergies, ${dupAlerts.length} duplications, ${doseAlerts.length} dose, ${ageGenderAlerts.length} age/gender)`
  );

  return result;
}

// ═══════════════════════════════════════════════
// ALERT STORAGE (StoreSetting JSON)
// ═══════════════════════════════════════════════

const DUR_ALERTS_KEY = "dur_alerts";
const DUR_OVERRIDES_KEY = "dur_overrides";

async function getStoreId(): Promise<string> {
  const store = await prisma.store.findFirst({ select: { id: true } });
  if (!store) throw new Error("No store found");
  return store.id;
}

async function getSettingValue(key: string): Promise<any[]> {
  const storeId = await getStoreId();
  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId, settingKey: key } },
  });
  if (!setting) return [];
  try {
    return JSON.parse(setting.settingValue);
  } catch {
    return [];
  }
}

async function setSettingValue(key: string, value: any[], userId?: string): Promise<void> {
  const storeId = await getStoreId();
  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId, settingKey: key } },
    update: {
      settingValue: JSON.stringify(value),
      settingType: "json",
      updatedBy: userId || null,
      updatedAt: new Date(),
    },
    create: {
      storeId,
      settingKey: key,
      settingValue: JSON.stringify(value),
      settingType: "json",
      updatedBy: userId || null,
    },
  });
}

async function storeDurAlerts(fillId: string, alerts: DURAlert[]): Promise<void> {
  const existing = await getSettingValue(DUR_ALERTS_KEY);

  // Remove any previous alerts for this fill, then add new ones
  const filtered = existing.filter((a: DURAlert) => a.fillId !== fillId);
  const updated = [...filtered, ...alerts];

  // Keep only the last 2000 alerts to avoid unbounded growth
  const trimmed = updated.slice(-2000);
  await setSettingValue(DUR_ALERTS_KEY, trimmed);
}

/**
 * Get all active (non-overridden) DUR alerts
 */
export async function getActiveDurAlerts(): Promise<DURAlert[]> {
  const alerts = await getSettingValue(DUR_ALERTS_KEY);
  return alerts.filter((a: DURAlert) => !a.overridden);
}

/**
 * Get all DUR alerts for a specific patient
 */
export async function getDurAlertsForPatient(patientId: string): Promise<DURAlert[]> {
  const alerts = await getSettingValue(DUR_ALERTS_KEY);
  return alerts.filter((a: DURAlert) => a.patientId === patientId);
}

/**
 * Get DUR alerts for a specific fill
 */
export async function getDurAlertsForFill(fillId: string): Promise<DURAlert[]> {
  const alerts = await getSettingValue(DUR_ALERTS_KEY);
  return alerts.filter((a: DURAlert) => a.fillId === fillId);
}

// ═══════════════════════════════════════════════
// OVERRIDE RECORDING
// ═══════════════════════════════════════════════

export interface DUROverrideRecord {
  alertId: string;
  fillId: string;
  patientId: string;
  alertType: DURAlertType;
  severity: DURSeverity;
  drug: string;
  reasonCode: string;
  reasonLabel: string;
  notes: string;
  overriddenBy: string;
  pharmacistName: string;
  overriddenAt: string;
}

/**
 * Override a DUR alert. Pharmacist provides a reason code and optional notes.
 * Updates the alert in StoreSetting and records the override separately.
 */
export async function overrideDurAlert(
  alertId: string,
  userId: string,
  reasonCode: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, isPharmacist: true },
    });

    if (!user) return { success: false, error: "User not found" };
    if (!user.isPharmacist) return { success: false, error: "Only pharmacists can override DUR alerts" };

    const reasonLabel =
      DUR_OVERRIDE_REASON_CODES.find((r) => r.code === reasonCode)?.label || "Unknown";

    // Update the alert in storage
    const alerts = await getSettingValue(DUR_ALERTS_KEY);
    const alertIndex = alerts.findIndex((a: DURAlert) => a.id === alertId);

    if (alertIndex === -1) return { success: false, error: "Alert not found" };

    const alert = alerts[alertIndex] as DURAlert;
    alert.overridden = true;
    alert.overriddenBy = userId;
    // Stamp the pharmacist's display name so the audit panel renders
    // "Overridden by Caleb Dowling" instead of a raw UUID.
    alert.overriddenByName = `${user.firstName} ${user.lastName}`.trim();
    alert.overriddenAt = new Date().toISOString();
    alert.overrideReasonCode = reasonCode;
    // Stamp the full NCPDP Result-of-Service label alongside the code so
    // the audit string can render "Reason: 05 — Dose Verified with Prescriber".
    alert.overrideReasonLabel = reasonLabel;
    alert.overrideNotes = notes || undefined;

    await setSettingValue(DUR_ALERTS_KEY, alerts, userId);

    // Record the override separately for history
    const overrides = await getSettingValue(DUR_OVERRIDES_KEY);
    const overrideRecord: DUROverrideRecord = {
      alertId,
      fillId: alert.fillId,
      patientId: alert.patientId,
      alertType: alert.alertType,
      severity: alert.severity,
      drug: alert.drugA,
      reasonCode,
      reasonLabel,
      notes: notes || "",
      overriddenBy: userId,
      pharmacistName: `${user.firstName} ${user.lastName}`,
      overriddenAt: new Date().toISOString(),
    };

    overrides.push(overrideRecord);
    // Keep last 2000 overrides
    const trimmedOverrides = overrides.slice(-2000);
    await setSettingValue(DUR_OVERRIDES_KEY, trimmedOverrides, userId);

    // Audit trail
    await logAudit({
      userId,
      action: "UPDATE",
      resource: "dur_alerts",
      resourceId: alertId,
      details: {
        action: "override",
        alertType: alert.alertType,
        severity: alert.severity,
        drug: alert.drugA,
        reasonCode,
        reasonLabel,
        notes: notes || "",
      },
    });

    logger.info(
      `[DUR] Alert ${alertId} overridden by ${user.firstName} ${user.lastName} — reason: ${reasonCode} (${reasonLabel})`
    );

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`[DUR] Override failed for alert ${alertId}:`, error);
    return { success: false, error: msg };
  }
}

/**
 * Get override history
 */
export async function getDurOverrideHistory(): Promise<DUROverrideRecord[]> {
  const overrides = await getSettingValue(DUR_OVERRIDES_KEY);
  return (overrides as DUROverrideRecord[]).sort(
    (a, b) => new Date(b.overriddenAt).getTime() - new Date(a.overriddenAt).getTime()
  );
}
