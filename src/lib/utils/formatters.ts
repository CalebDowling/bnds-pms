/**
 * Display formatters for the PMS UI and label pipeline.
 *
 * Goal: a single source of truth for how patient/prescriber/drug names,
 * dates, and fill numbers render to humans. The DRX legacy feed is a
 * mix of ALL CAPS, mixed case, and inconsistent ordering; database
 * values are stored as-imported so we never destroy provenance, and
 * every UI/print surface should funnel through these helpers.
 *
 * Pure functions — no Prisma, no I/O. Safe to import from server
 * components, client components, server actions, and the label
 * renderer alike.
 */

// ─── Names ────────────────────────────────────────────────────────────

/**
 * Known DRX category suffixes — patient bucket / wristband-color tags
 * the legacy feed sometimes glues onto the lastName. Treated as
 * trailing artifacts regardless of whether they're separated by a
 * space-dash-space (`Richie - white`) or a bare dash (`Richie-white`).
 *
 * Kept as an explicit allowlist so legitimate hyphenated surnames
 * ("Hardwick-Smith", "Smith-Jones", "Day-Lewis") and short legitimate
 * tokens that happen to be lowercase ("de la Cruz") never get clipped.
 * Add new tokens here only after confirming with the operator that
 * they're a DRX bucket, not part of someone's actual name.
 */
const DRX_CATEGORY_SUFFIXES = new Set([
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "group",
]);

/**
 * Strip DRX-import artifacts that the legacy feed embeds inside name
 * fields. Two shapes seen in real data:
 *
 *   1. `*WORD*` ALL-CAPS asterisk-wrapped tokens used as specialty /
 *      group / form markers. Example: "Boston *SP**GROUP*",
 *      "Stanga *SYR**SP*". These belong in a separate metadata field
 *      but DRX sometimes splices them into firstName / lastName.
 *
 *   2. Trailing `-categoryword` patient-bucket tags. Examples:
 *      "Bridget Richie - white"   (space-dash-space)
 *      "Bridget Richie-white"     (bare dash, no spaces)
 *      The "white"/"red"/"group"/etc. is a DRX patient bucket
 *      (probably for label / wristband color), not part of the legal
 *      name. We strip both shapes when the suffix matches a known
 *      DRX_CATEGORY_SUFFIX, so legitimate hyphenated surnames
 *      ("Hardwick-Smith", "Day-Lewis") survive untouched.
 *
 * Called by formatPatientName / formatPrescriberName so every UI
 * surface that goes through the standard formatters automatically
 * loses the artifacts. Underlying DB values are never mutated —
 * provenance is preserved for the next sync pass.
 */
export function cleanDrxArtifacts(s: string | null | undefined): string {
  if (!s) return "";
  let out = s
    // *WORD* … *WORD* … runs anywhere in the string. Match a sequence of
    // asterisk-delimited ALL-CAPS tokens (with the optional leading
    // whitespace consumed too) so "Boston *SP**GROUP*" → "Boston".
    .replace(/\s*(?:\*[A-Z][A-Z0-9_]*\*+)+/g, " ");

  // Trailing DRX category suffix — both space-dash-space and bare-dash
  // shapes. Only strip when the suffix is in the known DRX bucket set,
  // so hyphenated surnames are preserved.
  const suffixMatch = out.match(/^(.*?)\s*-\s*([a-z]+)\s*$/);
  if (suffixMatch && DRX_CATEGORY_SUFFIXES.has(suffixMatch[2])) {
    out = suffixMatch[1];
  }

  return out.replace(/\s+/g, " ").trim();
}

/**
 * Convert ALL CAPS / lowercase / mixed-case names into Title Case.
 *
 * Handles middle initials, hyphenated names ("Smith-Jones"), and
 * apostrophes ("O'Brien"). Preserves whitespace runs so commas /
 * spaces in source data don't get collapsed.
 *
 * Pure formatter — never mutates DB values.
 */
