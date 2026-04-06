/**
 * DRX → BNDS Full Data Import
 *
 * Usage:
 *   npx tsx scripts/drx-import.ts                    # Import everything
 *   npx tsx scripts/drx-import.ts --only doctors     # Import one entity
 *   npx tsx scripts/drx-import.ts --only patients    # Import one entity
 *   npx tsx scripts/drx-import.ts --only items       # Import one entity
 *   npx tsx scripts/drx-import.ts --test             # Test DRX connection
 *
 * Prerequisites:
 *   - Set DRX_API_KEY in .env.local
 *   - Set DRX_BASE_URL in .env.local (or use default)
 *   - Database must be migrated (npx prisma db push)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { testConnection } from "../src/lib/drx/client";
import {
  importDoctors,
  importItems,
  importPatients,
  type ImportProgress,
} from "../src/lib/drx/importers";

const prisma = new PrismaClient();

function logProgress(p: ImportProgress) {
  const pct =
    p.endId > 0 ? Math.round((p.current / p.endId) * 100) : 0;
  process.stdout.write(
    `\r  [${p.entity}] ID ${p.current}/${p.endId} (${pct}%) — ` +
      `${p.imported} imported, ${p.skipped} skipped, ${p.errors} errors, ${p.found} found`
  );
}

function printSummary(label: string, result: ImportProgress) {
  console.log(); // newline after \r progress
  const icon = result.errors > 0 ? "!!" : "OK";
  console.log(
    `${icon} ${label}: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors (${result.found} found in DRX)`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const testOnly = args.includes("--test");
  const onlyEntity = args.find((a, i) => args[i - 1] === "--only");
  const startIdArg = args.find((a, i) => args[i - 1] === "--start-id");
  const startId = startIdArg ? parseInt(startIdArg, 10) : undefined;

  console.log("\n========================================");
  console.log("  DRX -> BNDS Pharmacy Data Import");
  console.log("========================================\n");

  // Check env
  if (!process.env.DRX_API_KEY) {
    console.error("ERROR: DRX_API_KEY not set in environment. Add it to .env.local");
    process.exit(1);
  }

  const baseUrl =
    process.env.DRX_BASE_URL ||
    "https://boudreaux.drxapp.com/api/v1";
  console.log(`DRX API: ${baseUrl}`);

  // Test connection
  console.log("\nTesting DRX connection...");
  const connected = await testConnection();
  if (!connected) {
    console.error("ERROR: Cannot reach DRX API. Check DRX_API_KEY and DRX_BASE_URL.");
    process.exit(1);
  }
  console.log("DRX connection successful\n");

  if (testOnly) {
    await prisma.$disconnect();
    return;
  }

  const shouldImport = (entity: string) =>
    !onlyEntity || onlyEntity === entity;

  const results: Record<string, ImportProgress> = {};
  const startTime = Date.now();

  // Import order: doctors (prescribers) & items before patients
  if (shouldImport("doctors")) {
    console.log("--- Importing Doctors -> Prescribers ---");
    results.doctors = await importDoctors(prisma, logProgress);
    printSummary("Doctors", results.doctors);
    console.log();
  }

  if (shouldImport("items")) {
    console.log("--- Importing Items / Drug Catalog ---");
    results.items = await importItems(prisma, logProgress);
    printSummary("Items", results.items);
    console.log();
  }

  if (shouldImport("patients")) {
    console.log("--- Importing Patients (with phones, addresses, insurance) ---");
    results.patients = await importPatients(prisma, logProgress, startId);
    printSummary("Patients", results.patients);
    console.log();
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalImported = Object.values(results).reduce(
    (sum, r) => sum + r.imported,
    0
  );
  const totalErrors = Object.values(results).reduce(
    (sum, r) => sum + r.errors,
    0
  );

  console.log("========================================");
  console.log(`Import complete in ${elapsed}s`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log("========================================\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal import error:", e);
  prisma.$disconnect();
  process.exit(1);
});
