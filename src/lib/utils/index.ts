// Re-export the centralized formatters so existing imports keep working.
// New code should import from "@/lib/utils/formatters" directly.
export {
  toTitleCase,
  formatPatientName,
  formatPrescriberName,
  formatDrugName,
  formatFillNumber,
  formatDate,
  formatDOB,
  formatDateTime,
  formatDateRelative,
} from "./formatters";

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Validate that a phone number isn't an obvious placeholder.
 *
 * We do NOT reject every 555 number — real numbers exist with that exchange.
 * We only catch:
 *   - The official "fictional" range: 555-555-0100 through 555-555-0199
 *   - Any 555-prefix exchange whose subscriber starts "01" (the Hollywood pattern)
 *   - Runs of identical digits, e.g. (555) 555-5555 or (111) 111-1111
 *
 * Returns null when the number looks real, otherwise a user-facing message.
 * Empty input returns null — callers decide whether phone is required.
 */
export function validatePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  // Strip an optional leading country code "1"
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) {
    return "Please enter a 10-digit phone number.";
  }

  // All identical digits: (111) 111-1111, (555) 555-5555, etc.
  if (/^(\d)\1{9}$/.test(local)) {
    return "That looks like a placeholder phone — please enter a real number.";
  }

  const exchange = local.slice(3, 6);
  const subscriber = local.slice(6, 10);

  // 555-555-0100 through 555-555-0199 (FCC fictional range)
  // Any 555-exchange number with subscriber starting "01" — the canonical
  // "fake number for movies / TV" pattern. Real 555 numbers don't begin 01XX.
  if (exchange === "555" && subscriber.startsWith("01")) {
    return "That looks like a placeholder phone — please enter a real number.";
  }

  return null;
}

/**
 * Calculate age from date of birth.
 *
 * Uses UTC parts on the birth date because Prisma maps Postgres DATE
 * to UTC midnight. Reading getFullYear() in any negative-UTC zone
 * would shift the birthday back one calendar day and round age down
 * incorrectly on the user's actual birthday.
 */
export function calculateAge(dob: Date | string): number {
  const birthDate = typeof dob === "string" ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getUTCDate())
  ) {
    age--;
  }
  return age;
}

/**
 * Get initials from a name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Combine class names (simple cn utility)
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}
