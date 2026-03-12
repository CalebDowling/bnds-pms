import { prisma } from "@/lib/prisma";

/**
 * Generate the next MRN (Medical Record Number)
 * Format: BNDS-XXXXXXX (7-digit sequential)
 */
export async function generateMRN(): Promise<string> {
  // Get the highest existing MRN
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });

  let nextNumber = 1;
  if (lastPatient?.mrn) {
    const match = lastPatient.mrn.match(/BNDS-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `BNDS-${nextNumber.toString().padStart(7, "0")}`;
}
