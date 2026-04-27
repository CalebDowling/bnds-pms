import { Prisma } from "@prisma/client";

// ═══════════════════════════════════════════════
// USER & ROLE TYPES
// ═══════════════════════════════════════════════

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

export type Role = Prisma.RoleGetPayload<{}>;

export type UserRole = Prisma.UserRoleGetPayload<{
  include: {
    role: true;
  };
}>;

// ═══════════════════════════════════════════════
// PRESCRIPTION & FILL TYPES
// ═══════════════════════════════════════════════

export type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: {
    patient: true;
    prescriber: true;
    item: true;
    formula: true;
    insurance: {
      include: {
        thirdPartyPlan: true;
      };
    };
    assignee: true;
    creator: true;
    fills: {
      include: {
        item: true;
        itemLot: true;
        batch: true;
        filler: true;
        verifier: true;
      };
    };
  };
}>;

export type PrescriptionFillWithRelations = {
  id: string;
  externalId: string | null;
  prescriptionId: string;
  fillNumber: number;
  itemId: string | null;
  itemLotId: string | null;
  ndc: string | null;
  quantity: any;
  daysSupply: number | null;
  status: string;
  binLocation: string | null;
  copayAmount: any;
  ingredientCost: any;
  dispensingFee: any;
  totalPrice: any;
  filledBy: string | null;
  verifiedBy: string | null;
  filledAt: Date | null;
  verifiedAt: Date | null;
  dispensedAt: Date | null;
  batchId: string | null;
  claimId: string | null;
  metadata: any;
  createdAt: Date;
  prescription: {
    id: string;
    externalId: string | null;
    rxNumber: string;
    patientId: string;
    prescriberId: string;
    status: string;
    priority: string;
    source: string;
    itemId: string | null;
    formulaId: string | null;
    isCompound: boolean;
    quantityPrescribed: any;
    quantityDispensed: any;
    daysSupply: number | null;
    directions: string | null;
    dawCode: string | null;
    refillsAuthorized: number;
    refillsRemaining: number;
    dateWritten: Date;
    dateReceived: Date;
    dateFilled: Date | null;
    dateShipped: Date | null;
    expirationDate: Date | null;
    prescriberNotes: string | null;
    internalNotes: string | null;
    insuranceId: string | null;
    assignedTo: string | null;
    isActive: boolean;
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      mrn: string;
    };
    prescriber: {
      id: string;
      firstName: string;
      lastName: string;
    };
    item: {
      id: string;
      name: string;
      strength: string | null;
    } | null;
    formula: {
      id: string;
      name: string;
    } | null;
  };
  item: any;
  itemLot: {
    lotNumber: string;
  } | null;
  batch: {
    batchNumber: string;
  } | null;
  filler: {
    firstName: string;
    lastName: string;
  } | null;
  verifier: {
    firstName: string;
    lastName: string;
  } | null;
};

// ═══════════════════════════════════════════════
// COMPOUNDING TYPES
// ═══════════════════════════════════════════════

export type CompoundingBatchWithRelations = {
  id: string;
  batchNumber: string;
  formulaVersionId: string;
  prescriptionId: string | null;
  quantityPrepared: any;
  unit: string;
  budDate: Date;
  status: string;
  compoundedBy: string;
  verifiedBy: string | null;
  compoundedAt: Date | null;
  verifiedAt: Date | null;
  envTemp: any;
  envHumidity: any;
  notes: string | null;
  createdAt: Date;
  formulaVersion: {
    id: string;
    formulaId: string;
    versionNumber: number;
    effectiveDate: Date;
    baseCost: any;
    price: any;
    pricingMethod: string | null;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    formula: {
      id: string;
      name: string;
      formulaCode: string;
      category: string | null;
      dosageForm: string | null;
      route: string | null;
      isSterile: boolean;
      defaultBudDays: number | null;
      storageConditions: string | null;
      currentVersionId: string | null;
      isActive: boolean;
      createdAt: Date;
    };
  };
  ingredients: Array<any>;
  qa: Array<any>;
  fills: Array<any>;
  compounder: {
    id: string;
    firstName: string;
    lastName: string;
  };
  verifier: any;
};

