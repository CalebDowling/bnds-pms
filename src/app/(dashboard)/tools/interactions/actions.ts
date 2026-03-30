"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type DrugOption = {
  id: string;
  name: string;
  genericName: string | null;
  ndc: string | null;
  strength: string | null;
  dosageForm: string | null;
};

export type PatientMedProfile = {
  patientId: string;
  patientName: string;
  medications: {
    rxNumber: string;
    drugName: string;
    genericName: string | null;
    strength: string | null;
    directions: string | null;
    status: string;
  }[];
};

// Known drug interaction database (built-in common interactions)
// In production, this would call an external API like OpenFDA, DrugBank, or First DataBank
const INTERACTION_DB: {
  drugA: string;
  drugB: string;
  severity: "major" | "moderate" | "minor";
  description: string;
  clinicalEffect: string;
  management: string;
}[] = [
  // Anticoagulants
  { drugA: "warfarin", drugB: "aspirin", severity: "major", description: "Increased risk of bleeding", clinicalEffect: "Concurrent use significantly increases bleeding risk, including GI and intracranial hemorrhage.", management: "Avoid combination unless specifically indicated. Monitor INR closely if used together." },
  { drugA: "warfarin", drugB: "ibuprofen", severity: "major", description: "Increased risk of bleeding", clinicalEffect: "NSAIDs increase anticoagulant effect and GI bleeding risk.", management: "Avoid NSAIDs with warfarin. Use acetaminophen for pain if possible." },
  { drugA: "warfarin", drugB: "naproxen", severity: "major", description: "Increased risk of bleeding", clinicalEffect: "NSAIDs inhibit platelet function and may increase anticoagulant effect.", management: "Avoid combination. Consider acetaminophen as alternative analgesic." },
  { drugA: "warfarin", drugB: "fluconazole", severity: "major", description: "Increased warfarin effect", clinicalEffect: "Fluconazole inhibits CYP2C9, significantly increasing warfarin levels and INR.", management: "Reduce warfarin dose by 25-50%. Monitor INR within 3-5 days of starting fluconazole." },
  { drugA: "warfarin", drugB: "amiodarone", severity: "major", description: "Increased warfarin effect", clinicalEffect: "Amiodarone inhibits CYP2C9 and CYP3A4, increasing warfarin levels.", management: "Reduce warfarin dose by 30-50% when starting amiodarone. Monitor INR weekly." },
  { drugA: "warfarin", drugB: "metronidazole", severity: "major", description: "Increased anticoagulant effect", clinicalEffect: "Metronidazole inhibits warfarin metabolism via CYP2C9.", management: "Monitor INR closely. May need to reduce warfarin dose." },

  // Serotonin syndrome risks
  { drugA: "fluoxetine", drugB: "tramadol", severity: "major", description: "Risk of serotonin syndrome", clinicalEffect: "Both drugs increase serotonin levels, risking serotonin syndrome (agitation, tremor, hyperthermia).", management: "Avoid combination if possible. Use alternative analgesic. Monitor for serotonin syndrome symptoms." },
  { drugA: "sertraline", drugB: "tramadol", severity: "major", description: "Risk of serotonin syndrome", clinicalEffect: "Combined serotonergic activity may cause serotonin syndrome.", management: "Avoid combination if possible. Use alternative analgesic." },
  { drugA: "fluoxetine", drugB: "trazodone", severity: "moderate", description: "Increased serotonergic effects", clinicalEffect: "Additive serotonergic effects. Fluoxetine also inhibits CYP2D6, increasing trazodone levels.", management: "Use lower trazodone doses. Monitor for excess sedation and serotonin symptoms." },

  // Statin interactions
  { drugA: "simvastatin", drugB: "amiodarone", severity: "major", description: "Increased risk of rhabdomyolysis", clinicalEffect: "Amiodarone inhibits CYP3A4, increasing simvastatin levels significantly.", management: "Do not exceed simvastatin 20mg/day with amiodarone. Consider pravastatin or rosuvastatin." },
  { drugA: "simvastatin", drugB: "amlodipine", severity: "moderate", description: "Increased simvastatin levels", clinicalEffect: "Amlodipine inhibits CYP3A4, moderately increasing simvastatin exposure.", management: "Do not exceed simvastatin 20mg/day with amlodipine." },
  { drugA: "atorvastatin", drugB: "clarithromycin", severity: "major", description: "Increased statin levels", clinicalEffect: "Clarithromycin strongly inhibits CYP3A4, significantly increasing atorvastatin exposure.", management: "Use azithromycin instead, or temporarily hold statin during clarithromycin course." },

  // Potassium/renal
  { drugA: "lisinopril", drugB: "spironolactone", severity: "major", description: "Risk of hyperkalemia", clinicalEffect: "Both drugs increase potassium levels. Combined use significantly raises hyperkalemia risk.", management: "Monitor potassium levels closely. Avoid in patients with renal impairment." },
  { drugA: "lisinopril", drugB: "potassium chloride", severity: "major", description: "Risk of hyperkalemia", clinicalEffect: "ACE inhibitors reduce potassium excretion. Supplementation adds to risk.", management: "Monitor serum potassium regularly. Adjust supplementation as needed." },
  { drugA: "metformin", drugB: "contrast dye", severity: "major", description: "Risk of lactic acidosis", clinicalEffect: "Iodinated contrast can cause acute kidney injury, impairing metformin clearance.", management: "Hold metformin 48 hours before and after contrast. Check renal function before resuming." },

  // QT prolongation
  { drugA: "azithromycin", drugB: "amiodarone", severity: "major", description: "QT prolongation risk", clinicalEffect: "Both drugs can prolong QT interval. Combined use increases risk of torsades de pointes.", management: "Avoid combination. Use alternative antibiotic if possible." },
  { drugA: "methadone", drugB: "ondansetron", severity: "moderate", description: "QT prolongation risk", clinicalEffect: "Both agents prolong QT interval.", management: "Monitor ECG. Use lowest effective ondansetron dose." },

  // Common pharmacy interactions
  { drugA: "ciprofloxacin", drugB: "tizanidine", severity: "major", description: "Excessive sedation and hypotension", clinicalEffect: "Ciprofloxacin inhibits CYP1A2, dramatically increasing tizanidine levels (10-fold).", management: "Combination is CONTRAINDICATED. Use alternative antibiotic or muscle relaxant." },
  { drugA: "methotrexate", drugB: "trimethoprim", severity: "major", description: "Increased methotrexate toxicity", clinicalEffect: "Trimethoprim reduces renal clearance of methotrexate and both are antifolates.", management: "Avoid combination. If necessary, monitor CBC and methotrexate levels closely." },
  { drugA: "lithium", drugB: "ibuprofen", severity: "major", description: "Increased lithium levels", clinicalEffect: "NSAIDs reduce renal lithium clearance, potentially causing toxicity.", management: "Avoid NSAIDs. Use acetaminophen. If NSAID needed, monitor lithium levels closely." },
  { drugA: "digoxin", drugB: "amiodarone", severity: "major", description: "Increased digoxin levels", clinicalEffect: "Amiodarone inhibits P-glycoprotein, increasing digoxin levels 70-100%.", management: "Reduce digoxin dose by 50% when starting amiodarone. Monitor levels." },

  // Blood pressure
  { drugA: "sildenafil", drugB: "nitroglycerin", severity: "major", description: "Severe hypotension", clinicalEffect: "PDE5 inhibitors potentiate nitrate-induced hypotension. Can be life-threatening.", management: "Combination is CONTRAINDICATED. Wait 24-48 hours between doses." },
  { drugA: "amlodipine", drugB: "diltiazem", severity: "moderate", description: "Excessive blood pressure lowering", clinicalEffect: "Both are calcium channel blockers. Additive hypotensive and bradycardic effects.", management: "Monitor blood pressure and heart rate closely." },

  // Thyroid
  { drugA: "levothyroxine", drugB: "calcium carbonate", severity: "moderate", description: "Reduced thyroid absorption", clinicalEffect: "Calcium binds levothyroxine in the GI tract, reducing absorption by 20-25%.", management: "Separate administration by at least 4 hours." },
  { drugA: "levothyroxine", drugB: "omeprazole", severity: "moderate", description: "Reduced thyroid absorption", clinicalEffect: "PPIs increase gastric pH, reducing levothyroxine dissolution and absorption.", management: "Monitor TSH. May need increased levothyroxine dose." },

  // Diabetes
  { drugA: "glipizide", drugB: "fluconazole", severity: "moderate", description: "Increased hypoglycemia risk", clinicalEffect: "Fluconazole inhibits CYP2C9, increasing sulfonylurea levels.", management: "Monitor blood glucose closely. May need to reduce glipizide dose." },
  { drugA: "metformin", drugB: "alcohol", severity: "moderate", description: "Increased lactic acidosis risk", clinicalEffect: "Alcohol increases lactate production and impairs gluconeogenesis.", management: "Advise patients to limit alcohol consumption." },
];

