/**
 * Keragon Event Dispatcher
 * Maps pharmacy domain events to Keragon workflow triggers.
 *
 * Call these functions from your existing API routes and server actions
 * to fire events to Keragon workflows. Each function constructs a
 * standardized payload and dispatches it asynchronously.
 *
 * All dispatches are fire-and-forget by default — they log errors but
 * never throw, so they won't break the calling code path.
 */

import { dispatchToKeragon, dispatchBatch } from "./keragon";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Prescription events
// ---------------------------------------------------------------------------

/** Fire when a new prescription is created (data entry complete) */
export async function onNewPrescription(rx: {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  prescriberId?: string;
  prescriberName?: string;
  drugName: string;
  quantity: number;
  daysSupply?: number;
  refillsAuthorized?: number;
  sig?: string;
  source?: string; // e-rx, phone, fax, walk-in
}) {
  return fireAndForget("rx.new", {
    prescriptionId: rx.id,
    rxNumber: rx.rxNumber,
    patientId: rx.patientId,
    patientName: rx.patientName,
    prescriberId: rx.prescriberId,
    prescriberName: rx.prescriberName,
    drug: rx.drugName,
    quantity: rx.quantity,
    daysSupply: rx.daysSupply,
    refillsAuthorized: rx.refillsAuthorized,
    sig: rx.sig,
    source: rx.source,
  });
}

/** Fire when a fill record is created (before verification) */
export async function onFillCreated(fill: {
  id: string;
  prescriptionId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  drugName: string;
  quantity: number;
  ndc?: string;
  lotNumber?: string;
  fillNumber?: number;
}) {
  return fireAndForget("rx.fill.created", {
    fillId: fill.id,
    prescriptionId: fill.prescriptionId,
    rxNumber: fill.rxNumber,
    patientId: fill.patientId,
    patientName: fill.patientName,
    drug: fill.drugName,
    quantity: fill.quantity,
    ndc: fill.ndc,
    lotNumber: fill.lotNumber,
    fillNumber: fill.fillNumber,
  });
}

/** Fire when a fill is pharmacist-verified (ready for dispensing) */
export async function onFillVerified(fill: {
  id: string;
  prescriptionId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  drugName: string;
  verifiedBy: string;
  verifiedByName: string;
}) {
  return fireAndForget("rx.fill.verified", {
    fillId: fill.id,
    prescriptionId: fill.prescriptionId,
    rxNumber: fill.rxNumber,
    patientId: fill.patientId,
    patientName: fill.patientName,
    drug: fill.drugName,
    verifiedBy: fill.verifiedBy,
    verifiedByName: fill.verifiedByName,
  });
}

/** Fire when an Rx is dispensed (picked up or shipped) */
export async function onRxDispensed(rx: {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  drugName: string;
  quantity: number;
  copay?: number;
  method?: "pickup" | "delivery" | "mail";
}) {
  return fireAndForget("rx.dispensed", {
    prescriptionId: rx.id,
    rxNumber: rx.rxNumber,
    patientId: rx.patientId,
    patientName: rx.patientName,
    patientPhone: rx.patientPhone,
    drug: rx.drugName,
    quantity: rx.quantity,
    copay: rx.copay,
    method: rx.method,
  });
}

/** Fire when a prescription is transferred out */
export async function onRxTransferred(rx: {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  toPharmacy: string;
  toPharmacyPhone?: string;
}) {
  return fireAndForget("rx.transferred", {
    prescriptionId: rx.id,
    rxNumber: rx.rxNumber,
    patientId: rx.patientId,
    patientName: rx.patientName,
    toPharmacy: rx.toPharmacy,
    toPharmacyPhone: rx.toPharmacyPhone,
  });
}

/** Fire when a refill is coming due (from cron/automation check) */
export async function onRefillDue(rx: {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  drugName: string;
  lastFillDate: string;
  daysSupply: number;
  refillsRemaining: number;
  dueDate: string;
}) {
  return fireAndForget("rx.refill.due", {
    prescriptionId: rx.id,
    rxNumber: rx.rxNumber,
    patientId: rx.patientId,
    patientName: rx.patientName,
    patientPhone: rx.patientPhone,
    drug: rx.drugName,
    lastFillDate: rx.lastFillDate,
    daysSupply: rx.daysSupply,
    refillsRemaining: rx.refillsRemaining,
    dueDate: rx.dueDate,
  });
}

// ---------------------------------------------------------------------------
// Claims events
// ---------------------------------------------------------------------------

/** Fire when a claim is submitted to a payer */
export async function onClaimSubmitted(claim: {
  id: string;
  fillId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  insurancePlan: string;
  amountBilled: number;
  bin?: string;
  pcn?: string;
}) {
  return fireAndForget("claim.submitted", {
    claimId: claim.id,
    fillId: claim.fillId,
    rxNumber: claim.rxNumber,
    patientId: claim.patientId,
    patientName: claim.patientName,
    insurancePlan: claim.insurancePlan,
    amountBilled: claim.amountBilled,
    bin: claim.bin,
    pcn: claim.pcn,
  });
}

/** Fire when a claim is paid (adjudicated successfully) */
export async function onClaimPaid(claim: {
  id: string;
  fillId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  amountPaid: number;
  copay: number;
  insurancePlan: string;
}) {
  return fireAndForget("claim.paid", {
    claimId: claim.id,
    fillId: claim.fillId,
    rxNumber: claim.rxNumber,
    patientId: claim.patientId,
    patientName: claim.patientName,
    amountPaid: claim.amountPaid,
    copay: claim.copay,
    insurancePlan: claim.insurancePlan,
  });
}

