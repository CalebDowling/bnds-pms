/**
 * DEA controlled-substance helpers.
 *
 * Single source of truth for "is this drug a controlled substance?". The
 * DEA schedule (`Item.deaSchedule`) is a VARCHAR(5) in the schema and DRX
 * delivers it in several inconsistent shapes:
 *
 *   "II"   "III"   "IV"   "V"           ← Schedule II–V
 *   "C-II" "C-III" "C-IV" "C-V"         ← prefixed form
 *   "CII"  "CIII"  "CIV"  "CV"          ← prefixed-no-dash
 *   "2"    "3"     "4"    "5"           ← occasional numeric form
 *   null   ""                            ← non-controlled
 *
 * Combined with `Item.isControlled` (boolean) which DRX sometimes sets and
 * sometimes leaves false even for genuine controls, the rule needs to be:
 *
 *   isControlledDrug = isControlled OR schedule looks like II/III/IV/V
 *                       in any of the recognized shapes.
 *
 * Three places used to roll their own — `process/[fillId]/page.tsx` had
 * `deaSchedule >= 2` (broken: "II" >= 2 is false, controls slipped past
 * the client-side ID gate); `actions.ts` had a simplified
 * `deaSchedule != null` check; and `signature-capture.ts` used a subset
 * list. They've been consolidated into this helper so a fix lands once.
 *
 * Pure function — no DB, no I/O. Safe to import from server components,
 * server actions, and client components alike.
 */

const SCHEDULE_NUMERALS = ["II", "III", "IV", "V"] as const;

export interface ControlledDrugInput {
  isControlled?: boolean | null;
  deaSchedule?: string | null;
}

/**
 * Returns true if the drug is a DEA Schedule II–V controlled substance.
 *
 * Checks the explicit `isControlled` flag first, then falls back to
 * pattern-matching the schedule string. Whitespace and case are
 * normalized before matching.
 */
export function isControlledDrug(drug: ControlledDrugInput | null | undefined): boolean {
  if (!drug) return false;
  if (drug.isControlled) return true;
  return parseDeaScheduleNumeral(drug.deaSchedule) != null;
}

/**
 * Extract the bare numeral ("II", "III", "IV", "V") from a deaSchedule
 * value, regardless of formatting (prefixed "C-II", numeric "2", etc.).
 *
 * Returns null when the input isn't a recognized controlled-substance
 * schedule. Useful for badges / labels that want to render "C-II" once
 * without doubling up on the prefix when DRX already includes it.
 */
export function parseDeaScheduleNumeral(
  schedule: string | null | undefined
): (typeof SCHEDULE_NUMERALS)[number] | null {
  if (!schedule) return null;
  const cleaned = schedule.toUpperCase().trim().replace(/^C[-\s]?/, "");
  if (cleaned === "2") return "II";
  if (cleaned === "3") return "III";
  if (cleaned === "4") return "IV";
  if (cleaned === "5") return "V";
  if ((SCHEDULE_NUMERALS as readonly string[]).includes(cleaned)) {
    return cleaned as (typeof SCHEDULE_NUMERALS)[number];
  }
  return null;
}

/**
 * Format the DEA schedule for badge display: always "C-II" / "C-III" /
 * "C-IV" / "C-V". Returns null for non-controlled or unparseable input
 * so callers can skip rendering the badge entirely.
 *
 * Replaces the old `C-{deaSchedule || "II"}` template that produced
 * "C-C-II" when DRX already prefixed the value, and lied with "C-II"
 * when the schedule was null.
 */
export function formatDeaScheduleBadge(
  schedule: string | null | undefined
): string | null {
  const numeral = parseDeaScheduleNumeral(schedule);
  return numeral ? `C-${numeral}` : null;
}

/**
 * Returns true ONLY for Schedule II — the strictest tier (no refills,
 * harder ID checks, paper-only in some states). Useful for the C-II
 * pill that callers render alongside the "Controlled" badge.
 */
export function isScheduleII(drug: ControlledDrugInput | null | undefined): boolean {
  if (!drug) return false;
  return parseDeaScheduleNumeral(drug.deaSchedule) === "II";
}
