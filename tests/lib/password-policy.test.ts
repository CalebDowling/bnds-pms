import { describe, it, expect } from "vitest";
import { validatePassword, getPasswordStrength } from "@/lib/password-policy";

describe("password-policy", () => {
  it("rejects passwords shorter than 12 characters", () => {
    const result = validatePassword("Short1!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Must be at least 12 characters");
  });

  it("rejects passwords without uppercase", () => {
    const result = validatePassword("alllowercase1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
  });

  it("rejects passwords without lowercase", () => {
    const result = validatePassword("ALLUPPERCASE1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
  });

  it("rejects passwords without numbers", () => {
    const result = validatePassword("NoNumbersHere!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("number"))).toBe(true);
  });

  it("rejects passwords without special characters", () => {
    const result = validatePassword("NoSpecials123A");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("special"))).toBe(true);
  });

  it("accepts a strong password", () => {
    const result = validatePassword("MyStr0ngP@ss!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns multiple errors for very weak passwords", () => {
    const result = validatePassword("abc");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("getPasswordStrength scores correctly", () => {
    expect(getPasswordStrength("")).toBe(0);
    expect(getPasswordStrength("MyStr0ngP@ss!")).toBeGreaterThanOrEqual(3);
    expect(getPasswordStrength("short")).toBe(0);
  });
});
