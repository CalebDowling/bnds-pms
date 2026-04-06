import { randomUUID } from 'crypto';

/**
 * Test data factory functions for creating realistic test objects
 */

export function makePatient(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    mrn: `BNDS-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
    externalId: null,
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    suffix: null,
    dateOfBirth: new Date('1980-01-15'),
    gender: 'M',
    ssnLastFour: '1234',
    email: 'john.doe@example.com',
    preferredContact: 'phone',
    preferredLanguage: 'en',
    status: 'active',
    facilityId: null,
    wingId: null,
    roomId: null,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: randomUUID(),
    updatedBy: randomUUID(),
    ...overrides,
  };
}

export function makePrescription(overrides?: Record<string, any>) {
  const patientId = randomUUID();
  return {
    id: randomUUID(),
    patientId,
    prescriberId: randomUUID(),
    rxNumber: `RX-${randomUUID().substring(0, 8).toUpperCase()}`,
    status: 'active',
    drugName: 'Lisinopril',
    strength: '10mg',
    quantity: 30,
    daysSupply: 30,
    refillsRemaining: 5,
    refillsAuthorized: 11,
    instructions: 'Take once daily',
    notes: null,
    dateWritten: new Date(),
    dateExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: randomUUID(),
    assignedTo: null,
    ...overrides,
  };
}

export function makeFill(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    prescriptionId: randomUUID(),
    sequenceNumber: 1,
    status: 'dispensed',
    quantityFilled: 30,
    datefilled: new Date(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    filledBy: randomUUID(),
    verifiedBy: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeItemLot(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    itemId: randomUUID(),
    lotNumber: `LOT-${randomUUID().substring(0, 8).toUpperCase()}`,
    quantity: 100,
    quantityOnHand: 95,
    unitCost: 25.5,
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    manufacturerDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    source: 'wholesale',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeClaim(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    prescriptionFillId: randomUUID(),
    patientId: randomUUID(),
    insuranceId: randomUUID(),
    claimNumber: `CLM-${randomUUID().substring(0, 8).toUpperCase()}`,
    status: 'submitted',
    submittedDate: new Date(),
    respondDate: null,
    drugCost: 150.0,
    patientResponsibility: 25.0,
    insuranceResponsibility: 125.0,
    approvalCode: null,
    denialReason: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeUser(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    supabaseId: randomUUID(),
    externalId: null,
    email: 'user@bndsrx.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '555-0123',
    department: 'Pharmacy',
    isPharmacist: true,
    licenseNumber: 'PHM123456',
    pin: null,
    isActive: true,
    lastLogin: new Date(),
    storeId: randomUUID(),
    createdAt: new Date(),
    roles: [
      {
        id: randomUUID(),
        userId: '',
        roleId: randomUUID(),
        storeId: null,
        createdAt: new Date(),
        role: {
          id: randomUUID(),
          name: 'pharmacist',
          description: 'Pharmacist role',
          permissions: {
            prescriptions: ['read', 'write', 'verify', 'dispense'],
            patients: ['read', 'write'],
            inventory: ['read', 'write'],
          },
          createdAt: new Date(),
        },
      },
    ],
    ...overrides,
  };
}

export function makeBatch(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    formulaId: randomUUID(),
    batchNumber: `BATCH-${randomUUID().substring(0, 8).toUpperCase()}`,
    status: 'completed',
    quantity: 50,
    quantityUnit: 'capsules',
    mfgDate: new Date(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    compoundedBy: randomUUID(),
    verifiedBy: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeFormula(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    name: 'Custom Compounded Formula',
    description: 'A custom formula for patient care',
    status: 'active',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeAuditLog(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    action: 'CREATE',
    tableName: 'patients',
    recordId: randomUUID(),
    oldValues: null,
    newValues: { firstName: 'John', lastName: 'Doe' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    ...overrides,
  };
}

export function makePosSession(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    sessionNumber: 1,
    cashierId: randomUUID(),
    openedAt: new Date(),
    closedAt: null,
    openingCash: 100.0,
    closingCash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makePosTransaction(overrides?: Record<string, any>) {
  return {
    id: randomUUID(),
    posSessionId: randomUUID(),
    transactionType: 'sale',
    amount: 25.99,
    paymentMethod: 'cash',
    notes: null,
    createdAt: new Date(),
    cashier: randomUUID(),
    ...overrides,
  };
}
