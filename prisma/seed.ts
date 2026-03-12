import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding BNDS Pharmacy Management System...\n");

  // ─── 1. STORE ────────────────────────────────────────
  console.log("Creating store...");
  const store = await prisma.store.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Boudreaux's Compounding Pharmacy",
      npi: "1234567890",
      dea: "AB1234567",
      stateLicense: "PH-00123",
      phone: "(337) 436-7216",
      fax: "(337) 436-7217",
      email: "info@bndsrx.com",
      addressLine1: "404 E Prien Lake Rd",
      city: "Lake Charles",
      state: "LA",
      zip: "70601",
      timezone: "America/Chicago",
    },
  });
  console.log(`  ✓ Store: ${store.name}`);

  // ─── 2. ROLES ────────────────────────────────────────
  console.log("Creating roles...");
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: "pharmacist" },
      update: {},
      create: {
        name: "pharmacist",
        description: "Licensed pharmacist — full system access, clinical decisions, verification",
        permissions: {
          prescriptions: ["read", "write", "verify", "dispense"],
          compounding: ["read", "write", "verify"],
          patients: ["read", "write"],
          inventory: ["read", "write"],
          billing: ["read", "write"],
          reports: ["read"],
          settings: ["read", "write"],
          users: ["read", "write"],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: "technician" },
      update: {},
      create: {
        name: "technician",
        description: "Pharmacy technician — fill prescriptions, compound, manage inventory",
        permissions: {
          prescriptions: ["read", "write"],
          compounding: ["read", "write"],
          patients: ["read", "write"],
          inventory: ["read", "write"],
          billing: ["read"],
          reports: ["read"],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: "shipping_clerk" },
      update: {},
      create: {
        name: "shipping_clerk",
        description: "Shipping clerk — pack orders, manage shipments and deliveries",
        permissions: {
          prescriptions: ["read"],
          patients: ["read"],
          shipping: ["read", "write"],
          inventory: ["read"],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: "billing_specialist" },
      update: {},
      create: {
        name: "billing_specialist",
        description: "Billing specialist — claims, payments, insurance processing",
        permissions: {
          prescriptions: ["read"],
          patients: ["read"],
          billing: ["read", "write"],
          insurance: ["read", "write"],
          reports: ["read"],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: "cashier" },
      update: {},
      create: {
        name: "cashier",
        description: "POS cashier — process transactions, patient pickup",
        permissions: {
          prescriptions: ["read"],
          patients: ["read"],
          pos: ["read", "write"],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: {
        name: "admin",
        description: "Administrator — full access including system configuration and user management",
        permissions: {
          all: ["read", "write", "admin"],
        },
      },
    }),
  ]);
  console.log(`  ✓ ${roles.length} roles created`);

  // ─── 3. USERS (stub — real users created via Supabase auth) ─────
  // Users are auto-created on first login via getCurrentUser() in auth.ts
  // But we'll create placeholder entries for testing if no DB user exists

  // ─── 4. PRESCRIBERS ──────────────────────────────────
  console.log("Creating prescribers...");
  const prescribers = await Promise.all([
    prisma.prescriber.upsert({
      where: { npi: "1558392145" },
      update: {},
      create: {
        npi: "1558392145",
        deaNumber: "BJ1234567",
        firstName: "James",
        lastName: "Breaux",
        suffix: "MD",
        specialty: "Internal Medicine",
        phone: "(337) 474-5000",
        fax: "(337) 474-5001",
        email: "jbreaux@lcmg.com",
        addressLine1: "900 Lakeshore Dr",
        city: "Lake Charles",
        state: "LA",
        zip: "70601",
        stateLicense: "MD-39421",
        licenseState: "LA",
        scheduleAuthority: ["II", "III", "IV", "V"],
      },
    }),
    prisma.prescriber.upsert({
      where: { npi: "1447283256" },
      update: {},
      create: {
        npi: "1447283256",
        deaNumber: "FL7654321",
        firstName: "Lisa",
        lastName: "Fontenot",
        suffix: "DO",
        specialty: "Family Medicine",
        phone: "(337) 477-2800",
        fax: "(337) 477-2801",
        email: "lfontenot@swlamed.com",
        addressLine1: "524 W McNeese St",
        city: "Lake Charles",
        state: "LA",
        zip: "70605",
        stateLicense: "DO-18752",
        licenseState: "LA",
        scheduleAuthority: ["II", "III", "IV", "V"],
      },
    }),
    prisma.prescriber.upsert({
      where: { npi: "1336174378" },
      update: {},
      create: {
        npi: "1336174378",
        firstName: "Marie",
        lastName: "Guidry",
        suffix: "NP",
        specialty: "Nurse Practitioner — Endocrinology",
        phone: "(337) 480-3100",
        fax: "(337) 480-3101",
        email: "mguidry@christushealth.org",
        addressLine1: "1701 Oak Park Blvd",
        city: "Lake Charles",
        state: "LA",
        zip: "70601",
        stateLicense: "APRN-52891",
        licenseState: "LA",
        scheduleAuthority: ["III", "IV", "V"],
      },
    }),
    prisma.prescriber.upsert({
      where: { npi: "1225065489" },
      update: {},
      create: {
        npi: "1225065489",
        deaNumber: "RM3456789",
        firstName: "Robert",
        lastName: "Menard",
        suffix: "MD",
        specialty: "Dermatology",
        phone: "(337) 478-1234",
        fax: "(337) 478-1235",
        email: "rmenard@lakeskin.com",
        addressLine1: "3250 Nelson Rd",
        city: "Lake Charles",
        state: "LA",
        zip: "70605",
        stateLicense: "MD-27134",
        licenseState: "LA",
        scheduleAuthority: ["III", "IV", "V"],
      },
    }),
  ]);
  console.log(`  ✓ ${prescribers.length} prescribers`);

  // ─── 5. THIRD-PARTY PLANS (Insurance) ────────────────
  console.log("Creating insurance plans...");
  const plans = await Promise.all([
    prisma.thirdPartyPlan.create({
      data: {
        planName: "Blue Cross Blue Shield of Louisiana",
        bin: "610014",
        pcn: "BCBSLA",
        phone: "(800) 392-4089",
        planType: "commercial",
      },
    }),
    prisma.thirdPartyPlan.create({
      data: {
        planName: "Humana Pharmacy Solutions",
        bin: "610494",
        pcn: "HUMPRS",
        phone: "(800) 486-2621",
        planType: "commercial",
      },
    }),
    prisma.thirdPartyPlan.create({
      data: {
        planName: "Louisiana Medicaid (Healthy Louisiana)",
        bin: "610097",
        pcn: "LAMCAID",
        phone: "(888) 342-6207",
        planType: "medicaid",
      },
    }),
    prisma.thirdPartyPlan.create({
      data: {
        planName: "Express Scripts / Cigna",
        bin: "003858",
        pcn: "A4",
        phone: "(800) 282-2881",
        planType: "pbm",
      },
    }),
    prisma.thirdPartyPlan.create({
      data: {
        planName: "Aetna CVS Health",
        bin: "004336",
        pcn: "ADV",
        phone: "(800) 238-6279",
        planType: "commercial",
      },
    }),
    prisma.thirdPartyPlan.create({
      data: {
        planName: "Medicare Part D - SilverScript",
        bin: "610239",
        pcn: "SLVRSCRPT",
        phone: "(866) 235-5613",
        planType: "medicare",
      },
    }),
    prisma.thirdPartyPlan.create({
      data: {
        planName: "United Healthcare / OptumRx",
        bin: "610279",
        pcn: "9999",
        phone: "(800) 788-4863",
        planType: "commercial",
      },
    }),
  ]);
  console.log(`  ✓ ${plans.length} insurance plans`);

  // ─── 6. SUPPLIERS ────────────────────────────────────
  console.log("Creating suppliers...");
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: "PCCA (Professional Compounding Centers of America)", contactName: "Sales Dept", phone: "(800) 331-2498", email: "orders@pccarx.com", accountNumber: "PCCA-78412", paymentTerms: "Net 30", leadTimeDays: 3 } }),
    prisma.supplier.create({ data: { name: "Medisca", contactName: "Customer Service", phone: "(800) 665-6334", email: "orders@medisca.com", accountNumber: "MED-23891", paymentTerms: "Net 30", leadTimeDays: 4 } }),
    prisma.supplier.create({ data: { name: "Letco Medical / Fagron", contactName: "Order Support", phone: "(800) 239-5288", email: "orders@letcomedical.com", accountNumber: "LET-11245", paymentTerms: "Net 30", leadTimeDays: 3 } }),
    prisma.supplier.create({ data: { name: "McKesson", contactName: "Territory Rep", phone: "(800) 422-5604", email: "rep@mckesson.com", accountNumber: "MCK-993412", paymentTerms: "Net 15", leadTimeDays: 1 } }),
    prisma.supplier.create({ data: { name: "AmerisourceBergen", contactName: "Account Mgr", phone: "(800) 829-3132", email: "orders@amerisource.com", accountNumber: "ABC-442178", paymentTerms: "Net 15", leadTimeDays: 1 } }),
  ]);
  console.log(`  ✓ ${suppliers.length} suppliers`);

  // ─── 7. ITEMS (Drug Catalog / Ingredients) ───────────
  console.log("Creating items (drug catalog)...");
  const items = await Promise.all([
    // Compound ingredients
    prisma.item.create({ data: { name: "Progesterone Micronized USP", genericName: "Progesterone", manufacturer: "PCCA", strength: "100%", dosageForm: "Powder", unitOfMeasure: "g", acquisitionCost: 0.85, isCompoundIngredient: true, reorderPoint: 100, reorderQuantity: 500 } }),
    prisma.item.create({ data: { name: "Estradiol USP", genericName: "Estradiol", manufacturer: "PCCA", strength: "100%", dosageForm: "Powder", unitOfMeasure: "g", acquisitionCost: 4.50, isCompoundIngredient: true, reorderPoint: 25, reorderQuantity: 100 } }),
    prisma.item.create({ data: { name: "Testosterone Cypionate USP", genericName: "Testosterone Cypionate", manufacturer: "PCCA", strength: "100%", dosageForm: "Powder", unitOfMeasure: "g", acquisitionCost: 2.10, isCompoundIngredient: true, isControlled: true, deaSchedule: "III", reorderPoint: 50, reorderQuantity: 200 } }),
    prisma.item.create({ data: { name: "Gabapentin USP", genericName: "Gabapentin", manufacturer: "Medisca", strength: "100%", dosageForm: "Powder", unitOfMeasure: "g", acquisitionCost: 0.35, isCompoundIngredient: true, reorderPoint: 200, reorderQuantity: 1000 } }),
    prisma.item.create({ data: { name: "Ketamine HCl USP", genericName: "Ketamine", manufacturer: "Letco Medical", strength: "100%", dosageForm: "Powder", unitOfMeasure: "g", acquisitionCost: 3.25, isCompoundIngredient: true, isControlled: true, deaSchedule: "III", reorderPoint: 25, reorderQuantity: 100 } }),
    prisma.item.create({ data: { name: "Lidocaine HCl USP", genericName: "Lidocaine", manufacturer: "PCCA", strength: "100%", dosageForm: "Powder", unitOfMeasure: "g", acquisitionCost: 0.65, isCompoundIngredient: true, reorderPoint: 100, reorderQuantity: 500 } }),
    prisma.item.create({ data: { name: "PLO Gel Base (Pluronic Lecithin Organogel)", genericName: "PLO Gel Base", manufacturer: "PCCA", dosageForm: "Gel base", unitOfMeasure: "g", acquisitionCost: 0.12, isCompoundIngredient: true, reorderPoint: 500, reorderQuantity: 2000 } }),
    prisma.item.create({ data: { name: "Lipoderm Base", genericName: "Lipoderm", manufacturer: "PCCA", dosageForm: "Cream base", unitOfMeasure: "g", acquisitionCost: 0.18, isCompoundIngredient: true, reorderPoint: 500, reorderQuantity: 2000 } }),
    // Commercial products
    prisma.item.create({ data: { ndc: "00378180501", name: "Metformin HCl 500mg Tablets", genericName: "Metformin HCl", brandName: "Glucophage", manufacturer: "Mylan", strength: "500mg", dosageForm: "Tablet", route: "Oral", packageSize: "500", unitOfMeasure: "ea", awp: 35.50, acquisitionCost: 8.20, reorderPoint: 100, reorderQuantity: 500 } }),
    prisma.item.create({ data: { ndc: "00069015401", name: "Lisinopril 10mg Tablets", genericName: "Lisinopril", brandName: "Prinivil", manufacturer: "Pfizer", strength: "10mg", dosageForm: "Tablet", route: "Oral", packageSize: "100", unitOfMeasure: "ea", awp: 42.00, acquisitionCost: 4.50, reorderPoint: 100, reorderQuantity: 500 } }),
    prisma.item.create({ data: { ndc: "00002323201", name: "Humalog Insulin 100u/mL", genericName: "Insulin Lispro", brandName: "Humalog", manufacturer: "Eli Lilly", strength: "100 units/mL", dosageForm: "Injection", route: "Subcutaneous", packageSize: "10mL", unitOfMeasure: "vial", awp: 375.00, acquisitionCost: 280.00, isRefrigerated: true, reorderPoint: 5, reorderQuantity: 10 } }),
    prisma.item.create({ data: { ndc: "00456132001", name: "Synthroid 50mcg Tablets", genericName: "Levothyroxine Sodium", brandName: "Synthroid", manufacturer: "AbbVie", strength: "50mcg", dosageForm: "Tablet", route: "Oral", packageSize: "90", unitOfMeasure: "ea", awp: 65.00, acquisitionCost: 18.50, reorderPoint: 50, reorderQuantity: 200 } }),
  ]);
  console.log(`  ✓ ${items.length} items`);

  // ─── 8. ITEM LOTS (Inventory) ────────────────────────
  console.log("Creating inventory lots...");
  const today = new Date();
  const sixMonths = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
  const oneYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const threeMonths = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());

  const lots = await Promise.all([
    prisma.itemLot.create({ data: { itemId: items[0].id, lotNumber: "PG-2025-A112", supplierId: suppliers[0].id, quantityReceived: 500, quantityOnHand: 342, unit: "g", unitCost: 0.85, expirationDate: oneYear, dateReceived: new Date(today.getFullYear(), today.getMonth() - 1, 15) } }),
    prisma.itemLot.create({ data: { itemId: items[1].id, lotNumber: "ES-2025-B034", supplierId: suppliers[0].id, quantityReceived: 100, quantityOnHand: 67, unit: "g", unitCost: 4.50, expirationDate: sixMonths, dateReceived: new Date(today.getFullYear(), today.getMonth() - 2, 5) } }),
    prisma.itemLot.create({ data: { itemId: items[2].id, lotNumber: "TC-2025-C089", supplierId: suppliers[0].id, quantityReceived: 200, quantityOnHand: 155, unit: "g", unitCost: 2.10, expirationDate: oneYear, dateReceived: new Date(today.getFullYear(), today.getMonth() - 1, 20) } }),
    prisma.itemLot.create({ data: { itemId: items[3].id, lotNumber: "GB-2025-D201", supplierId: suppliers[1].id, quantityReceived: 1000, quantityOnHand: 782, unit: "g", unitCost: 0.35, expirationDate: oneYear, dateReceived: new Date(today.getFullYear(), today.getMonth() - 1, 10) } }),
    prisma.itemLot.create({ data: { itemId: items[4].id, lotNumber: "KT-2025-E045", supplierId: suppliers[2].id, quantityReceived: 100, quantityOnHand: 18, unit: "g", unitCost: 3.25, expirationDate: sixMonths, dateReceived: new Date(today.getFullYear(), today.getMonth() - 3, 1), status: "low_stock" } }),
    prisma.itemLot.create({ data: { itemId: items[5].id, lotNumber: "LD-2025-F178", supplierId: suppliers[0].id, quantityReceived: 500, quantityOnHand: 401, unit: "g", unitCost: 0.65, expirationDate: oneYear, dateReceived: new Date(today.getFullYear(), today.getMonth() - 1, 8) } }),
    prisma.itemLot.create({ data: { itemId: items[6].id, lotNumber: "PLO-2025-G334", supplierId: suppliers[0].id, quantityReceived: 2000, quantityOnHand: 1245, unit: "g", unitCost: 0.12, expirationDate: sixMonths, dateReceived: new Date(today.getFullYear(), today.getMonth() - 2, 1) } }),
    prisma.itemLot.create({ data: { itemId: items[8].id, lotNumber: "MET-2025-H001", supplierId: suppliers[3].id, quantityReceived: 500, quantityOnHand: 350, unit: "ea", unitCost: 0.016, expirationDate: oneYear, dateReceived: new Date(today.getFullYear(), today.getMonth() - 1, 5) } }),
    prisma.itemLot.create({ data: { itemId: items[10].id, lotNumber: "HUM-2025-I023", supplierId: suppliers[3].id, quantityReceived: 10, quantityOnHand: 3, unit: "vial", unitCost: 28.00, expirationDate: threeMonths, dateReceived: new Date(today.getFullYear(), today.getMonth() - 2, 10), status: "low_stock" } }),
  ]);
  console.log(`  ✓ ${lots.length} inventory lots`);

  // ─── 9. PATIENTS ─────────────────────────────────────
  console.log("Creating patients...");
  const patients = await Promise.all([
    prisma.patient.create({ data: { mrn: "BNDS-0000001", firstName: "Marie", lastName: "Thibodaux", dateOfBirth: new Date("1965-03-14"), gender: "female", email: "marie.t@gmail.com", status: "active", phoneNumbers: { create: { phoneType: "mobile", number: "(337) 555-0101", isPrimary: true, acceptsSms: true } }, addresses: { create: { addressType: "home", line1: "1205 Common St", city: "Lake Charles", state: "LA", zip: "70601", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000002", firstName: "Robert", lastName: "Broussard", dateOfBirth: new Date("1972-07-22"), gender: "male", email: "rbroussard@yahoo.com", status: "active", phoneNumbers: { create: { phoneType: "mobile", number: "(337) 555-0102", isPrimary: true, acceptsSms: true } }, addresses: { create: { addressType: "home", line1: "508 W 18th St", city: "Lake Charles", state: "LA", zip: "70601", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000003", firstName: "Anne", lastName: "LeBlanc", dateOfBirth: new Date("1980-11-03"), gender: "female", email: "anne.lb@outlook.com", status: "active", phoneNumbers: { create: { phoneType: "mobile", number: "(337) 555-0103", isPrimary: true, acceptsSms: true } }, addresses: { create: { addressType: "home", line1: "3201 Ryan St", city: "Lake Charles", state: "LA", zip: "70605", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000004", firstName: "Thomas", lastName: "Hebert", dateOfBirth: new Date("1958-09-30"), gender: "male", status: "active", phoneNumbers: { create: { phoneType: "home", number: "(337) 555-0104", isPrimary: true } }, addresses: { create: { addressType: "home", line1: "712 Hodges St", city: "Lake Charles", state: "LA", zip: "70601", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000005", firstName: "Claire", lastName: "Duhon", dateOfBirth: new Date("1990-01-18"), gender: "female", email: "cduhon90@gmail.com", status: "active", phoneNumbers: { create: { phoneType: "mobile", number: "(337) 555-0105", isPrimary: true, acceptsSms: true } }, addresses: { create: { addressType: "home", line1: "2100 Country Club Rd", city: "Lake Charles", state: "LA", zip: "70605", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000006", firstName: "James", lastName: "Landry", dateOfBirth: new Date("1945-12-05"), gender: "male", status: "active", phoneNumbers: { create: { phoneType: "home", number: "(337) 555-0106", isPrimary: true } }, addresses: { create: { addressType: "home", line1: "890 Shell Beach Dr", city: "Lake Charles", state: "LA", zip: "70601", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000007", firstName: "Patricia", lastName: "Richard", dateOfBirth: new Date("1978-06-11"), gender: "female", email: "pat.richard@att.net", status: "active", phoneNumbers: { create: { phoneType: "mobile", number: "(337) 555-0107", isPrimary: true, acceptsSms: true } }, addresses: { create: { addressType: "home", line1: "4415 Nelson Rd", city: "Lake Charles", state: "LA", zip: "70605", isDefault: true } } } }),
    prisma.patient.create({ data: { mrn: "BNDS-0000008", firstName: "Daniel", lastName: "Mouton", dateOfBirth: new Date("1985-04-27"), gender: "male", email: "dmouton@bndsrx.com", status: "active", phoneNumbers: { create: { phoneType: "mobile", number: "(337) 555-0108", isPrimary: true, acceptsSms: true } }, addresses: { create: { addressType: "home", line1: "1601 Enterprise Blvd", city: "Lake Charles", state: "LA", zip: "70601", isDefault: true } } } }),
  ]);
  console.log(`  ✓ ${patients.length} patients`);

  // ─── 10. PATIENT INSURANCE ───────────────────────────
  console.log("Assigning patient insurance...");
  await Promise.all([
    prisma.patientInsurance.create({ data: { patientId: patients[0].id, thirdPartyPlanId: plans[0].id, priority: "primary", memberId: "BCB-887412-01", groupNumber: "GRP-5510", relationship: "self", cardholderName: "Marie Thibodaux", effectiveDate: new Date("2024-01-01") } }),
    prisma.patientInsurance.create({ data: { patientId: patients[1].id, thirdPartyPlanId: plans[1].id, priority: "primary", memberId: "HUM-334521-00", groupNumber: "GRP-2200", relationship: "self", cardholderName: "Robert Broussard", effectiveDate: new Date("2024-01-01") } }),
    prisma.patientInsurance.create({ data: { patientId: patients[2].id, thirdPartyPlanId: plans[3].id, priority: "primary", memberId: "ESI-997834-01", personCode: "01", groupNumber: "RX-7700", relationship: "self", cardholderName: "Anne LeBlanc", effectiveDate: new Date("2024-06-01") } }),
    prisma.patientInsurance.create({ data: { patientId: patients[3].id, thirdPartyPlanId: plans[5].id, priority: "primary", memberId: "MED-223489-00", personCode: "00", relationship: "self", cardholderName: "Thomas Hebert", effectiveDate: new Date("2024-01-01") } }),
    prisma.patientInsurance.create({ data: { patientId: patients[4].id, thirdPartyPlanId: plans[4].id, priority: "primary", memberId: "AET-556781-01", groupNumber: "GRP-8890", relationship: "self", cardholderName: "Claire Duhon", effectiveDate: new Date("2025-01-01") } }),
    prisma.patientInsurance.create({ data: { patientId: patients[5].id, thirdPartyPlanId: plans[2].id, priority: "primary", memberId: "LAM-112390-00", relationship: "self", cardholderName: "James Landry", effectiveDate: new Date("2024-01-01") } }),
  ]);
  console.log(`  ✓ Patient insurance assigned`);

  // ─── 11. FORMULAS ────────────────────────────────────
  console.log("Creating compound formulas...");
  const formulas = await Promise.all([
    prisma.formula.create({ data: { name: "Progesterone 100mg Capsules", formulaCode: "PROG-100-CAP", category: "Hormone Replacement", dosageForm: "Capsule", route: "Oral", defaultBudDays: 180, storageConditions: "Room temperature, dry" } }),
    prisma.formula.create({ data: { name: "BiEst Cream 80/20 (0.5mg/mL)", formulaCode: "BIEST-0520-CRM", category: "Hormone Replacement", dosageForm: "Cream", route: "Topical", defaultBudDays: 180, storageConditions: "Room temperature" } }),
    prisma.formula.create({ data: { name: "Testosterone Cypionate 200mg/mL Injection", formulaCode: "TCYP-200-INJ", category: "Hormone Replacement", dosageForm: "Injectable solution", route: "IM Injection", isSterile: true, defaultBudDays: 90, storageConditions: "Room temperature, protect from light" } }),
    prisma.formula.create({ data: { name: "Gabapentin/Ketamine/Lidocaine 6/10/5% Cream", formulaCode: "GKL-61050-CRM", category: "Pain Management", dosageForm: "Cream", route: "Topical", defaultBudDays: 90, storageConditions: "Room temperature" } }),
    prisma.formula.create({ data: { name: "LDN (Low Dose Naltrexone) 4.5mg Capsules", formulaCode: "LDN-45-CAP", category: "Immunology", dosageForm: "Capsule", route: "Oral", defaultBudDays: 180, storageConditions: "Room temperature, dry" } }),
  ]);
  console.log(`  ✓ ${formulas.length} formulas`);

  // ─── 12. FORMULA VERSIONS + INGREDIENTS ──────────────
  console.log("Creating formula versions and ingredients...");
  const fv1 = await prisma.formulaVersion.create({
    data: {
      formulaId: formulas[0].id,
      versionNumber: 1,
      effectiveDate: new Date("2025-01-01"),
      baseCost: 12.50,
      price: 45.00,
      pricingMethod: "cost_plus",
      ingredients: {
        create: [
          { itemId: items[0].id, quantity: 100, unit: "mg", isActiveIngredient: true, sortOrder: 1 },
        ],
      },
      steps: {
        create: [
          { stepNumber: 1, instruction: "Weigh progesterone powder using analytical balance", durationMinutes: 5 },
          { stepNumber: 2, instruction: "Add appropriate filler (Avicel PH-102) to capsule weight", durationMinutes: 3 },
          { stepNumber: 3, instruction: "Geometric dilution and mix thoroughly for 5 minutes", durationMinutes: 5 },
          { stepNumber: 4, instruction: "Fill capsules using capsule filling machine, size 1", durationMinutes: 10 },
          { stepNumber: 5, instruction: "Verify weight uniformity (±5% of target)", requiresPharmacist: true, durationMinutes: 5 },
        ],
      },
    },
  });

  const fv4 = await prisma.formulaVersion.create({
    data: {
      formulaId: formulas[3].id,
      versionNumber: 1,
      effectiveDate: new Date("2025-01-01"),
      baseCost: 28.00,
      price: 85.00,
      pricingMethod: "cost_plus",
      ingredients: {
        create: [
          { itemId: items[3].id, quantity: 6, unit: "%", isActiveIngredient: true, sortOrder: 1 },
          { itemId: items[4].id, quantity: 10, unit: "%", isActiveIngredient: true, sortOrder: 2 },
          { itemId: items[5].id, quantity: 5, unit: "%", isActiveIngredient: true, sortOrder: 3 },
          { itemId: items[7].id, quantity: 79, unit: "%", isActiveIngredient: false, sortOrder: 4 },
        ],
      },
      steps: {
        create: [
          { stepNumber: 1, instruction: "Weigh all active ingredients on analytical balance", durationMinutes: 10 },
          { stepNumber: 2, instruction: "Weigh Lipoderm base", durationMinutes: 3 },
          { stepNumber: 3, instruction: "Levigate actives into small portion of base", durationMinutes: 5 },
          { stepNumber: 4, instruction: "Incorporate remaining base using geometric dilution", durationMinutes: 10 },
          { stepNumber: 5, instruction: "Mix in ointment mill for uniform consistency (3 passes)", durationMinutes: 15 },
          { stepNumber: 6, instruction: "Package in appropriate dispensing container", durationMinutes: 5 },
          { stepNumber: 7, instruction: "Pharmacist verification: check appearance, label, weight", requiresPharmacist: true, durationMinutes: 5 },
        ],
      },
    },
  });
  console.log(`  ✓ Formula versions and ingredients created`);

  // ─── 13. PRESCRIPTIONS ───────────────────────────────
  console.log("Creating prescriptions...");
  const rxBase = 100001;
  const prescriptions = await Promise.all([
    // Compound Rx — ready
    prisma.prescription.create({ data: { rxNumber: `${rxBase}`, patientId: patients[0].id, prescriberId: prescribers[0].id, status: "ready", source: "phone", formulaId: formulas[0].id, isCompound: true, quantityPrescribed: 90, quantityDispensed: 90, daysSupply: 90, directions: "Take 1 capsule by mouth at bedtime", refillsAuthorized: 3, refillsRemaining: 2, dateWritten: new Date(today.getFullYear(), today.getMonth() - 1, 1), dateReceived: new Date(today.getFullYear(), today.getMonth() - 1, 2), dateFilled: new Date(today.getFullYear(), today.getMonth() - 1, 3) } }),
    // Commercial Rx — dispensed
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 1}`, patientId: patients[1].id, prescriberId: prescribers[1].id, status: "dispensed", source: "erx", itemId: items[8].id, isCompound: false, quantityPrescribed: 60, quantityDispensed: 60, daysSupply: 30, directions: "Take 1 tablet by mouth twice daily with meals", refillsAuthorized: 5, refillsRemaining: 4, dateWritten: new Date(today.getFullYear(), today.getMonth(), 1), dateReceived: new Date(today.getFullYear(), today.getMonth(), 1), dateFilled: new Date(today.getFullYear(), today.getMonth(), 2) } }),
    // Compound Rx — in_progress
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 2}`, patientId: patients[2].id, prescriberId: prescribers[2].id, status: "in_progress", source: "fax", formulaId: formulas[3].id, isCompound: true, quantityPrescribed: 60, daysSupply: 30, directions: "Apply to affected area twice daily", refillsAuthorized: 2, refillsRemaining: 2, dateWritten: new Date(today.getFullYear(), today.getMonth(), 3), dateReceived: new Date(today.getFullYear(), today.getMonth(), 4) } }),
    // Rx — intake (new today)
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 3}`, patientId: patients[3].id, prescriberId: prescribers[0].id, status: "intake", source: "walkin", itemId: items[11].id, isCompound: false, quantityPrescribed: 90, daysSupply: 90, directions: "Take 1 tablet by mouth every morning on empty stomach", refillsAuthorized: 5, refillsRemaining: 5, dateWritten: new Date(), dateReceived: new Date() } }),
    // Rx — intake (new today)
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 4}`, patientId: patients[4].id, prescriberId: prescribers[3].id, status: "intake", source: "phone", formulaId: formulas[1].id, isCompound: true, quantityPrescribed: 30, daysSupply: 30, directions: "Apply 0.5mL to inner wrist daily", refillsAuthorized: 5, refillsRemaining: 5, dateWritten: new Date(), dateReceived: new Date() } }),
    // Rx — on_hold (insurance issue)
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 5}`, patientId: patients[5].id, prescriberId: prescribers[1].id, status: "on_hold", source: "erx", itemId: items[10].id, isCompound: false, quantityPrescribed: 1, daysSupply: 30, directions: "Inject 15 units subcutaneously before meals 3x daily", refillsAuthorized: 11, refillsRemaining: 11, dateWritten: new Date(today.getFullYear(), today.getMonth(), -5), dateReceived: new Date(today.getFullYear(), today.getMonth(), -4), internalNotes: "ON HOLD: Insurance prior auth required for brand Humalog" } }),
    // Compound Rx — compounding status
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 6}`, patientId: patients[6].id, prescriberId: prescribers[2].id, status: "compounding", source: "fax", formulaId: formulas[2].id, isCompound: true, quantityPrescribed: 10, daysSupply: 70, directions: "Inject 0.5mL intramuscularly once weekly", refillsAuthorized: 3, refillsRemaining: 3, dateWritten: new Date(today.getFullYear(), today.getMonth(), 1), dateReceived: new Date(today.getFullYear(), today.getMonth(), 2) } }),
    // Rx — ready for pickup
    prisma.prescription.create({ data: { rxNumber: `${rxBase + 7}`, patientId: patients[7].id, prescriberId: prescribers[0].id, status: "ready", source: "phone", itemId: items[9].id, isCompound: false, quantityPrescribed: 30, quantityDispensed: 30, daysSupply: 30, directions: "Take 1 tablet by mouth daily", refillsAuthorized: 5, refillsRemaining: 4, dateWritten: new Date(today.getFullYear(), today.getMonth(), -2), dateReceived: new Date(today.getFullYear(), today.getMonth(), -1), dateFilled: new Date(today.getFullYear(), today.getMonth(), 0) } }),
  ]);
  console.log(`  ✓ ${prescriptions.length} prescriptions`);

  // ─── 14. TAGS ────────────────────────────────────────
  console.log("Creating tags...");
  await Promise.all([
    prisma.tag.create({ data: { name: "VIP", color: "#F59E0B", tagType: "patient" } }),
    prisma.tag.create({ data: { name: "Hospice", color: "#6B7280", tagType: "patient" } }),
    prisma.tag.create({ data: { name: "Facility", color: "#3B82F6", tagType: "patient" } }),
    prisma.tag.create({ data: { name: "Urgent", color: "#EF4444", tagType: "prescription" } }),
    prisma.tag.create({ data: { name: "Cold Chain", color: "#06B6D4", tagType: "shipment" } }),
    prisma.tag.create({ data: { name: "Controlled", color: "#8B5CF6", tagType: "item" } }),
  ]);
  console.log(`  ✓ Tags created`);

  // ─── 15. STORE SETTINGS ──────────────────────────────
  console.log("Creating store settings...");
  const settingsData = [
    { settingKey: "mrn_prefix", settingValue: "BNDS", settingType: "string" },
    { settingKey: "mrn_next_number", settingValue: "9", settingType: "number" },
    { settingKey: "rx_start_number", settingValue: "100001", settingType: "number" },
    { settingKey: "batch_format", settingValue: "BYYYYMMDD-###", settingType: "string" },
    { settingKey: "default_bud_days", settingValue: "180", settingType: "number" },
    { settingKey: "ncpdp_id", settingValue: "", settingType: "string" },
  ];
  for (const s of settingsData) {
    await prisma.storeSetting.upsert({
      where: { storeId_settingKey: { storeId: store.id, settingKey: s.settingKey } },
      update: { settingValue: s.settingValue },
      create: { storeId: store.id, ...s },
    });
  }
  console.log(`  ✓ Store settings configured`);

  console.log("\n✅ Seed complete! Database populated with realistic pharmacy data.\n");
  console.log("Summary:");
  console.log(`  • 1 store (Boudreaux's Compounding Pharmacy)`);
  console.log(`  • ${roles.length} roles`);
  console.log(`  • ${prescribers.length} prescribers`);
  console.log(`  • ${plans.length} insurance plans`);
  console.log(`  • ${suppliers.length} suppliers`);
  console.log(`  • ${items.length} items (ingredients + commercial)`);
  console.log(`  • ${lots.length} inventory lots`);
  console.log(`  • ${patients.length} patients (with addresses, phones, insurance)`);
  console.log(`  • ${formulas.length} compound formulas (with versions, ingredients, steps)`);
  console.log(`  • ${prescriptions.length} prescriptions (mixed statuses)`);
  console.log(`  • 6 tags`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
