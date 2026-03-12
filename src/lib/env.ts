/**
 * Environment variable validation.
 * Import this at app startup to fail fast on missing config.
 */

const requiredVars = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const optionalVars = [
  "DIRECT_URL",
  "NEXT_PUBLIC_APP_URL",
  "DRX_API_KEY",
  "DRX_BASE_URL",
  "WC_CONSUMER_KEY",
  "WC_CONSUMER_SECRET",
  "WC_BASE_URL",
] as const;

type RequiredVar = (typeof requiredVars)[number];
type OptionalVar = (typeof optionalVars)[number];

function getEnvVar(name: RequiredVar): string;
function getEnvVar(name: OptionalVar): string | undefined;
function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const name of requiredVars) {
    if (!getEnvVar(name)) {
      missing.push(name);
    }
  }

  return { valid: missing.length === 0, missing };
}

export function requireEnv(): void {
  const { valid, missing } = validateEnv();
  if (!valid) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\nSee .env.local.example for reference.`
    );
  }
}

export const env = {
  // Database
  databaseUrl: () => getEnvVar("DATABASE_URL"),
  directUrl: () => getEnvVar("DIRECT_URL"),

  // Supabase
  supabaseUrl: () => getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),

  // App
  appUrl: () => getEnvVar("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",

  // DRX Integration
  drxApiKey: () => getEnvVar("DRX_API_KEY"),
  drxBaseUrl: () =>
    getEnvVar("DRX_BASE_URL") ||
    "https://boudreaux.drxapp.com/external_api/v1",

  // WooCommerce
  wcConsumerKey: () => getEnvVar("WC_CONSUMER_KEY"),
  wcConsumerSecret: () => getEnvVar("WC_CONSUMER_SECRET"),
  wcBaseUrl: () =>
    getEnvVar("WC_BASE_URL") || "https://boudreauxsnewdrug.com/wp-json/wc/v3",

  // Runtime
  isProduction: () => process.env.NODE_ENV === "production",
  isDevelopment: () => process.env.NODE_ENV === "development",
};
