import { Prisma } from "@prisma/client";

// Partial prescription data as returned from patient query
export type PatientPrescription = Prisma.PrescriptionGetPayload<{
  include: {
    prescriber: {
      select: {
        firstName: true;
        lastName: true;
        suffix: true;
      };
    };
    item: {
      select: {
        name: true;
        strength: true;
      };
    };
  };
}>;

// Full patient with all relations
export type PatientWithRelations = Prisma.PatientGetPayload<{
  include: {
    phoneNumbers: true;
    addresses: true;
    allergies: true;
    insurance: {
      include: {
        thirdPartyPlan: true;
      };
    };
    outsideMeds: true;
    encounters: true;
    customStatuses: true;
    facility: true;
    wing: true;
    room: true;
    prescriptions: {
      include: {
        prescriber: {
          select: {
            firstName: true;
            lastName: true;
            suffix: true;
          };
        };
        item: {
          select: {
            name: true;
            strength: true;
          };
        };
      };
    };
  };
}>;

// Patient list item (lighter for table display)
export type PatientListItem = Prisma.PatientGetPayload<{
  include: {
    phoneNumbers: true;
    addresses: true;
    allergies: { select: { id: true } };
    insurance: { select: { id: true; priority: true; isActive: true } };
  };
}>;

// Form data for creating/editing patients
export type PatientFormData = {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  dateOfBirth: string;
  gender?: string;
  ssnLastFour?: string;
  email?: string;
  preferredContact: string;
  preferredLanguage: string;
  notes?: string;
  // Inline phone number for quick add
  phone?: string;
  phoneType?: string;
  // Inline address for quick add
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type PhoneFormData = {
  phoneType: string;
  number: string;
  extension?: string;
  isPrimary: boolean;
  acceptsSms: boolean;
};

export type AddressFormData = {
  addressType: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  isDefault: boolean;
};

export type AllergyFormData = {
  allergen: string;
  allergenCode?: string;
  reaction?: string;
  severity: string;
  onsetDate?: string;
  source?: string;
};

export type InsuranceFormData = {
  priority: string;
  memberId: string;
  personCode?: string;
  groupNumber?: string;
  relationship?: string;
  cardholderName?: string;
  cardholderId?: string;
  effectiveDate?: string;
  terminationDate?: string;
  thirdPartyPlanId?: string;
};
