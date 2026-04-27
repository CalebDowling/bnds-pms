/**
 * scripts/seed-test-fixtures.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Idempotent test-fixture seed for BNDS PMS walkthrough testing.
 *
 * Creates a known, deterministic dataset we can re-run any time to populate
 * the queue/process workflow with realistic-but-synthetic data:
 *   - 5 prescribers (NPIs 1111111100..1111111104)
 *   - 20 patients   (MRNs TEST-9990001..TEST-9990020)
 *   - 6 fixture drug items (incl. CII / CIV controlled + a compound)
 *   - 40 prescriptions (rxNumbers 9990001..9990040 — well above the
 *     current rx_number_seq value so they'll never collide)
 *   - 40 fills distributed across every queue bucket the UI surfaces
 *
 * Idempotency strategy:
 *   - Patients/Prescribers/Prescriptions: upsert by their unique field
 *     (mrn, npi, rxNumber) so re-running never duplicates them.
 *   - Items: findFirst by `metadata.isFixture` + name, create if missing
 *     (Item has no unique business key so we tag with metadata).
 *   - Fills: upsert by the @@unique([prescriptionId, fillNumber]) compound.
 *
 * Cleanup query (if we ever need to wipe these):
 *   delete from prescription_fills using prescriptions
 *     where prescription_fills.prescription_id = prescriptions.id
 *       and prescriptions.metadata->>'isFixture' = 'true';
 *   delete from prescriptions where metadata->>'isFixture' = 'true';
 *   delete from patients where metadata->>'isFixture' = 'true';
 *   delete from prescribers where metadata->>'isFixture' = 'true';
 *
 * Usage:
 *   npx tsx scripts/seed-test-fixtures.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────

const FIXTURE_TAG = { isFixture: true } as const;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function dateDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function dateDaysAhead(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ─── ParsedNewRx-shaped eRx payload builder ──────────────────────────
//
// Mirrors src/lib/erx/parser.ts > ParsedNewRx. Stored at
// Prescription.metadata.erxSource so the doc viewer (Phase 1) can render
// it without joining intake_queue.

interface ErxPayloadInput {
  rxNumber: string;
  patient: { firstName: string; lastName: string; dob: string; gender: string;
    addressLine1: string; city: string; state: string; zip: string; phone: string };
  prescriber: { firstName: string; lastName: string; suffix: string; npi: string;
    deaNumber?: string; phone: string; addressLine1: string; city: string;
    state: string; zip: string; specialty: string };
  medication: { drugName: string; ndc?: string; strength?: string;
    dosageForm?: string; route?: string; quantity: number; daysSupply: number;
    directions: string; refillsAuthorized: number; dawCode?: string;
    deaSchedule?: string; isCompound?: boolean };
  dateWritten: string;
  prescriberNotes?: string;
}

function buildErxPayload(input: ErxPayloadInput) {
  return {
    messageId: `BNDS-FIXTURE-${input.rxNumber}`,
    messageType: "NEWRX" as const,
    sentAt: isoDaysAgo(2),
    patient: {
      firstName: input.patient.firstName,
      lastName: input.patient.lastName,
      dateOfBirth: input.patient.dob,
      gender: input.patient.gender,
      address: {
        line1: input.patient.addressLine1,
        city: input.patient.city,
        state: input.patient.state,
        zip: input.patient.zip,
      },
      phone: input.patient.phone,
    },
    prescriber: {
      firstName: input.prescriber.firstName,
      lastName: input.prescriber.lastName,
      suffix: input.prescriber.suffix,
      npi: input.prescriber.npi,
      deaNumber: input.prescriber.deaNumber,
      phone: input.prescriber.phone,
      address: {
        line1: input.prescriber.addressLine1,
        city: input.prescriber.city,
        state: input.prescriber.state,
        zip: input.prescriber.zip,
      },
      specialty: input.prescriber.specialty,
    },
    medication: {
      drugName: input.medication.drugName,
      ndc: input.medication.ndc,
      strength: input.medication.strength,
      dosageForm: input.medication.dosageForm,
      route: input.medication.route ?? "Oral",
      quantity: input.medication.quantity,
      daysSupply: input.medication.daysSupply,
      directions: input.medication.directions,
      refillsAuthorized: input.medication.refillsAuthorized,
      dawCode: input.medication.dawCode ?? "0",
      isCompound: input.medication.isCompound ?? false,
      deaSchedule: input.medication.deaSchedule,
    },
    dateWritten: input.dateWritten,
    prescriberNotes: input.prescriberNotes,
  };
}

// ─── Prescriber fixtures ──────────────────────────────────────────────

const PRESCRIBER_FIXTURES = [
  {
    npi: "1111111100",
    deaNumber: "AT1111110",
    firstName: "Sarah",
    lastName: "Trahan",
    suffix: "MD",
    specialty: "Internal Medicine",
    phone: "(337) 555-1100",
    fax: "(337) 555-1101",
    email: "strahan@swlafamily.test",
    addressLine1: "1100 Ryan St",
    city: "Lake Charles",
    state: "LA",
    zip: "70601",
    stateLicense: "MD-FIXTURE-001",
    licenseState: "LA",
    scheduleAuthority: ["II", "III", "IV", "V"],
  },
  {
    npi: "1111111101",
    deaNumber: "AC1111111",
    firstName: "Michael",
    lastName: "Champagne",
    suffix: "DO",
    specialty: "Family Medicine",
    phone: "(337) 555-1102",
    fax: "(337) 555-1103",
    email: "mchampagne@bayoufamily.test",
    addressLine1: "215 W Sale Rd",
    city: "Lake Charles",
    state: "LA",
    zip: "70605",
    stateLicense: "DO-FIXTURE-002",
    licenseState: "LA",
    scheduleAuthority: ["II", "III", "IV", "V"],
  },
  {
    npi: "1111111102",
    firstName: "Jennifer",
    lastName: "Doucet",
    suffix: "NP",
    specialty: "Nurse Practitioner — Endocrinology",
    phone: "(337) 555-1104",
    fax: "(337) 555-1105",
    email: "jdoucet@cypressendo.test",
    addressLine1: "750 Cypress St",
    city: "Sulphur",
    state: "LA",
    zip: "70663",
    stateLicense: "APRN-FIXTURE-003",
    licenseState: "LA",
    scheduleAuthority: ["III", "IV", "V"],
  },
  {
    npi: "1111111103",
    deaNumber: "AS1111113",
    firstName: "David",
    lastName: "Soileau",
    suffix: "MD",
    specialty: "Pediatrics",
    phone: "(337) 555-1106",
    fax: "(337) 555-1107",
    email: "dsoileau@kidcarela.test",
    addressLine1: "3320 Common St",
    city: "Lake Charles",
    state: "LA",
    zip: "70601",
    stateLicense: "MD-FIXTURE-004",
    licenseState: "LA",
    scheduleAuthority: ["III", "IV", "V"],
  },
  {
    npi: "1111111104",
    deaNumber: "AB1111114",
    firstName: "Rachel",
    lastName: "Bertrand",
    suffix: "MD",
    specialty: "Psychiatry",
    phone: "(337) 555-1108",
    fax: "(337) 555-1109",
    email: "rbertrand@cypressbehav.test",
    addressLine1: "1801 Oak Park Blvd",
    city: "Lake Charles",
    state: "LA",
    zip: "70601",
    stateLicense: "MD-FIXTURE-005",
    licenseState: "LA",
    scheduleAuthority: ["II", "III", "IV", "V"],
  },
];

// ─── Patient fixtures ─────────────────────────────────────────────────
// 20 patients with addresses, phones, and a mix of allergies / insurance.
// One severe allergy patient (Patient #10 — penicillin) for DUR testing.

interface PatientFixture {
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  email?: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  allergies?: Array<{ allergen: string; severity: string; reaction?: string }>;
  insurancePlanIndex?: number; // index into existing plans (0..6)
  insuranceMemberId?: string;
}

const PATIENT_FIXTURES: PatientFixture[] = [
  { mrn: "TEST-9990001", firstName: "Aaron",   lastName: "Adams",      dob: "1955-04-12", gender: "male",   email: "aaron.adams@test.com",   phone: "(337) 555-2001", addressLine1: "100 Pine St",         city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 0, insuranceMemberId: "BCB-FXT-001" },
  { mrn: "TEST-9990002", firstName: "Beatrice",lastName: "Boudreaux",  dob: "1962-08-23", gender: "female", email: "bea.boudreaux@test.com", phone: "(337) 555-2002", addressLine1: "204 Magnolia Ln",     city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 5, insuranceMemberId: "MED-FXT-002", allergies: [{ allergen: "Sulfa drugs",  severity: "moderate", reaction: "Rash" }] },
  { mrn: "TEST-9990003", firstName: "Charles", lastName: "Comeaux",    dob: "1978-12-03", gender: "male",   email: "ccomeaux@test.com",      phone: "(337) 555-2003", addressLine1: "318 Cypress Dr",      city: "Sulphur",      state: "LA", zip: "70663", insurancePlanIndex: 1, insuranceMemberId: "HUM-FXT-003" },
  { mrn: "TEST-9990004", firstName: "Diana",   lastName: "Dugas",      dob: "1985-02-19", gender: "female", email: "ddugas@test.com",        phone: "(337) 555-2004", addressLine1: "412 Oak St",          city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 4, insuranceMemberId: "AET-FXT-004" },
  { mrn: "TEST-9990005", firstName: "Edward",  lastName: "Edwards",    dob: "1949-11-08", gender: "male",                                    phone: "(337) 555-2005", addressLine1: "519 River Rd",        city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 5, insuranceMemberId: "MED-FXT-005", allergies: [{ allergen: "Aspirin", severity: "mild", reaction: "GI upset" }] },
  { mrn: "TEST-9990006", firstName: "Fiona",   lastName: "Fontenot",   dob: "1991-06-14", gender: "female", email: "ffontenot@test.com",     phone: "(337) 555-2006", addressLine1: "624 Lakeshore Dr",    city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 0, insuranceMemberId: "BCB-FXT-006" },
  { mrn: "TEST-9990007", firstName: "George",  lastName: "Guidry",     dob: "1972-03-27", gender: "male",   email: "gguidry@test.com",       phone: "(337) 555-2007", addressLine1: "731 Bayou Pines",     city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 3, insuranceMemberId: "ESI-FXT-007" },
  { mrn: "TEST-9990008", firstName: "Helen",   lastName: "Hebert",     dob: "1988-09-30", gender: "female", email: "hhebert@test.com",       phone: "(337) 555-2008", addressLine1: "836 Common St",       city: "Lake Charles", state: "LA", zip: "70601" /* uninsured / cash */ },
  { mrn: "TEST-9990009", firstName: "Isaac",   lastName: "Istre",      dob: "1965-07-11", gender: "male",   email: "iistre@test.com",        phone: "(337) 555-2009", addressLine1: "942 Country Club Rd", city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 6, insuranceMemberId: "UHC-FXT-009" },
  { mrn: "TEST-9990010", firstName: "Jasmine", lastName: "Jones",      dob: "1996-01-22", gender: "female", email: "jjones@test.com",        phone: "(337) 555-2010", addressLine1: "1048 Enterprise Blvd", city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 1, insuranceMemberId: "HUM-FXT-010", allergies: [{ allergen: "Penicillin", severity: "severe", reaction: "Anaphylaxis" }, { allergen: "Latex", severity: "moderate", reaction: "Hives" }] },
  { mrn: "TEST-9990011", firstName: "Kevin",   lastName: "Knight",     dob: "1953-05-04", gender: "male",   email: "kknight@test.com",       phone: "(337) 555-2011", addressLine1: "1156 Ryan St",        city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 5, insuranceMemberId: "MED-FXT-011" },
  { mrn: "TEST-9990012", firstName: "Linda",   lastName: "Landry",     dob: "1970-10-17", gender: "female", email: "llandry@test.com",       phone: "(337) 555-2012", addressLine1: "1265 Nelson Rd",      city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 4, insuranceMemberId: "AET-FXT-012" },
  { mrn: "TEST-9990013", firstName: "Marcus",  lastName: "Miller",     dob: "1982-12-25", gender: "male",   email: "mmiller@test.com",       phone: "(337) 555-2013", addressLine1: "1374 Hodges St",      city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 2, insuranceMemberId: "LAM-FXT-013" },
  { mrn: "TEST-9990014", firstName: "Nicole",  lastName: "Naquin",     dob: "1959-08-08", gender: "female", email: "nnaquin@test.com",       phone: "(337) 555-2014", addressLine1: "1483 Sale Rd",        city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 5, insuranceMemberId: "MED-FXT-014", allergies: [{ allergen: "Codeine", severity: "moderate", reaction: "Itching" }] },
  { mrn: "TEST-9990015", firstName: "Oliver",  lastName: "Olivier",    dob: "1992-04-29", gender: "male",   email: "oolivier@test.com",      phone: "(337) 555-2015", addressLine1: "1591 McNeese St",     city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 0, insuranceMemberId: "BCB-FXT-015" },
  { mrn: "TEST-9990016", firstName: "Patricia",lastName: "Primeaux",   dob: "1976-11-13", gender: "female", email: "pprimeaux@test.com",     phone: "(337) 555-2016", addressLine1: "1702 Common St",      city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 3, insuranceMemberId: "ESI-FXT-016" },
  { mrn: "TEST-9990017", firstName: "Quinn",   lastName: "Quibodeaux", dob: "1968-02-06", gender: "female", email: "qquibodeaux@test.com",   phone: "(337) 555-2017", addressLine1: "1815 Sale Rd",        city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 1, insuranceMemberId: "HUM-FXT-017" },
  { mrn: "TEST-9990018", firstName: "Ronald",  lastName: "Romero",     dob: "1947-09-21", gender: "male",                                    phone: "(337) 555-2018", addressLine1: "1922 Lake St",        city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 5, insuranceMemberId: "MED-FXT-018" },
  { mrn: "TEST-9990019", firstName: "Sophia",  lastName: "Savoy",      dob: "1987-07-04", gender: "female", email: "ssavoy@test.com",        phone: "(337) 555-2019", addressLine1: "2031 Country Club",   city: "Lake Charles", state: "LA", zip: "70605", insurancePlanIndex: 4, insuranceMemberId: "AET-FXT-019" },
  { mrn: "TEST-9990020", firstName: "Thomas",  lastName: "Thibodeaux", dob: "1963-03-18", gender: "male",   email: "tthibodeaux@test.com",   phone: "(337) 555-2020", addressLine1: "2142 Prien Lake",     city: "Lake Charles", state: "LA", zip: "70601", insurancePlanIndex: 6, insuranceMemberId: "UHC-FXT-020", allergies: [{ allergen: "Iodine", severity: "moderate", reaction: "Skin rash" }] },
];

