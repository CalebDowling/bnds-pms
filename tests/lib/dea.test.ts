import { describe, it, expect } from "vitest";
import {
  isControlledDrug,
  parseDeaScheduleNumeral,
  formatDeaScheduleBadge,
  isScheduleII,
} from "@/lib/utils/dea";

describe("isControlledDrug", () => {
  it("returns false for null/undefined", () => {
    expect(isControlledDrug(null)).toBe(false);
    expect(isControlledDrug(undefined)).toBe(false);
    expect(isControlledDrug({})).toBe(false);
  });

  it("trusts the explicit isControlled flag", () => {
    expect(isControlledDrug({ isControlled: true })).toBe(true);
    expect(isControlledDrug({ isControlled: true, deaSchedule: null })).toBe(true);
  });

  it("recognizes raw numeral schedules", () => {
    for (const s of ["II", "III", "IV", "V"]) {
      expect(isControlledDrug({ deaSchedule: s })).toBe(true);
    }
  });

  it("recognizes prefixed C- schedules", () => {
    for (const s of ["C-II", "C-III", "C-IV", "C-V"]) {
      expect(isControlledDrug({ deaSchedule: s })).toBe(true);
    }
  });

  it("recognizes prefixed-no-dash CII shapes", () => {
    for (const s of ["CII", "CIII", "CIV", "CV"]) {
      expect(isControlledDrug({ deaSchedule: s })).toBe(true);
    }
  });

  it("recognizes occasional numeric form", () => {
    for (const s of ["2", "3", "4", "5"]) {
      expect(isControlledDrug({ deaSchedule: s })).toBe(true);
    }
  });

  it("normalizes whitespace and case", () => {
    expect(isControlledDrug({ deaSchedule: "  c-iii " })).toBe(true);
    expect(isControlledDrug({ deaSchedule: "ii" })).toBe(true);
  });

  it("returns false for non-controlled / unknown values", () => {
    expect(isControlledDrug({ deaSchedule: null })).toBe(false);
    expect(isControlledDrug({ deaSchedule: "" })).toBe(false);
    expect(isControlledDrug({ deaSchedule: "I" })).toBe(false); // Schedule I is illegal — never dispensed
    expect(isControlledDrug({ deaSchedule: "VI" })).toBe(false);
    expect(isControlledDrug({ deaSchedule: "OTC" })).toBe(false);
  });

  it("regression: 'II' >= 2 used to evaluate to false on the process page", () => {
    // The original bug — `fill.item?.deaSchedule >= 2` compared a string
    // to a number, NaN >= 2 → false, so DRX-imported controls slipped past
    // the client-side ID gate. The helper now handles all shapes.
    expect(isControlledDrug({ isControlled: false, deaSchedule: "II" })).toBe(true);
  });
});

describe("parseDeaScheduleNumeral", () => {
  it("returns null for empty / null / unrecognized", () => {
    expect(parseDeaScheduleNumeral(null)).toBeNull();
    expect(parseDeaScheduleNumeral(undefined)).toBeNull();
    expect(parseDeaScheduleNumeral("")).toBeNull();
    expect(parseDeaScheduleNumeral("OTC")).toBeNull();
  });

  it("parses raw numerals", () => {
    expect(parseDeaScheduleNumeral("II")).toBe("II");
    expect(parseDeaScheduleNumeral("III")).toBe("III");
    expect(parseDeaScheduleNumeral("IV")).toBe("IV");
    expect(parseDeaScheduleNumeral("V")).toBe("V");
  });

  it("strips C- prefix in either form", () => {
    expect(parseDeaScheduleNumeral("C-II")).toBe("II");
    expect(parseDeaScheduleNumeral("CIII")).toBe("III");
    expect(parseDeaScheduleNumeral("c iv")).toBe("IV");
  });

  it("handles numeric strings", () => {
    expect(parseDeaScheduleNumeral("2")).toBe("II");
    expect(parseDeaScheduleNumeral("5")).toBe("V");
  });
});

describe("formatDeaScheduleBadge", () => {
  it("returns null for non-controlled values", () => {
    expect(formatDeaScheduleBadge(null)).toBeNull();
    expect(formatDeaScheduleBadge("")).toBeNull();
    expect(formatDeaScheduleBadge("OTC")).toBeNull();
  });

  it("always renders C-{numeral} regardless of source shape", () => {
    expect(formatDeaScheduleBadge("II")).toBe("C-II");
    expect(formatDeaScheduleBadge("C-II")).toBe("C-II");
    expect(formatDeaScheduleBadge("CII")).toBe("C-II");
    expect(formatDeaScheduleBadge("2")).toBe("C-II");
  });

  it("regression: doesn't double-up the C- prefix", () => {
    // Old code rendered `C-${schedule}` directly, producing "C-C-II" when
    // DRX delivered the prefixed form.
    expect(formatDeaScheduleBadge("C-IV")).not.toBe("C-C-IV");
    expect(formatDeaScheduleBadge("C-IV")).toBe("C-IV");
  });
});

describe("isScheduleII", () => {
  it("returns true for any II shape", () => {
    expect(isScheduleII({ deaSchedule: "II" })).toBe(true);
    expect(isScheduleII({ deaSchedule: "C-II" })).toBe(true);
    expect(isScheduleII({ deaSchedule: "CII" })).toBe(true);
    expect(isScheduleII({ deaSchedule: "2" })).toBe(true);
  });

  it("returns false for III / IV / V", () => {
    expect(isScheduleII({ deaSchedule: "III" })).toBe(false);
    expect(isScheduleII({ deaSchedule: "C-IV" })).toBe(false);
    expect(isScheduleII({ deaSchedule: "V" })).toBe(false);
  });

  it("returns false for null / non-controlled", () => {
    expect(isScheduleII({ deaSchedule: null })).toBe(false);
    expect(isScheduleII({ isControlled: true })).toBe(false); // isControlled alone isn't enough
  });
});
