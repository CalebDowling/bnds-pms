import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatPhone,
  calculateAge,
  getInitials,
  cn,
} from "@/lib/utils/index";

describe("formatDate", () => {
  it("returns dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats a Date object", () => {
    // Use explicit time to avoid timezone shifting
    const result = formatDate(new Date("2024-01-15T12:00:00"));
    expect(result).toMatch(/01\/15\/2024/);
  });

  it("formats a date string", () => {
    const result = formatDate("2023-12-25T12:00:00");
    expect(result).toMatch(/12\/25\/2023/);
  });
});

describe("formatPhone", () => {
  it("formats a 10-digit number", () => {
    expect(formatPhone("3185551234")).toBe("(318) 555-1234");
  });

  it("formats an 11-digit number starting with 1", () => {
    expect(formatPhone("13185551234")).toBe("(318) 555-1234");
  });

  it("strips non-digit characters", () => {
    expect(formatPhone("(318) 555-1234")).toBe("(318) 555-1234");
  });

  it("returns original for non-standard length", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
});

describe("calculateAge", () => {
  it("calculates age from a past date", () => {
    const age = calculateAge("1990-01-01");
    expect(age).toBeGreaterThanOrEqual(35);
    expect(age).toBeLessThanOrEqual(37);
  });

  it("handles Date object input", () => {
    const age = calculateAge(new Date("2000-06-15"));
    expect(age).toBeGreaterThanOrEqual(25);
    expect(age).toBeLessThanOrEqual(26);
  });
});

describe("getInitials", () => {
  it("returns uppercase initials", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
  });

  it("handles lowercase input", () => {
    expect(getInitials("caleb", "dowling")).toBe("CD");
  });
});

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("returns empty string for no truthy values", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
