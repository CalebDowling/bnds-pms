import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv, requireEnv, env } from "@/lib/env";

describe("validateEnv", () => {
  it("returns valid when all required vars are set", () => {
    // setup.ts sets all required vars
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("detects missing required variables", () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("DATABASE_URL");

    process.env.DATABASE_URL = original;
  });
});

describe("requireEnv", () => {
  it("does not throw when all vars are present", () => {
    expect(() => requireEnv()).not.toThrow();
  });

  it("throws with descriptive message when vars are missing", () => {
    const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => requireEnv()).toThrow("Missing required environment variables");
    expect(() => requireEnv()).toThrow("SUPABASE_SERVICE_ROLE_KEY");

    process.env.SUPABASE_SERVICE_ROLE_KEY = original;
  });
});

describe("env helpers", () => {
  it("returns supabase URL from env", () => {
    expect(env.supabaseUrl()).toBe("https://test.supabase.co");
  });

  it("returns app URL with fallback", () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(env.appUrl()).toBe("http://localhost:3000");
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it("returns DRX base URL with fallback", () => {
    expect(env.drxBaseUrl()).toBe(
      "https://boudreaux.drxapp.com/external_api/v1"
    );
  });
});