// ─── Drug catalog fixtures ────────────────────────────────────────────
// We add a small, deterministic set of drugs covering the controlled-
// substance / compound / common-Rx test cases. Each is tagged with
// metadata.isFixture so we can findFirst-or-create safely.

interface DrugFixture {
  name: string;
  genericName: string;
  brandName?: string;
  manufacturer: string;
  ndc: string;
  strength: string;
  dosageForm: string;
  route: string;
  packageSize: string;
  unitOfMeasure: string;
  awp: number;
  acquisitionCost: number;
  isControlled?: boolean;
  deaSchedule?: string;
  isOtc?: boolean;
}

const DRUG_FIXTURES: DrugFixture[] = [
  { name: "Amoxicillin 500mg Capsules",        genericName: "Amoxicillin",         brandName: "Amoxil",     manufacturer: "Sandoz",   ndc: "00781180501", strength: "500mg",  dosageForm: "Capsule", route: "Oral", packageSize: "100", unitOfMeasure: "ea", awp: 22.50,  acquisitionCost: 4.20 },
  { name: "Atorvastatin 20mg Tablets",          genericName: "Atorvastatin",        brandName: "Lipitor",    manufacturer: "Pfizer",   ndc: "00071015523", strength: "20mg",   dosageForm: "Tablet",  route: "Oral", packageSize: "90",  unitOfMeasure: "ea", awp: 38.00,  acquisitionCost: 6.10 },
  { name: "Sertraline 50mg Tablets",            genericName: "Sertraline",          brandName: "Zoloft",     manufacturer: "Greenstone",ndc: "59762175001",strength: "50mg",   dosageForm: "Tablet",  route: "Oral", packageSize: "30",  unitOfMeasure: "ea", awp: 28.00,  acquisitionCost: 5.30 },
  { name: "Hydrocodone-APAP 5/325 Tablets",     genericName: "Hydrocodone-Acetaminophen", brandName: "Norco", manufacturer: "Allergan", ndc: "00591035301", strength: "5/325mg", dosageForm: "Tablet", route: "Oral", packageSize: "120", unitOfMeasure: "ea", awp: 75.00,  acquisitionCost: 18.40, isControlled: true, deaSchedule: "II" },
  { name: "Alprazolam 0.5mg Tablets",           genericName: "Alprazolam",          brandName: "Xanax",      manufacturer: "Greenstone",ndc: "00591023705",strength: "0.5mg",  dosageForm: "Tablet",  route: "Oral", packageSize: "60",  unitOfMeasure: "ea", awp: 40.00,  acquisitionCost: 8.20, isControlled: true, deaSchedule: "IV" },
  { name: "Levothyroxine 75mcg Tablets",        genericName: "Levothyroxine",       brandName: "Synthroid",  manufacturer: "AbbVie",   ndc: "00074434930", strength: "75mcg",  dosageForm: "Tablet",  route: "Oral", packageSize: "90",  unitOfMeasure: "ea", awp: 65.00,  acquisitionCost: 17.90 },
];

