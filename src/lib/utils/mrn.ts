import { prisma } from "@/lib/prisma";

/**
 * Format a numeric value as an MRN string.
 * Format: BNDS-XXXXXXX (7-digit sequential).
 */
export function formatMRN(n: number): string {
  return `BNDS-${n.toString().padStart(7, "0")}`;
}

/**
 * Read the next candidate MRN sequence number from the database.
 * Returns the integer that should be tried next; the caller is responsible
 * for formatting it (via formatMRN) and for incrementing locally on
 * unique-constraint collisions rather than re-calling this function —
 * a re-call would just return the same number, since a failed insert
 * doesn't bump the max.
 *
 * NOTE: ordering on a VARCHAR `mrn` is lexicographic, but every MRN
 * shares the `BNDS-XXXXXXX` shape with a fixed-width zero-padded suffix,
 * so lex-desc and numeric-desc agree here. (Compare with rxNumber, where
 * variable-width digit-only strings break this assumption.)
 */
export async function nextMRNSeed(): Promise<number> {
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });

  if (lastPatient?.mrn) {
    const match = lastPatient.mrn.match(/BNDS-(\d+)/);
    if (match) {
      return parseInt(match[1], 10) + 1;
    }
  }
  return 1;
}

/**
 * Convenience wrapper preserved for callers that don't need retry logic.
 * Equivalent to `formatMRN(await nextMRNSeed())`.
 */
export async function generateMRN(): Promise<string> {
  return formatMRN(await nextMRNSeed());
}