export function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  // Trim leading/trailing whitespace and collapse internal whitespace runs
  // BEFORE casing. Raw DRX-imported values sometimes carry a trailing space
  // (e.g. "JESSICA ") which would otherwise bleed through into combined-name
  // keys as a double space ("Jessica  Anter"). Names should never have
  // significant runs of whitespace; collapsing here keeps the formatter as a
  // single source of truth for all surfaces.
  return s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .map((token) => {
      if (!token) return token;
      return token.replace(/([A-Za-z])([A-Za-z'-]*)/g, (_, first: string, rest: string) => {
        const head = first.toUpperCase();
        const tail = rest.replace(/([-'])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
        return head + tail;
      });
    })
    .join(" ");
}

export interface PatientNameInput {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  middleName?: string | null;
}

/**
 * Format a patient name for display.
 *   - "first-last":    "John Smith"           (default — UI cards/headers)
 *   - "last-first":    "Smith, John"          (lists, sortable columns)
 *   - "last-first-mi": "Smith, John P"        (label patient block)
 */
export function formatPatientName(
  patient: PatientNameInput | null | undefined,
  opts: { format?: "first-last" | "last-first" | "last-first-mi" } = {}
): string {
  if (!patient) return "";
  // cleanDrxArtifacts before title-casing so we don't carry the noise
  // through (e.g. "Richie - white" must collapse to "Richie" before we
  // try to detect hyphenated surnames).
  const first = toTitleCase(cleanDrxArtifacts(patient.firstName));
  const last = toTitleCase(cleanDrxArtifacts(patient.lastName));
  const middle = toTitleCase(cleanDrxArtifacts(patient.middleName));
  const format = opts.format ?? "first-last";
  if (!first && !last) return "";
  switch (format) {
    case "last-first":
      return last && first ? `${last}, ${first}` : last || first;
    case "last-first-mi": {
      const mi = middle ? ` ${middle.charAt(0)}` : "";
      return last && first ? `${last}, ${first}${mi}` : last || first;
    }
    case "first-last":
    default:
      return [first, middle, last].filter(Boolean).join(" ");
  }
}

export interface PrescriberNameInput {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  credentials?: string | null;
}

/**
 * Format a prescriber name. Default: "Dr. John Smith". When the
 * prescriber record carries credentials (MD, DO, NP, PA-C, etc.),
 * we trust those over the "Dr." prefix.
 */
export function formatPrescriberName(
  prescriber: PrescriberNameInput | null | undefined,
  opts: { withCredentials?: boolean; withPrefix?: boolean } = {}
): string {
  if (!prescriber) return "";
  // Same DRX-artifact cleanup as patient names — DRX often splices
  // "*SP**GROUP*"-shaped specialty markers directly into lastName.
  const first = toTitleCase(cleanDrxArtifacts(prescriber.firstName));
  const last = toTitleCase(cleanDrxArtifacts(prescriber.lastName));
  const creds = prescriber.credentials?.trim().toUpperCase() || "";
  const withCreds = opts.withCredentials ?? true;
  const withPrefix = opts.withPrefix ?? true;
  if (!first && !last) return "";
  const base = [first, last].filter(Boolean).join(" ");
  if (withCreds && creds) return `${base}, ${creds}`;
  if (withPrefix) return `Dr. ${base}`;
  return base;
}

/**
 * Format a prescriber specialty / type string from the DRX feed.
 *
 * The DRX feed encodes prescriber types with literal asterisks as
 * delimiters (and sometimes as wrappers), so a record can ship with
 * `"*Syr**Sp*"` meaning "Surgery, Sp(ecialist)". Rendering that raw
 * gives a hostile "*Syr**Sp*" on the prescriber sidebar.
 *
 * We:
 *   - strip leading/trailing whitespace
 *   - split on runs of one-or-more asterisks (so "*A**B*" → ["A","B"])
 *   - drop empties (so "**A**" → ["A"])
 *   - title-case each token (so "DERM" → "Derm")
 *   - join with ", "
 *
 * If the input has no asterisks, just title-case it.
 */
export function formatSpecialty(specialty: string | null | undefined): string {
  if (!specialty) return "";
  const tokens = specialty
    .split(/\*+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map(toTitleCase).join(", ");
}

/**
 * Title-case a drug / item name. Special-cases common dosage form
 * tokens (mg, ML, MG/ML, etc.) and DEA-schedule indicators so they
 * stay uppercase / lower-case as expected.
 *
 * Also strips CSV-escape artifacts the legacy import sometimes leaves
 * embedded in name strings — `"foo""bar"` shapes from a CSV cell that
 * was double-quoted by the source system. The walkthrough caught
 * "Bd 3 ml Syringe 25Gx1-1/2""" "25 gauge X 1 1/2"""" as a real value
 * in production. Stripping at display time is preferable to a one-off
 * data migration because it's idempotent and forward-compatible: any
 * future re-import of dirty CSV data still renders cleanly.
 */
export function formatDrugName(name: string | null | undefined): string {
  if (!name) return "";
  // Strip CSV-escape artifacts: collapse runs of quotes (`""""` → ``),
  // and drop leading/trailing single quotes that were CSV cell
  // delimiters. Real drug names never include literal double-quote
  // characters, so this is safe.
  const dequoted = name.replace(/"+/g, "").trim();
  // Split off bracketed/parenthesized clauses so we can title-case
  // the human-readable portion without mangling, e.g. dosage "mg".
  const titled = toTitleCase(dequoted);
  // Re-normalize unit tokens that title-case will have mis-cased.
  return titled
    .replace(/\b(Mg|Mcg|Ml|G|Iu|Mmol|Mg\/Ml|Mcg\/Ml|Mg\/Hr|Mg\/Kg)\b/g, (m) => m.toLowerCase())
    .replace(/\bMg\/Ml\b/gi, "mg/mL")
    .replace(/\bMcg\/Ml\b/gi, "mcg/mL")
    .replace(/\bMg\/Hr\b/gi, "mg/hr")
    .replace(/\bIu\b/g, "IU")
    .replace(/\bHcl\b/g, "HCl")
    .replace(/\bEr\b/g, "ER")
    .replace(/\bXr\b/g, "XR")
    .replace(/\bSr\b/g, "SR")
    .replace(/\bIr\b/g, "IR")
    .replace(/\bOdt\b/g, "ODT");
}

/**
 * Compose a drug display label from `name` + optional `strength`, suppressing
 * the strength suffix when it's already embedded inside the name.
 *
 * The DRX feed often stores the strength inside `name` (e.g.
 * "Lisinopril 1.25 mg Capsule") AND repeats it in the dedicated `strength`
 * column ("1.25 MG"). A naive `${name} ${strength}` concat then renders
 * "Lisinopril 1.25 mg Capsule 1.25 MG", which looks like a typo to a
 * pharmacist. This formatter normalises both sides (case-insensitive,
 * whitespace-collapsed, units stripped of separators) and skips the suffix
 * when the strength is already represented in the name.
 *
 * Used by the drug picker (intake) AND the Rx detail header so they render
 * the same composed label everywhere.
 */
export function formatDrugWithStrength(
  name: string | null | undefined,
  strength: string | null | undefined
): string {
  const formattedName = formatDrugName(name);
  if (!strength) return formattedName;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const stripUnits = (s: string) => normalize(s).replace(/[\s.]+/g, "");
  const nameNorm = stripUnits(formattedName);
  const strengthNorm = stripUnits(strength);
  // Strength already embedded in name — don't repeat.
  if (strengthNorm && nameNorm.includes(strengthNorm)) return formattedName;
  return `${formattedName} ${strength}`;
}

/**
 * Resolve a usable drug display name from a DRX-imported Item.
 *
 * The DRX feed occasionally lands a `name` that is empty, all-numeric, or
 * a junk fragment like `"Fl"` (truncated form indicator that the DRX feed
 * sometimes returns when the canonical product description failed to load).
 * Rendering "Fl" in the queue / detail header looks like a bug to a
 * pharmacist — we'd rather fall through to genericName, brandName, or the
 * NDC than display garbage.
 *
 * Heuristic for "junk":
 *   - empty / whitespace-only
 *   - 3 chars or fewer AND no digit (real drug abbreviations like "5HT" or
 *     "B12" are kept; standalone two-letter form indicators like "Fl",
 *     "Tb", "Cp" are rejected)
 *
 * Falls back through: genericName → brandName → NDC → "Unknown drug".
 * Note: we DO NOT mutate the underlying Item — this is a display-time
 * formatter so DRX provenance stays intact for the next sync pass.
 */
export function formatItemDisplayName(item: {
  name: string | null | undefined;
  genericName?: string | null;
  brandName?: string | null;
  ndc?: string | null;
}): string {
  const isJunk = (s: string | null | undefined): boolean => {
    if (!s) return true;
    const trimmed = s.trim();
    if (trimmed.length === 0) return true;
    // 3 or fewer chars and no digits = likely a truncated/corrupt fragment
    // ("Fl", "Tb", "Rx") — accept if it has a digit ("B12", "5HT") because
    // those are real drug abbreviations.
    if (trimmed.length <= 3 && !/\d/.test(trimmed)) return true;
    return false;
  };

  if (!isJunk(item.name)) return formatDrugName(item.name);
  if (!isJunk(item.genericName)) return formatDrugName(item.genericName);
  if (!isJunk(item.brandName)) return formatDrugName(item.brandName);
  if (item.ndc) return `NDC ${item.ndc}`;
  return "Unknown drug";
}

// ─── Fill numbers ─────────────────────────────────────────────────────

/**
 * Display a fill sequence number. The DRX feed and intake flow can
 * temporarily store `0` for an in-progress fill (the first fill is
 * conceptually #1 from a patient/pharmacist perspective). Anything
 * less than 1 is normalized to 1.
 */
export function formatFillNumber(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n) || n < 1) return 1;
  return Math.floor(n);
}

// ─── Dates ────────────────────────────────────────────────────────────
//
// Convention: every date the UI shows is formatted as **MM/DD/YYYY** (2-digit
// month and day, 4-digit year) — the standard for US pharmacy / medical
// contexts. Both `formatDate` and `formatDateTime` enforce this; do NOT use
// raw `new Date(...).toLocaleString()` in the UI, which produces
// "4/26/2026" (1-digit month) and would render inconsistently next to
// values that go through these helpers ("04/26/2026").

/**
 * Format a date-only field (DOB, written date, expiration, etc.) as
 * `MM/DD/YYYY` using UTC parts.
 *
 * Why UTC: Prisma maps Postgres DATE → JS Date as UTC midnight. If we
 * formatted via toLocaleDateString in any negative-UTC zone, we'd
 * render the previous calendar day. By reading getUTC* parts directly
 * we keep the printed date identical to what the user typed.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = String(d.getUTCFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Explicit DOB formatter — same as formatDate but signals intent to
 * readers (and lets us evolve DOB rendering without touching every call).
 */
export function formatDOB(date: Date | string | null | undefined): string {
  return formatDate(date);
}

/**
 * Format a timestamp (sold-at, created-at, label-printed-at, etc.) as
 * `MM/DD/YYYY, h:mm AM/PM` in the user's local zone. Use this for events,
 * NOT for date-only fields like DOB.
 *
 * Always emits 2-digit month and day so it lines up with formatDate
 * elsewhere on the same panel (e.g. Fill Details > "Sold at" /
 * "Created").
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date-only value relative to today ("Today", "Yesterday",
 * or M/D/YYYY for older dates). Uses UTC parts for the absolute case
 * to match formatDate.
 */
export function formatDateRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const utcDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const todayUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((todayUtcDay - utcDay) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  return formatDate(d);
}

/**
 * Format a past date as a humanised "time ago" string for list cells:
 *   Today / Yesterday / N days ago / N weeks ago / N months ago / N years ago
 *
 * This is the format the BNDS PMS Redesign uses in the Patients "Last fill"
 * column and the Prescriptions "Filled" column. For future dates we fall
 * back to the absolute formatDate so we don't print "in 3 days".
 */
export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  const now = new Date();
  const utcDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const todayUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((todayUtcDay - utcDay) / 86_400_000);

  if (diffDays < 0) return formatDate(d); // future — fall back to absolute
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "1 month ago";
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 730) return "1 year ago";
  return `${Math.floor(diffDays / 365)} years ago`;
}