// ─── Prescription fixture spec ────────────────────────────────────────
// Defines each Rx — patient, prescriber, drug, qty, source, fill status,
// and any edge-case flags we want to surface for testing.

type RxSource = "electronic" | "fax" | "paper" | "phone";

interface RxFixture {
  rxNumber: string;
  patientIdx: number;     // index into PATIENT_FIXTURES
  prescriberIdx: number;  // index into PRESCRIBER_FIXTURES
  drugIdx: number;        // index into DRUG_FIXTURES (or -1 for compound)
  isCompound?: boolean;   // if true, drugIdx is ignored and formula is used
  formulaCode?: string;   // for compounds
  quantity: number;
  daysSupply: number;
  directions: string;
  refillsAuthorized: number;
  refillsRemaining: number;
  dawCode?: string;
  source: RxSource;
  fillStatus: string;     // FILL_STATUSES key
  expirationOffset: number; // days from today; negative = expired
  prescriberNotes?: string;
  // For waiting_bin / sold fills, we'll auto-populate pickup checklist data
}

// Distribution: 40 prescriptions across 13 fill statuses, 4 source types.
//
// Statuses (counts in parens):
//   intake (5) | adjudicating (3) | print (5) | scan (3) | verify (5)
//   waiting_bin (5) | sold (5) | rejected (2) | rph_rejected (2) | hold (2)
//   oos (1) | price_check (1) | compound_qa (1)
// Total = 40
//
// Source types: ~24 electronic, ~8 fax, ~5 paper, ~3 phone — distributed
// across statuses so the doc viewer can be exercised with each source type.