/** Fire when a claim is rejected */
export async function onClaimRejected(claim: {
  id: string;
  fillId: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  rejectCode: string;
  rejectMessage: string;
  insurancePlan: string;
}) {
  return fireAndForget("claim.rejected", {
    claimId: claim.id,
    fillId: claim.fillId,
    rxNumber: claim.rxNumber,
    patientId: claim.patientId,
    patientName: claim.patientName,
    rejectCode: claim.rejectCode,
    rejectMessage: claim.rejectMessage,
    insurancePlan: claim.insurancePlan,
  });
}

// ---------------------------------------------------------------------------
// Patient events
// ---------------------------------------------------------------------------

/** Fire when a new patient is created */
export async function onPatientCreated(patient: {
  id: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
}) {
  return fireAndForget("patient.created", {
    patientId: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    phone: patient.phone,
    email: patient.email,
  });
}

/** Fire when a patient record is updated */
export async function onPatientUpdated(patient: {
  id: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  changedFields: string[];
}) {
  return fireAndForget("patient.updated", {
    patientId: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    changedFields: patient.changedFields,
  });
}

// ---------------------------------------------------------------------------
// Inventory events
// ---------------------------------------------------------------------------

/** Fire when an item falls below its reorder point */
export async function onInventoryLow(item: {
  id: string;
  ndc: string;
  drugName: string;
  quantityOnHand: number;
  reorderPoint: number;
  supplier?: string;
}) {
  return fireAndForget("inventory.low", {
    itemId: item.id,
    ndc: item.ndc,
    drug: item.drugName,
    quantityOnHand: item.quantityOnHand,
    reorderPoint: item.reorderPoint,
    supplier: item.supplier,
  });
}

/** Fire when a lot is approaching expiration */
export async function onInventoryExpiring(lot: {
  id: string;
  itemId: string;
  drugName: string;
  lotNumber: string;
  expirationDate: string;
  quantityOnHand: number;
  daysUntilExpiry: number;
}) {
  return fireAndForget("inventory.expiring", {
    lotId: lot.id,
    itemId: lot.itemId,
    drug: lot.drugName,
    lotNumber: lot.lotNumber,
    expirationDate: lot.expirationDate,
    quantityOnHand: lot.quantityOnHand,
    daysUntilExpiry: lot.daysUntilExpiry,
  });
}

// ---------------------------------------------------------------------------
// Compounding / Batch events
// ---------------------------------------------------------------------------

/** Fire when a compounding batch is created */
export async function onBatchCreated(batch: {
  id: string;
  batchNumber: string;
  formulaName: string;
  quantity: number;
  assignedTo?: string;
}) {
  return fireAndForget("batch.created", {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    formula: batch.formulaName,
    quantity: batch.quantity,
    assignedTo: batch.assignedTo,
  });
}

/** Fire when a batch passes QA and is complete */
export async function onBatchCompleted(batch: {
  id: string;
  batchNumber: string;
  formulaName: string;
  quantity: number;
  verifiedBy: string;
}) {
  return fireAndForget("batch.completed", {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    formula: batch.formulaName,
    quantity: batch.quantity,
    verifiedBy: batch.verifiedBy,
  });
}

/** Fire when a batch fails QA */
export async function onBatchFailedQA(batch: {
  id: string;
  batchNumber: string;
  formulaName: string;
  reason: string;
  checkedBy: string;
}) {
  return fireAndForget("batch.failed_qa", {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    formula: batch.formulaName,
    reason: batch.reason,
    checkedBy: batch.checkedBy,
  });
}

// ---------------------------------------------------------------------------
// LTC events
// ---------------------------------------------------------------------------

/** Fire when a MAR is generated for a facility */
export async function onMARGenerated(mar: {
  facilityId: string;
  facilityName: string;
  wingId?: string;
  wingName?: string;
  patientCount: number;
  medicationCount: number;
  periodStart: string;
  periodEnd: string;
  generatedBy: string;
  documentUrl?: string;
}) {
  return fireAndForget("mar.generated", mar);
}

/** Fire when a facility places an order */
export async function onFacilityOrder(order: {
  facilityId: string;
  facilityName: string;
  orderItems: Array<{ drugName: string; quantity: number; patientName?: string }>;
  requestedBy?: string;
  priority?: "normal" | "stat" | "urgent";
}) {
  return fireAndForget("facility.order", order);
}

// ---------------------------------------------------------------------------
// Hardware events
// ---------------------------------------------------------------------------

/** Fire when a pill counter completes a count */
export async function onHardwareCountComplete(count: {
  deviceType: "eyecon" | "scriptpro" | "yuyama" | "other";
  deviceId?: string;
  ndc: string;
  drugName: string;
  countedQuantity: number;
  expectedQuantity?: number;
  fillId?: string;
  discrepancy?: boolean;
}) {
  return fireAndForget("hardware.count_complete", count);
}

/** Fire when hardware reports an error */
export async function onHardwareError(error: {
  deviceType: string;
  deviceId?: string;
  errorCode?: string;
  errorMessage: string;
  severity: "warning" | "error" | "critical";
}) {
  return fireAndForget("hardware.error", error);
}

// ---------------------------------------------------------------------------
// Helper: fire-and-forget with error swallowing
// ---------------------------------------------------------------------------

async function fireAndForget(event: string, data: Record<string, any>) {
  try {
    const result = await dispatchToKeragon(event, data);
    return result;
  } catch (err) {
    logger.error(`[Keragon Events] Unexpected error dispatching "${event}":`, err);
    return { success: false, event, error: String(err) };
  }
}
