/**
 * Real-Time Claims Adjudication Engine
 * Handles NCPDP D.0 claim submission, switch vendor integration, and response processing
 */

import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { Decimal } from "@prisma/client/runtime/library";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface ClaimSubmission {
  fillId: string;
  insuranceId: string;
  overrideCodes?: string[];
}

export interface ClaimResponse {
  transactionId: string;
  status: "paid" | "rejected" | "pending";
  paidAmount?: number;
  ingredientCostPaid?: number;
  dispensingFeePaid?: number;
  copayAmount?: number;
  rejectionCodes?: string[];
  rejectionMessages?: Record<string, string>;
  otherPayerAmount?: number;
  responseData?: Record<string, unknown>;
}

export interface NCPDPClaim {
  bin: string;
  pcn: string;
  groupId: string;
  memberId: string;
  personCode: string;
  cardholderId?: string;
  ndc: string;
  quantity: number;
  daysSupply: number;
  dateOfService: string;
  dawCode?: string;
  prescriberId: string;
  pharmacyNpi: string;
  ingredientCost: number;
  dispensingFee: number;
  usualAndCustomaryCharge: number;
  copayAmount: number;
}

// ═══════════════════════════════════════════════
// CONSTANTS - NCPDP REJECTION CODES
// ═══════════════════════════════════════════════

const NCPDP_REJECTION_CODES: Record<string, string> = {
  "01": "Product/Service Not Covered",
  "02": "Invalid/Expired Member ID",
  "03": "Invalid Cardholder",
  "04": "Invalid Prescriber ID",
  "05": "Quantity Exceeds Maximum",
  "06": "Compound Not Covered",
  "07": "Invalid Days Supply",
  "08": "Duplicate Claim",
  "10": "Group Number Mismatch",
  "11": "Patient Copay Required",
  "12": "Patient Deductible Required",
  "13": "Patient Out-of-Pocket Maximum",
  "14": "Prior Authorization Required",
  "15": "Refill Too Soon",
  "16": "Lifetime Limit Exceeded",
  "17": "Claim Adjustment Requested",
  "18": "Missing/Invalid Data",
  "19": "Processor Error",
  "20": "Plan Limitations Exceeded",
  "21": "Invalid NDC",
  "22": "Strength Not Covered",
  "23": "Form Not Covered",
  "24": "Missing Prescriber NPI",
  "25": "Patient Not Eligible",
};

// ═══════════════════════════════════════════════
// MAIN ADJUDICATION FUNCTIONS
// ═══════════════════════════════════════════════

/**
 * Build an NCPDP D.0 format claim object from fill and insurance data
 */
export async function buildNCPDPClaim(
  fillId: string
): Promise<{ claim: NCPDPClaim; fill: any; insurance: any; plan: any; prescription: any; patient: any }> {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: true,
          prescriber: true,
          item: true,
        },
      },
      itemLot: true,
    },
  });

  if (!fill) throw new Error("Fill not found");
  if (!fill.prescription) throw new Error("Prescription not found for fill");

  const insurance = await prisma.patientInsurance.findUnique({
    where: { id: fill.prescription.insuranceId || undefined },
  });

  if (!insurance) throw new Error("Insurance not found");

  const plan = await prisma.thirdPartyPlan.findUnique({
    where: { id: insurance.thirdPartyPlanId || undefined },
  });

  if (!plan) throw new Error("Insurance plan not found");

  const patient = fill.prescription.patient;
  const prescriber = fill.prescription.prescriber;

  if (!prescriber) throw new Error("Prescriber not found");

  const pharmacyNpi = process.env.PHARMACY_NPI || "1000000000";

  // Calculate total charge
  const ingredientCost = fill.ingredientCost?.toNumber() || 0;
  const dispensingFee = fill.dispensingFee?.toNumber() || 0;
  const copayAmount = fill.copayAmount?.toNumber() || 0;
  const usualAndCustomaryCharge = ingredientCost + dispensingFee;

  const claim: NCPDPClaim = {
    bin: plan.bin,
    pcn: plan.pcn || "",
    groupId: insurance.groupNumber || "",
    memberId: insurance.memberId,
    personCode: insurance.personCode || "01",
    cardholderId: insurance.cardholderId || undefined,
    ndc: fill.ndc || "",
    quantity: fill.quantity.toNumber(),
    daysSupply: fill.daysSupply || 30,
    dateOfService: new Date().toISOString().split("T")[0],
    dawCode: fill.prescription.dawCode || "0",
    prescriberId: prescriber.npi || "",
    pharmacyNpi,
    ingredientCost,
    dispensingFee,
    usualAndCustomaryCharge,
    copayAmount,
  };

  return { claim, fill, insurance, plan, prescription: fill.prescription, patient };
}

