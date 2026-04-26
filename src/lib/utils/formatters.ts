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
  return s
    .toLowerCase()
    .split(/(\s+)/) // preserve whitespace runs
    .map((token) => {
      if (!token.trim()) return token;
      return token.replace(/([A-Za-z])([A-Za-z'-]*)/g, (_, first: string, rest: string) => {
        const head = first.toUpperCase();
        const tail = rest.replace(/([-'])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
        return head + tail;
      });
    })
    .join("");
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
  const first = toTitleCase(patient.firstName);
  const last = toTitleCase(patient.lastName);
  const middle = toTitleCase(patient.middleName);
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
  const first = toTitleCase(prescriber.firstName);
  const last = toTitleCase(prescriber.lastName);
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
 * Title-case a drug / item name. Special-cases common dosage form
 * tokens (mg, ML, MG/ML, etc.) and DEA-schedule indicators so they
 * stay uppercase / lower-case as expected.
 */
export function formatDrugName(name: string | null | undefined): string {
  if (!name) return "";
  // Split off bracketed/parenthesized clauses so we can title-case
  // the human-readable portion without mangling, e.g. dosage "mg".
  const titled = toTitleCase(name);
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

/**
 * Format a date-only field (DOB, written date, expiration, etc.) using
 * UTC parts.
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
 * Format a timestamp (sold-at, created-at, label-printed-at, etc.)
 * in the user's local zone. Use this for events, NOT for date-only
 * fields like DOB.
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