const RX_FIXTURES: RxFixture[] = [
  // ─── INTAKE (5) ─────────────────────────────────────────────────
  { rxNumber: "9990001", patientIdx: 0,  prescriberIdx: 0, drugIdx: 0, quantity: 30,  daysSupply: 10, directions: "Take 1 capsule by mouth three times daily for 10 days",                  refillsAuthorized: 0, refillsRemaining: 0, source: "electronic", fillStatus: "intake",       expirationOffset: 365 },
  { rxNumber: "9990002", patientIdx: 1,  prescriberIdx: 1, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "intake",       expirationOffset: 365 },
  { rxNumber: "9990003", patientIdx: 2,  prescriberIdx: 4, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 11, refillsRemaining: 11, source: "electronic", fillStatus: "intake",       expirationOffset: 365 },
  { rxNumber: "9990004", patientIdx: 3,  prescriberIdx: 2, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily on an empty stomach",                         refillsAuthorized: 5, refillsRemaining: 5, source: "fax",        fillStatus: "intake",       expirationOffset: 365 },
  { rxNumber: "9990005", patientIdx: 4,  prescriberIdx: 0, drugIdx: 1, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 11, refillsRemaining: 11, source: "phone",     fillStatus: "intake",       expirationOffset: 365 },

  // ─── ADJUDICATING (3) ───────────────────────────────────────────
  { rxNumber: "9990006", patientIdx: 5,  prescriberIdx: 1, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily on an empty stomach",                         refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "adjudicating", expirationOffset: 365 },
  { rxNumber: "9990007", patientIdx: 6,  prescriberIdx: 0, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "adjudicating", expirationOffset: 365 },
  { rxNumber: "9990008", patientIdx: 8,  prescriberIdx: 1, drugIdx: 1, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 11, refillsRemaining: 11, source: "fax",       fillStatus: "adjudicating", expirationOffset: 365 },

  // ─── PRINT (5) ──────────────────────────────────────────────────
  { rxNumber: "9990009", patientIdx: 7,  prescriberIdx: 2, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily before breakfast",                            refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "print",        expirationOffset: 365 },
  { rxNumber: "9990010", patientIdx: 10, prescriberIdx: 0, drugIdx: 0, quantity: 21,  daysSupply: 7,  directions: "Take 1 capsule by mouth three times daily for 7 days",                     refillsAuthorized: 0, refillsRemaining: 0, source: "electronic", fillStatus: "print",        expirationOffset: 365 },
  { rxNumber: "9990011", patientIdx: 11, prescriberIdx: 4, drugIdx: 4, quantity: 60,  daysSupply: 30, directions: "Take 1 tablet by mouth twice daily as needed for anxiety",                 refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "print",        expirationOffset: 180, prescriberNotes: "Patient counseled on dependence risk." },
  { rxNumber: "9990012", patientIdx: 12, prescriberIdx: 1, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 5, source: "paper",     fillStatus: "print",        expirationOffset: 365 },
  { rxNumber: "9990013", patientIdx: 13, prescriberIdx: 1, drugIdx: 5, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily on empty stomach",                            refillsAuthorized: 11, refillsRemaining: 11, source: "fax",       fillStatus: "print",        expirationOffset: 365 },

  // ─── SCAN (3) ───────────────────────────────────────────────────
  { rxNumber: "9990014", patientIdx: 14, prescriberIdx: 0, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "scan",         expirationOffset: 365 },
  { rxNumber: "9990015", patientIdx: 15, prescriberIdx: 4, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "scan",         expirationOffset: 365 },
  { rxNumber: "9990016", patientIdx: 16, prescriberIdx: 0, drugIdx: 0, quantity: 30,  daysSupply: 10, directions: "Take 1 capsule by mouth three times daily for 10 days",                   refillsAuthorized: 0, refillsRemaining: 0, source: "phone",     fillStatus: "scan",         expirationOffset: 365 },

  // ─── VERIFY (5) ─────────────────────────────────────────────────
  { rxNumber: "9990017", patientIdx: 17, prescriberIdx: 0, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily before breakfast",                            refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "verify",       expirationOffset: 365 },
  { rxNumber: "9990018", patientIdx: 18, prescriberIdx: 1, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "verify",       expirationOffset: 365 },
  { rxNumber: "9990019", patientIdx: 19, prescriberIdx: 4, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 5, source: "fax",        fillStatus: "verify",       expirationOffset: 365 },
  // CII at verify — exercises controlled-substance handling at verify gate
  { rxNumber: "9990020", patientIdx: 0,  prescriberIdx: 1, drugIdx: 3, quantity: 60,  daysSupply: 7,  directions: "Take 1 tablet by mouth every 4-6 hours as needed for severe pain",         refillsAuthorized: 0, refillsRemaining: 0, source: "paper",     fillStatus: "verify",       expirationOffset: 180, prescriberNotes: "Post-surgical pain. Do not exceed 6 tabs/day." },
  { rxNumber: "9990021", patientIdx: 1,  prescriberIdx: 0, drugIdx: 1, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 11, refillsRemaining: 10, source: "electronic", fillStatus: "verify",       expirationOffset: 365 },

  // ─── WAITING_BIN (5) ────────────────────────────────────────────
  // These need pickup checklist data populated.
  { rxNumber: "9990022", patientIdx: 2,  prescriberIdx: 1, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 4, source: "electronic", fillStatus: "waiting_bin", expirationOffset: 365 },
  { rxNumber: "9990023", patientIdx: 3,  prescriberIdx: 4, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 4, source: "electronic", fillStatus: "waiting_bin", expirationOffset: 365 },
  { rxNumber: "9990024", patientIdx: 4,  prescriberIdx: 0, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily before breakfast",                            refillsAuthorized: 5, refillsRemaining: 4, source: "electronic", fillStatus: "waiting_bin", expirationOffset: 365 },
  { rxNumber: "9990025", patientIdx: 5,  prescriberIdx: 1, drugIdx: 0, quantity: 30,  daysSupply: 10, directions: "Take 1 capsule by mouth three times daily for 10 days",                   refillsAuthorized: 0, refillsRemaining: 0, source: "fax",        fillStatus: "waiting_bin", expirationOffset: 365 },
  { rxNumber: "9990026", patientIdx: 6,  prescriberIdx: 4, drugIdx: 4, quantity: 60,  daysSupply: 30, directions: "Take 1 tablet by mouth twice daily as needed for anxiety",                refillsAuthorized: 5, refillsRemaining: 4, source: "electronic", fillStatus: "waiting_bin", expirationOffset: 180 },

  // ─── SOLD (5) ───────────────────────────────────────────────────
  { rxNumber: "9990027", patientIdx: 7,  prescriberIdx: 2, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily before breakfast",                            refillsAuthorized: 5, refillsRemaining: 4, source: "electronic", fillStatus: "sold",         expirationOffset: 365 },
  { rxNumber: "9990028", patientIdx: 8,  prescriberIdx: 1, drugIdx: 1, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 11, refillsRemaining: 10, source: "electronic", fillStatus: "sold",         expirationOffset: 365 },
  { rxNumber: "9990029", patientIdx: 9,  prescriberIdx: 0, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 4, source: "electronic", fillStatus: "sold",         expirationOffset: 365 },
  { rxNumber: "9990030", patientIdx: 11, prescriberIdx: 1, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 4, source: "paper",      fillStatus: "sold",         expirationOffset: 365 },
  { rxNumber: "9990031", patientIdx: 14, prescriberIdx: 0, drugIdx: 0, quantity: 21,  daysSupply: 7,  directions: "Take 1 capsule by mouth three times daily for 7 days",                    refillsAuthorized: 0, refillsRemaining: 0, source: "fax",        fillStatus: "sold",         expirationOffset: 365 },

  // ─── REJECTED (2) — insurance reject ────────────────────────────
  { rxNumber: "9990032", patientIdx: 8,  prescriberIdx: 1, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily before breakfast",                            refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "rejected",     expirationOffset: 365, prescriberNotes: "PA required by insurance" },
  { rxNumber: "9990033", patientIdx: 13, prescriberIdx: 4, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "rejected",     expirationOffset: 365 },

  // ─── RPH_REJECTED (2) — pharmacist reject at verify ─────────────
  { rxNumber: "9990034", patientIdx: 9,  prescriberIdx: 4, drugIdx: 4, quantity: 90,  daysSupply: 30, directions: "Take 1 tablet by mouth three times daily as needed for anxiety",          refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "rph_rejected", expirationOffset: 180, prescriberNotes: "RPh: Patient on opioid — combo concern, need clarification" },
  // Allergic-to-penicillin patient gets amoxicillin → DUR critical alert → rph_rejected
  { rxNumber: "9990035", patientIdx: 9,  prescriberIdx: 0, drugIdx: 0, quantity: 30,  daysSupply: 10, directions: "Take 1 capsule by mouth three times daily for 10 days",                   refillsAuthorized: 0, refillsRemaining: 0, source: "fax",        fillStatus: "rph_rejected", expirationOffset: 365, prescriberNotes: "DUR: Patient has documented severe penicillin allergy. RPh rejected. Needs prescriber clarification." },

  // ─── HOLD (2) ───────────────────────────────────────────────────
  { rxNumber: "9990036", patientIdx: 16, prescriberIdx: 0, drugIdx: 1, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 11, refillsRemaining: 11, source: "fax",       fillStatus: "hold",         expirationOffset: 365 },
  { rxNumber: "9990037", patientIdx: 17, prescriberIdx: 1, drugIdx: 5, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily before breakfast",                            refillsAuthorized: 5, refillsRemaining: 5, source: "phone",      fillStatus: "hold",         expirationOffset: 365 },

  // ─── OOS (1) — out of stock ─────────────────────────────────────
  { rxNumber: "9990038", patientIdx: 18, prescriberIdx: 4, drugIdx: 2, quantity: 30,  daysSupply: 30, directions: "Take 1 tablet by mouth daily in the morning",                              refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "oos",          expirationOffset: 365 },

  // ─── PRICE_CHECK (1) ────────────────────────────────────────────
  { rxNumber: "9990039", patientIdx: 19, prescriberIdx: 0, drugIdx: 1, quantity: 90,  daysSupply: 90, directions: "Take 1 tablet by mouth daily at bedtime",                                  refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "price_check",  expirationOffset: 365 },

  // ─── COMPOUND_QA (1) — compound waiting RPh QA ──────────────────
  // Uses an existing seed formula (LDN 4.5mg) — drugIdx=-1 + isCompound=true
  { rxNumber: "9990040", patientIdx: 5,  prescriberIdx: 2, drugIdx: -1, isCompound: true, formulaCode: "LDN-45-CAP", quantity: 30, daysSupply: 30, directions: "Take 1 capsule by mouth at bedtime",                                                                refillsAuthorized: 5, refillsRemaining: 5, source: "electronic", fillStatus: "compound_qa",  expirationOffset: 365, prescriberNotes: "Compound — RPh QA pending" },
];

// ─── Pickup checklist data for waiting_bin / sold fills ──────────────
//
// Mirrors the shape used by recordPickupChecklist (lib/workflow). Every
// waiting_bin fill needs this populated so a tester can advance it to
// sold without the gate kicking in. Sold fills get the same data plus a
// dispensedAt date.

function buildPickupChecklistMetadata() {
  return {
    pickupChecklist: {
      counselOffered: true,
      counselAccepted: true,
      signatureCaptured: true,
      paymentReceived: true,
      idVerified: true,
      capturedAt: isoDaysAgo(0),
    },
  };
}

// ─── Main seed runner ────────────────────────────────────────────────

async function main() {
  console.log("\n[seed-test-fixtures] Seeding BNDS test fixtures...\n");

  // ─── 1. Pre-flight: pull existing 3rd-party plans ─────────────
  const plans = await prisma.thirdPartyPlan.findMany({ orderBy: { createdAt: "asc" } });
  if (plans.length === 0) {
    console.warn(
      "  [warn] No third-party plans found. Patients will be seeded uninsured. " +
      "Run `npx prisma db seed` first if you want insurance fixtures populated."
    );
  } else {
    console.log(`  [ok] Found ${plans.length} third-party plans (will assign by index)`);
  }

  // ─── 2. Prescribers ──────────────────────────────────────────
  console.log("\n[seed-test-fixtures] Upserting 5 prescribers...");
  const prescribers = await Promise.all(
    PRESCRIBER_FIXTURES.map((p) =>
      prisma.prescriber.upsert({
        where: { npi: p.npi },
        update: {
          firstName: p.firstName,
          lastName: p.lastName,
          suffix: p.suffix,
          specialty: p.specialty,
          phone: p.phone,
          fax: p.fax,
          email: p.email,
          addressLine1: p.addressLine1,
          city: p.city,
          state: p.state,
          zip: p.zip,
          stateLicense: p.stateLicense,
          licenseState: p.licenseState,
          scheduleAuthority: p.scheduleAuthority,
          isActive: true,
          metadata: FIXTURE_TAG,
        },
        create: {
          npi: p.npi,
          deaNumber: p.deaNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          suffix: p.suffix,
          specialty: p.specialty,
          phone: p.phone,
          fax: p.fax,
          email: p.email,
          addressLine1: p.addressLine1,
          city: p.city,
          state: p.state,
          zip: p.zip,
          stateLicense: p.stateLicense,
          licenseState: p.licenseState,
          scheduleAuthority: p.scheduleAuthority,
          isActive: true,
          metadata: FIXTURE_TAG,
        },
      })
    )
  );
  console.log(`  [ok] ${prescribers.length} prescribers ready`);

  // ─── 3. Drug catalog (idempotent via metadata.isFixture) ─────
  console.log("\n[seed-test-fixtures] Ensuring 6 fixture drugs in catalog...");
  const drugs: Array<Awaited<ReturnType<typeof prisma.item.findFirst>>> = [];
  for (const drug of DRUG_FIXTURES) {
    const existing = await prisma.item.findFirst({
      where: {
        AND: [
          { name: drug.name },
          { metadata: { path: ["isFixture"], equals: true } },
        ],
      },
    });
    if (existing) {
      drugs.push(existing);
      continue;
    }
    const created = await prisma.item.create({
      data: {
        name: drug.name,
        genericName: drug.genericName,
        brandName: drug.brandName,
        manufacturer: drug.manufacturer,
        ndc: drug.ndc,
        strength: drug.strength,
        dosageForm: drug.dosageForm,
        route: drug.route,
        packageSize: drug.packageSize,
        unitOfMeasure: drug.unitOfMeasure,
        awp: drug.awp,
        acquisitionCost: drug.acquisitionCost,
        isOtc: drug.isOtc ?? false,
        isControlled: drug.isControlled ?? false,
        deaSchedule: drug.deaSchedule,
        isActive: true,
        metadata: FIXTURE_TAG,
      },
    });
    drugs.push(created);
  }
  console.log(`  [ok] ${drugs.length} drugs ready`);

  // ─── 4. Patients (with addresses, phones, allergies, insurance) ─
  console.log("\n[seed-test-fixtures] Upserting 20 patients...");
  const patients: Array<Awaited<ReturnType<typeof prisma.patient.findUnique>>> = [];
  for (const p of PATIENT_FIXTURES) {
    const patient = await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: {
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        email: p.email,
        status: "active",
        metadata: FIXTURE_TAG,
      },
      create: {
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        email: p.email,
        status: "active",
        preferredContact: "phone",
        preferredLanguage: "en",
        metadata: FIXTURE_TAG,
      },
    });
    patients.push(patient);

    // Phone / address / allergies — wipe + recreate so re-runs reflect spec.
    await prisma.patientPhoneNumber.deleteMany({ where: { patientId: patient!.id } });
    await prisma.patientPhoneNumber.create({
      data: {
        patientId: patient!.id,
        phoneType: "mobile",
        number: p.phone,
        isPrimary: true,
        acceptsSms: true,
      },
    });

    await prisma.patientAddress.deleteMany({ where: { patientId: patient!.id } });
    await prisma.patientAddress.create({
      data: {
        patientId: patient!.id,
        addressType: "home",
        line1: p.addressLine1,
        city: p.city,
        state: p.state,
        zip: p.zip,
        isDefault: true,
      },
    });

    await prisma.patientAllergy.deleteMany({ where: { patientId: patient!.id } });
    if (p.allergies?.length) {
      await prisma.patientAllergy.createMany({
        data: p.allergies.map((a) => ({
          patientId: patient!.id,
          allergen: a.allergen,
          severity: a.severity,
          reaction: a.reaction,
          status: "active",
          source: "patient_reported",
        })),
      });
    }

    // Insurance — link to existing plan by index if available
    await prisma.patientInsurance.deleteMany({ where: { patientId: patient!.id } });
    if (p.insurancePlanIndex !== undefined && plans[p.insurancePlanIndex]) {
      await prisma.patientInsurance.create({
        data: {
          patientId: patient!.id,
          thirdPartyPlanId: plans[p.insurancePlanIndex].id,
          priority: "primary",
          memberId: p.insuranceMemberId ?? `FXT-${p.mrn}`,
          relationship: "self",
          cardholderName: `${p.firstName} ${p.lastName}`,
          effectiveDate: new Date("2025-01-01"),
          isActive: true,
        },
      });
    }
  }
  console.log(`  [ok] ${patients.length} patients ready (incl. addresses, phones, allergies, insurance)`);

  // ─── 5. Look up the LDN compound formula for the compound_qa fixture ──
  const ldnFormula = await prisma.formula.findUnique({
    where: { formulaCode: "LDN-45-CAP" },
  });
  if (!ldnFormula) {
    console.warn(
      "  [warn] Formula LDN-45-CAP not found - compound_qa Rx will be created without formulaId. " +
      "Run `npx prisma db seed` to populate formulas."
    );
  }

  // ─── 6. Prescriptions + Fills ──────────────────────────────
  console.log("\n[seed-test-fixtures] Upserting 40 prescriptions with fills...");
  let createdRx = 0;
  let createdFills = 0;

  for (const rx of RX_FIXTURES) {
    const patient = patients[rx.patientIdx]!;
    const prescriber = prescribers[rx.prescriberIdx];
    const drug = rx.drugIdx >= 0 ? drugs[rx.drugIdx] : null;
    const fixture = PATIENT_FIXTURES[rx.patientIdx];
    const prescriberFixture = PRESCRIBER_FIXTURES[rx.prescriberIdx];
    const drugFixture = rx.drugIdx >= 0 ? DRUG_FIXTURES[rx.drugIdx] : null;

    const dateWritten = dateDaysAgo(2);
    const expirationDate = dateDaysAhead(rx.expirationOffset);

    // Build source-specific metadata for the document viewer (Phase 1).
    const sourceMetadata: Record<string, unknown> = {};
    if (rx.source === "electronic" && drugFixture) {
      sourceMetadata.erxSource = buildErxPayload({
        rxNumber: rx.rxNumber,
        patient: {
          firstName: fixture.firstName,
          lastName: fixture.lastName,
          dob: fixture.dob,
          gender: fixture.gender,
          addressLine1: fixture.addressLine1,
          city: fixture.city,
          state: fixture.state,
          zip: fixture.zip,
          phone: fixture.phone,
        },
        prescriber: {
          firstName: prescriberFixture.firstName,
          lastName: prescriberFixture.lastName,
          suffix: prescriberFixture.suffix,
          npi: prescriberFixture.npi,
          deaNumber: prescriberFixture.deaNumber,
          phone: prescriberFixture.phone,
          addressLine1: prescriberFixture.addressLine1,
          city: prescriberFixture.city,
          state: prescriberFixture.state,
          zip: prescriberFixture.zip,
          specialty: prescriberFixture.specialty,
        },
        medication: {
          drugName: drugFixture.name,
          ndc: drugFixture.ndc,
          strength: drugFixture.strength,
          dosageForm: drugFixture.dosageForm,
          route: drugFixture.route,
          quantity: rx.quantity,
          daysSupply: rx.daysSupply,
          directions: rx.directions,
          refillsAuthorized: rx.refillsAuthorized,
          dawCode: rx.dawCode,
          deaSchedule: drugFixture.deaSchedule,
          isCompound: rx.isCompound,
        },
        dateWritten: dateWritten.toISOString().slice(0, 10),
        prescriberNotes: rx.prescriberNotes,
      });
    } else if (rx.source === "fax") {
      sourceMetadata.faxSource = {
        receivedAt: isoDaysAgo(1),
        faxNumber: prescriberFixture.fax ?? "(337) 555-0000",
        pageCount: 1,
        senderName: `${prescriberFixture.firstName} ${prescriberFixture.lastName}, ${prescriberFixture.suffix}`,
        // documentId: null  → Phase 2 will populate this with a real Document
      };
    } else if (rx.source === "paper") {
      sourceMetadata.paperSource = {
        scannedAt: isoDaysAgo(1),
        scannedByLabel: "Front Counter",
        // documentId: null  → Phase 3 will populate this with a real Document
      };
    } else if (rx.source === "phone") {
      sourceMetadata.phoneSource = {
        calledAt: isoDaysAgo(1),
        callerName: `${prescriberFixture.firstName} ${prescriberFixture.lastName} office`,
        prescriberConfirmed: true,
        prescriberPhone: prescriberFixture.phone,
        transcript:
          `${prescriberFixture.lastName} office called for ${fixture.firstName} ${fixture.lastName} ` +
          `(DOB ${fixture.dob}). Rx: ${drugFixture?.name ?? "compound"} — ${rx.quantity} ` +
          `${drugFixture?.unitOfMeasure ?? "units"}, ${rx.directions}. ` +
          `Refills: ${rx.refillsAuthorized}. Verified caller via callback.`,
        transcribedByLabel: "Pharmacy Tech",
      };
    }

    const rxMetadata = {
      ...FIXTURE_TAG,
      ...sourceMetadata,
    } as Prisma.InputJsonValue;

    // Lift dawCode out of the eRx metadata payload so the structured
    // Prescription.dawCode column stays in lockstep with what the
    // RxDocumentView eRx panel renders. buildErxPayload() applies the
    // NCPDP "0" default ("no product selection indicated") to its
    // medication.dawCode when the input was undefined; without this
    // lift we'd save the raw `rx.dawCode` (undefined → null) into the
    // column, and the detail page would render "—" right next to a
    // panel reading "0". The two ARE meant to be the same value.
    const erxMedication = (sourceMetadata.erxSource as
      | { medication?: { dawCode?: string } }
      | undefined)?.medication;
    const resolvedDawCode = erxMedication?.dawCode ?? rx.dawCode ?? null;

    const rxRecord = await prisma.prescription.upsert({
      where: { rxNumber: rx.rxNumber },
      update: {
        patientId: patient!.id,
        prescriberId: prescriber.id,
        itemId: drug?.id,
        formulaId: rx.formulaCode === "LDN-45-CAP" ? ldnFormula?.id : null,
        isCompound: rx.isCompound ?? false,
        quantityPrescribed: rx.quantity,
        daysSupply: rx.daysSupply,
        directions: rx.directions,
        dawCode: resolvedDawCode,
        refillsAuthorized: rx.refillsAuthorized,
        refillsRemaining: rx.refillsRemaining,
        dateWritten,
        expirationDate,
        prescriberNotes: rx.prescriberNotes,
        source: rx.source,
        status: rx.fillStatus,
        priority: "normal",
        isActive: true,
        metadata: rxMetadata,
      },
      create: {
        rxNumber: rx.rxNumber,
        patientId: patient!.id,
        prescriberId: prescriber.id,
        itemId: drug?.id,
        formulaId: rx.formulaCode === "LDN-45-CAP" ? ldnFormula?.id : null,
        isCompound: rx.isCompound ?? false,
        quantityPrescribed: rx.quantity,
        daysSupply: rx.daysSupply,
        directions: rx.directions,
        dawCode: resolvedDawCode,
        refillsAuthorized: rx.refillsAuthorized,
        refillsRemaining: rx.refillsRemaining,
        dateWritten,
        expirationDate,
        prescriberNotes: rx.prescriberNotes,
        source: rx.source,
        status: rx.fillStatus,
        priority: "normal",
        isActive: true,
        metadata: rxMetadata,
      },
    });
    createdRx++;

    // ── Fill — upsert by (prescriptionId, fillNumber=1) ──────────
    const fillMetadata: Record<string, unknown> = { ...FIXTURE_TAG };
    if (rx.fillStatus === "waiting_bin" || rx.fillStatus === "sold") {
      Object.assign(fillMetadata, buildPickupChecklistMetadata());
    }

    const filledAt = ["scan", "verify", "waiting_bin", "sold"].includes(rx.fillStatus)
      ? dateDaysAgo(1)
      : null;
    const verifiedAt = ["waiting_bin", "sold"].includes(rx.fillStatus)
      ? dateDaysAgo(0)
      : null;
    const dispensedAt = rx.fillStatus === "sold" ? dateDaysAgo(0) : null;

    await prisma.prescriptionFill.upsert({
      where: {
        prescriptionId_fillNumber: {
          prescriptionId: rxRecord.id,
          fillNumber: 1,
        },
      },
      update: {
        status: rx.fillStatus,
        quantity: rx.quantity,
        daysSupply: rx.daysSupply,
        ndc: drugFixture?.ndc,
        itemId: drug?.id,
        filledAt,
        verifiedAt,
        dispensedAt,
        metadata: fillMetadata as Prisma.InputJsonValue,
      },
      create: {
        prescriptionId: rxRecord.id,
        fillNumber: 1,
        status: rx.fillStatus,
        quantity: rx.quantity,
        daysSupply: rx.daysSupply,
        ndc: drugFixture?.ndc,
        itemId: drug?.id,
        filledAt,
        verifiedAt,
        dispensedAt,
        metadata: fillMetadata as Prisma.InputJsonValue,
      },
    });
    createdFills++;
  }

  console.log(`  [ok] ${createdRx} prescriptions, ${createdFills} fills`);

  // ─── Summary ────────────────────────────────────────────────────
  console.log("\n[seed-test-fixtures] Test fixtures ready.\n");
  console.log("  Status distribution:");
  const statusCounts = RX_FIXTURES.reduce<Record<string, number>>((acc, rx) => {
    acc[rx.fillStatus] = (acc[rx.fillStatus] ?? 0) + 1;
    return acc;
  }, {});
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log(`    - ${status.padEnd(15)} ${count}`);
  }
  console.log("\n  Source distribution:");
  const sourceCounts = RX_FIXTURES.reduce<Record<string, number>>((acc, rx) => {
    acc[rx.source] = (acc[rx.source] ?? 0) + 1;
    return acc;
  }, {});
  for (const [source, count] of Object.entries(sourceCounts).sort()) {
    console.log(`    - ${source.padEnd(15)} ${count}`);
  }

  console.log(
    "\n  Visit /queue to see the seeded fills across all 4 visual tabs.\n" +
    "  Re-run this script any time — it's idempotent (upsert by mrn/npi/rxNumber).\n"
  );
}

main()
  .catch((e) => {
    console.error("\n[seed-test-fixtures] Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