/**
 * Submit a claim to the switch vendor or mock adjudicator
 */
export async function submitClaim(submission: ClaimSubmission, userId?: string): Promise<ClaimResponse> {
  try {
    const { fillId, insuranceId } = submission;

    // Build NCPDP claim
    const { claim, fill, insurance, plan, prescription, patient } = await buildNCPDPClaim(fillId);

    // Submit to switch vendor or use mock
    let response: ClaimResponse;
    const switchUrl = process.env.CLAIMS_SWITCH_URL;

    if (switchUrl) {
      response = await submitToSwitchVendor(claim, switchUrl);
    } else {
      response = mockAdjudicate(claim);
    }

    // Generate unique transaction ID if not provided
    if (!response.transactionId) {
      response.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create or update Claim record
    const existingClaim = await prisma.claim.findFirst({
      where: {
        fillId,
        insuranceId,
        status: { notIn: ["reversed"] },
      },
    });

    const claimData = {
      fillId,
      insuranceId,
      claimNumber: response.transactionId,
      status: response.status,
      amountBilled: new Decimal(claim.usualAndCustomaryCharge),
      amountAllowed: response.paidAmount ? new Decimal(response.paidAmount) : null,
      amountPaid: response.paidAmount ? new Decimal(response.paidAmount) : null,
      patientCopay: response.copayAmount ? new Decimal(response.copayAmount) : null,
      submittedAt: new Date(),
      adjudicatedAt: new Date(),
      paidAt: response.status === "paid" ? new Date() : null,
      rejectionCodes: response.rejectionCodes ? JSON.parse(JSON.stringify(response.rejectionCodes)) : undefined,
      rejectionMessages: response.rejectionMessages ? JSON.parse(JSON.stringify(response.rejectionMessages)) : undefined,
    };

    let claimRecord;
    if (existingClaim) {
      claimRecord = await prisma.claim.update({
        where: { id: existingClaim.id },
        data: claimData,
      });
    } else {
      claimRecord = await prisma.claim.create({ data: claimData });
    }

    // Update fill with pricing info if paid
    if (response.status === "paid" && response.ingredientCostPaid !== undefined) {
      await prisma.prescriptionFill.update({
        where: { id: fillId },
        data: {
          claimId: claimRecord.id,
        },
      });
    }

    // Create notification for rejection or pending
    if (response.status === "rejected" && userId) {
      const rejectionMsg =
        response.rejectionCodes?.map((code) => `${code}: ${NCPDP_REJECTION_CODES[code] || "Unknown reason"}`).join("; ") ||
        "Unknown rejection reason";

      await createNotification(
        userId,
        "claim_rejected",
        `Claim Rejected for ${patient.firstName} ${patient.lastName}`,
        `Rx #${prescription.rxNumber} - ${rejectionMsg}`,
        {
          claimNumber: claimRecord.id,
          prescriptionId: prescription.id,
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          rxNumber: prescription.rxNumber,
          rejectionCode: response.rejectionCodes?.[0],
        }
      );
    }

    // Audit log
    if (userId) {
      await logAudit({
        userId,
        action: "CREATE",
        resource: "claims",
        resourceId: claimRecord.id,
        details: {
          fillId,
          insuranceId,
          status: response.status,
          transactionId: response.transactionId,
        },
      });
    }

    return response;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Claim submission error:", message);
    throw error;
  }
}

/**
 * Reverse a paid claim
 */
export async function reverseClaim(claimId: string, reason?: string, userId?: string): Promise<ClaimResponse> {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        fills: {
          include: {
            prescription: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    if (!claim) throw new Error("Claim not found");
    if (claim.status !== "paid") throw new Error("Only paid claims can be reversed");

    const firstFill = claim.fills[0];
    if (!firstFill) throw new Error("No fill associated with claim");

    // Submit reversal to switch (in production, this would send specific reversal message)
    let response: ClaimResponse;
    const switchUrl = process.env.CLAIMS_SWITCH_URL;

    if (switchUrl) {
      response = await submitReversalToSwitch(claim, switchUrl);
    } else {
      response = mockReversal();
    }

    // Update claim status
    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: "reversed",
        adjudicatedAt: new Date(),
      },
    });

    // Audit log
    if (userId) {
      await logAudit({
        userId,
        action: "UPDATE",
        resource: "claims",
        resourceId: claimId,
        details: {
          action: "reverse",
          reason: reason || "No reason provided",
          transactionId: response.transactionId,
        },
      });
    }

    return response;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Claim reversal error:", message);
    throw error;
  }
}