export type FormulaWithIngredients = Prisma.FormulaGetPayload<{
  include: {
    versions: true;
  };
}>;

export type IngredientLotWithRelations = Prisma.ItemLotGetPayload<{
  include: {
    item: true;
  };
}>;

// ═══════════════════════════════════════════════
// INSURANCE TYPES
// ═══════════════════════════════════════════════

export type ThirdPartyPlan = Prisma.ThirdPartyPlanGetPayload<{}>;

export type ThirdPartyPlanWithCount = Prisma.ThirdPartyPlanGetPayload<{
  include: {
    _count: {
      select: {
        patientInsurance: true;
      };
    };
  };
}>;

export type ThirdPartyPlanWithRelations = Prisma.ThirdPartyPlanGetPayload<{
  include: {
    patientInsurance: true;
  };
}>;

// ═══════════════════════════════════════════════
// GLOBAL TYPES
// ═══════════════════════════════════════════════

export type SearchResult = {
  id: string;
  type: "patient" | "prescription" | "item" | "formula" | "prescriber";
  title: string;
  subtitle?: string;
  href: string;
};

// ═══════════════════════════════════════════════
// SEARCH RESULT TYPES
// ═══════════════════════════════════════════════

// Patient search result — includes a denormalized primary phone so the
// /prescriptions/new picker can disambiguate same-named patients without a
// second round-trip. The shape mirrors what `searchPatients` and
// `getPatientForRx` return; consumers that don't need phoneNumbers can
// simply ignore the field.
export type PatientSearchResult = Prisma.PatientGetPayload<{
  select: {
    id: true;
    firstName: true;
    lastName: true;
    mrn: true;
    dateOfBirth: true;
    phoneNumbers: {
      select: {
        number: true;
        isPrimary: true;
        phoneType: true;
      };
    };
  };
}>;

export type PrescriberSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  npi: string;
  suffix: string | null;
  specialty: string | null;
};

export type FormulaSearchResult = {
  id: string;
  name: string;
  formulaCode: string;
  dosageForm: string | null;
  category: string | null;
};

export type ItemSearchResult = {
  id: string;
  name: string;
  ndc: string | null;
  strength: string | null;
  genericName: string | null;
  manufacturer: string | null;
  unitOfMeasure: string | null;
};

// ═══════════════════════════════════════════════
// BATCH & INGREDIENT TYPES
// ═══════════════════════════════════════════════

export type IngredientLotRecord = {
  id: string;
  lotNumber: string;
  quantityOnHand: number;
  expirationDate: string;
};

export type BatchFormulaIngredient = {
  id: string;
  itemId: string;
  unit: string;
  formulaVersionId: string;
  quantity: unknown;
  isActiveIngredient: boolean;
  sortOrder: number;
  item: {
    id: string;
    name: string;
    strength: string | null;
    unitOfMeasure: string | null;
  };
};

export type BatchQACheck = Prisma.BatchQaGetPayload<{
  include: {
    performer: {
      select: {
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

export type FormulaStep = Prisma.FormulaStepGetPayload<{}>;

export type AllergyRecord = {
  allergen: string;
  severity: string;
};

export type StatusLog = Prisma.PrescriptionStatusLogGetPayload<{
  include: {
    changer: {
      select: {
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

export type BatchIngredient = {
  id: string;
  batchId: string;
  itemLotId: string;
  quantityUsed: unknown;
  unit: string;
  weighedBy: string | null;
  weighedAt: Date | null;
  scaleReading: unknown | null;
  itemLot: {
    id: string;
    lotNumber: string;
    itemId: string;
    item: {
      id: string;
      name: string;
    };
  };
  weigher: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

// ═══════════════════════════════════════════════
// UNION TYPES FOR SEARCH
// ═══════════════════════════════════════════════

export type SearchableItem = PatientSearchResult | PrescriberSearchResult | ItemSearchResult | FormulaSearchResult;

export type DrugSearchResult = (ItemSearchResult & { _type: "item"; label: string; sub: string }) | (FormulaSearchResult & { _type: "formula"; label: string; sub: string });