/**
 * Search drugs from inventory
 */
export async function searchDrugs(query: string, limit = 20): Promise<DrugOption[]> {
  await requireUser();

  if (!query || query.length < 2) return [];

  const items = await prisma.item.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { genericName: { contains: query, mode: "insensitive" } },
        { brandName: { contains: query, mode: "insensitive" } },
        { ndc: { contains: query } },
      ],
      isCompoundIngredient: false,
    },
    select: {
      id: true,
      name: true,
      genericName: true,
      ndc: true,
      strength: true,
      dosageForm: true,
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  return items;
}

/**
 * Get a patient's active medication profile
 */
export async function getPatientMedProfile(patientId: string): Promise<PatientMedProfile | null> {
  await requireUser();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      prescriptions: {
        where: {
          status: { in: ["active", "ready", "verified", "dispensed"] },
        },
        select: {
          rxNumber: true,
          directions: true,
          status: true,
          item: {
            select: { name: true, genericName: true, strength: true },
          },
          formula: {
            select: { name: true },
          },
        },
        orderBy: { dateFilled: "desc" },
      },
    },
  });

  if (!patient) return null;

  return {
    patientId: patient.id,
    patientName: `${patient.lastName}, ${patient.firstName}`,
    medications: patient.prescriptions.map((rx) => ({
      rxNumber: rx.rxNumber,
      drugName: rx.item?.name || rx.formula?.name || "Compound",
      genericName: rx.item?.genericName || null,
      strength: rx.item?.strength || null,
      directions: rx.directions || null,
      status: rx.status,
    })),
  };
}