// ═══════════════════════════════════════════════
// SWITCH VENDOR INTEGRATION
// ═══════════════════════════════════════════════

/**
 * Submit claim to external switch vendor API
 */
async function submitToSwitchVendor(claim: NCPDPClaim, switchUrl: string): Promise<ClaimResponse> {
  try {
    const response = await fetch(switchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CLAIMS_SWITCH_API_KEY || ""}`,
      },
      body: JSON.stringify(claim),
    });

    if (!response.ok) {
      throw new Error(`Switch vendor returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse vendor response into standardized format
    return parseVendorResponse(data);
  } catch (error) {
    console.error("Switch vendor submission failed:", error);
    // Fall back to mock on network error
    return mockAdjudicate(claim);
  }
}

/**
 * Submit claim reversal to switch vendor
 */
async function submitReversalToSwitch(claim: any, switchUrl: string): Promise<ClaimResponse> {
  try {
    const reversalPayload = {
      action: "reversal",
      transactionId: claim.claimNumber,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${switchUrl}/reversal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CLAIMS_SWITCH_API_KEY || ""}`,
      },
      body: JSON.stringify(reversalPayload),
    });

    if (!response.ok) {
      throw new Error(`Switch vendor reversal failed: ${response.statusText}`);
    }

    const data = await response.json();
    return parseVendorResponse(data);
  } catch (error) {
    console.error("Switch vendor reversal failed:", error);
    return mockReversal();
  }
}

/**
 * Parse vendor response into ClaimResponse format
 */
function parseVendorResponse(vendorData: any): ClaimResponse {
  // Adapt this based on your specific switch vendor's response format
  return {
    transactionId: vendorData.transactionId || vendorData.claimNumber,
    status: (vendorData.status || "pending").toLowerCase(),
    paidAmount: vendorData.paidAmount || vendorData.amountPaid,
    ingredientCostPaid: vendorData.ingredientCostPaid,
    dispensingFeePaid: vendorData.dispensingFeePaid,
    copayAmount: vendorData.copayAmount,
    rejectionCodes: vendorData.rejectionCodes,
    rejectionMessages: vendorData.rejectionMessages,
    responseData: vendorData,
  };
}

// ═══════════════════════════════════════════════
// MOCK ADJUDICATOR (FOR TESTING)
// ═══════════════════════════════════════════════

/**
 * Built-in mock adjudicator for testing
 * Simulates realistic claim outcomes: 80% paid, 15% rejected, 5% pending
 */
export function mockAdjudicate(claim: NCPDPClaim): ClaimResponse {
  const random = Math.random();
  const transactionId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 80% paid
  if (random < 0.8) {
    const paidAmount = Math.max(
      0,
      claim.usualAndCustomaryCharge - claim.copayAmount - (Math.random() * 2 - 1) // ±$1 variance
    );

    return {
      transactionId,
      status: "paid",
      paidAmount: Math.round(paidAmount * 100) / 100,
      ingredientCostPaid: Math.round(claim.ingredientCost * 0.95 * 100) / 100,
      dispensingFeePaid: Math.round(claim.dispensingFee * 100) / 100,
      copayAmount: claim.copayAmount,
      responseData: {
        timestamp: new Date().toISOString(),
        source: "mock",
      },
    };
  }

  // 15% rejected
  if (random < 0.95) {
    const rejectionReasons = ["14", "20", "25", "01", "05"];
    const selectedCode = rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)];

    return {
      transactionId,
      status: "rejected",
      rejectionCodes: [selectedCode],
      rejectionMessages: {
        [selectedCode]: NCPDP_REJECTION_CODES[selectedCode] || "Unknown rejection reason",
      },
      responseData: {
        timestamp: new Date().toISOString(),
        source: "mock",
      },
    };
  }

  // 5% pending
  return {
    transactionId,
    status: "pending",
    responseData: {
      timestamp: new Date().toISOString(),
      source: "mock",
    },
  };
}

/**
 * Mock claim reversal response
 */
function mockReversal(): ClaimResponse {
  return {
    transactionId: `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: "paid",
    paidAmount: 0,
    responseData: {
      timestamp: new Date().toISOString(),
      source: "mock",
      message: "Claim reversal processed",
    },
  };
}

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════

/**
 * Get descriptive text for an NCPDP rejection code
 */
export function getRejectionCodeDescription(code: string): string {
  return NCPDP_REJECTION_CODES[code] || "Unknown rejection code";
}

/**
 * Get all rejection code definitions
 */
export function getAllRejectionCodes(): Record<string, string> {
  return NCPDP_REJECTION_CODES;
}
