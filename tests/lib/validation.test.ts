import { describe, it, expect } from "vitest";
import {
  createPatientSchema,
  submitClaimSchema,
  inviteUserSchema,
  verify2FASchema,
  smsPickupSchema,
  paginationSchema,
} from "@/lib/validation";

describe("validation schemas", () => {
  describe("createPatientSchema", () => {
    it("accepts valid patient data", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "male",
        ssnLastFour: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing first name", () => {
      const result = createPatientSchema.safeParse({
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid SSN format", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        ssnLastFour: "12",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const result = createPatientSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "May 15, 1990",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("submitClaimSchema", () => {
    it("accepts valid claim data", () => {
      const result = submitClaimSchema.safeParse({
        fillId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const result = submitClaimSchema.safeParse({
        fillId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("inviteUserSchema", () => {
    it("accepts valid invite", () => {
      const result = inviteUserSchema.safeParse({
        email: "TEST@example.com",
        firstName: "Jane",
        lastName: "Smith",
        roleId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com"); // toLowerCase
      }
    });

    it("rejects invalid email", () => {
      const result = inviteUserSchema.safeParse({
        email: "not-an-email",
        firstName: "Jane",
        lastName: "Smith",
        roleId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("verify2FASchema", () => {
    it("accepts valid verify action", () => {
      const result = verify2FASchema.safeParse({
        action: "verify",
        code: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-numeric code", () => {
      const result = verify2FASchema.safeParse({
        action: "verify",
        code: "abcdef",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid action", () => {
      const result = verify2FASchema.safeParse({
        action: "hack",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("smsPickupSchema", () => {
    it("accepts valid SMS data", () => {
      const result = smsPickupSchema.safeParse({
        phone: "3375551234",
        patientName: "John Doe",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing phone", () => {
      const result = smsPickupSchema.safeParse({
        patientName: "John",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("uses defaults when empty", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(0);
      }
    });

    it("rejects limit > 100", () => {
      const result = paginationSchema.safeParse({ limit: 500 });
      expect(result.success).toBe(false);
    });
  });
});