/**
 * Check interactions between a list of drug names
 */
export async function checkInteractions(drugNames: string[]): Promise<{
  interactions: {
    drugA: string;
    drugB: string;
    severity: "major" | "moderate" | "minor";
    description: string;
    clinicalEffect: string;
    management: string;
  }[];
  checkedDrugs: string[];
}> {
  await requireUser();

  if (drugNames.length < 2) {
    return { interactions: [], checkedDrugs: drugNames };
  }

  // Normalize drug names for matching
  const normalized = drugNames.map((d) => d.toLowerCase().trim());

  const found: typeof INTERACTION_DB = [];

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const nameA = normalized[i];
      const nameB = normalized[j];

      for (const interaction of INTERACTION_DB) {
        const dbA = interaction.drugA.toLowerCase();
        const dbB = interaction.drugB.toLowerCase();

        if (
          (nameA.includes(dbA) && nameB.includes(dbB)) ||
          (nameA.includes(dbB) && nameB.includes(dbA))
        ) {
          found.push({
            ...interaction,
            drugA: drugNames[i],
            drugB: drugNames[j],
          });
        }
      }
    }
  }

  // Sort by severity
  const severityOrder = { major: 0, moderate: 1, minor: 2 };
  found.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { interactions: found, checkedDrugs: drugNames };
}

/**
 * Search patients for the interaction checker
 */
export async function searchPatients(query: string) {
  await requireUser();

  if (!query || query.length < 2) return [];

  const patients = await prisma.patient.findMany({
    where: {
      status: "active",
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { mrn: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
    },
    take: 10,
    orderBy: { lastName: "asc" },
  });

  return patients.map((p) => ({
    id: p.id,
    name: `${p.lastName}, ${p.firstName}`,
    mrn: p.mrn,
  }));
}
