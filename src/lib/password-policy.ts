/**
 * Password Policy — HIPAA-compliant password requirements
 */

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

const MIN_LENGTH = 12;

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Must be at least ${MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push("Must contain at least one special character");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get password strength score (0-4)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= MIN_LENGTH) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score++;
  return score;
}

export const PASSWORD_REQUIREMENTS = [
  `At least ${MIN_LENGTH} characters`,
  "At least one uppercase letter (A-Z)",
  "At least one lowercase letter (a-z)",
  "At least one number (0-9)",
  "At least one special character (!@#$%...)",
];
