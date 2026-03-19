/**
 * NCPDP D.0 Insurance Claims Integration
 *
 * NCPDP Telecommunications Standard D.0 is the real-time claims format used for:
 * - Claims submission (B1)
 * - Claim reversals (B2)
 * - Claim rebills (B3)
 * - Eligibility verification (E1)
 * - Prior authorization requests (PA)
 *
 * Connects to pharmacy claims switch (e.g., MedImpact, Emdeon, Caremark)
 * Reference: NCPDP D.0 Telecommunications Standard v 2024
 */

import { logger } from "@/lib/logger";

/**
 * Transaction types per NCPDP D.0
 */
type TransactionType = "B1" | "B2" | "B3" | "E1" | "PA";

/**
 * Claim or eligibility status
 */
type ClaimStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "denied"
  | "pended"
  | "hold";

/**
 * NCPDP field types for formatting
 */
type FieldType = "AN" | "N" | "D" | "R"; // Alphanumeric, Numeric, Date, Real/Decimal

/**
 * Claim data structure for submission
 */
export interface ClaimData {
  // Patient information
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string; // YYYYMMDD
  patientGender: string; // M or F
  patientAddress?: string;
  patientCity?: string;
  patientState?: string;
  patientZip?: string;

  // Insurance information
  planBin: string;
  planPcn?: string;
  memberId: string;
  groupNumber?: string;
  personCode?: string;

  // Prescription information
  prescriptionNumber: string;
  drugNdc: string;
  quantity: number;
  daysSupply: number;
  refillNumber: number;

  // Prescriber information
  prescriberNpi: string;
  prescriberLicense?: string;
  prescriberState?: string;

  // Pharmacy information
  pharmacyNpi: string;
  pharmacyNcpdpId: string;

  // Pricing
  ingredientCost: number;
  dispensingFee: number;
  totalAmount: number;
  patientCopay?: number;

  // Additional fields
  dawCode?: string;
  claimNumber?: string;
  submitDate?: string; // YYYYMMDD
}

/**
 * NCPDP D.0 response parsed from claim switch
 */
export interface ClaimResponse {
  claimId?: string;
  status: ClaimStatus;
  approvedAmount?: number;
  approvedCopay?: number;
  denialCodes?: string[];
  denialMessages?: string[];
  messageId: string;
  rawResponse?: string;
}

/**
 * Eligibility verification data
 */
export interface EligibilityData {
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string; // YYYYMMDD
  memberId: string;
  planBin: string;
  planPcn?: string;
  groupNumber?: string;
  personCode?: string;
}

/**
 * Eligibility response from switch
 */
export interface EligibilityResponse {
  eligible: boolean;
  effectiveDate?: string;
  terminationDate?: string;
  copayAmount?: number;
  deductible?: number;
  deductibleMet?: number;
  maxOutOfPocket?: number;
  coverage?: string;
  responseCode?: string;
}

/**
 * Prior auth request
 */
export interface PriorAuthRequest {
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string;
  memberId: string;
  planBin: string;
  drugNdc: string;
  quantity: number;
  daysSupply: number;
  prescriberNpi: string;
  pharmacyNpi: string;
  reason?: string;
}

/**
 * Prior auth response
 */
export interface PriorAuthResponse {
  approved: boolean;
  authCode?: string;
  expirationDate?: string;
  messageId: string;
  denialReason?: string;
}

/**
 * NCPDP Claims Client
 *
 * Handles all communication with pharmacy claims switch using NCPDP D.0 format.
 * Requires environment variables:
 * - NCPDP_SWITCH_URL: Switch endpoint URL
 * - NCPDP_SENDER_ID: Pharmacy sender ID
 * - NCPDP_PASSWORD: Sender password
 * - NCPDP_PROCESSOR_ID: Insurance processor ID
 */
export class NCPDPClaimsClient {
  private switchUrl: string;
  private senderId: string;
  private password: string;
  private processorId: string;

  constructor(
    switchUrl?: string,
    senderId?: string,
    password?: string,
    processorId?: string
  ) {
    this.switchUrl = switchUrl || process.env.NCPDP_SWITCH_URL || "";
    this.senderId = senderId || process.env.NCPDP_SENDER_ID || "";
    this.password = password || process.env.NCPDP_PASSWORD || "";
    this.processorId = processorId || process.env.NCPDP_PROCESSOR_ID || "";

    if (!this.switchUrl || !this.senderId || !this.password || !this.processorId) {
      throw new Error(
        "NCPDP configuration missing: NCPDP_SWITCH_URL, NCPDP_SENDER_ID, NCPDP_PASSWORD, and NCPDP_PROCESSOR_ID required"
      );
    }
  }

  /**
   * Submit a B1 (billing) claim transaction
   * Standard claim submission to insurance
   *
   * @param claimData - Claim information to submit
   * @returns Claim response from switch
   */
  async submitClaim(claimData: ClaimData): Promise<ClaimResponse> {
    try {
      logger.info(
        `[NCPDP] Submitting claim for patient: ${claimData.patientLastName}, ${claimData.patientFirstName}`
      );

      // Build NCPDP segments
      const segments = this.buildClaimSegments(claimData);
      const message = this.buildMessage("B1", segments);

      // Send to switch
      const response = await this.sendToSwitch(message);

      // Parse response
      const result = this.parseResponse(response);

      logger.info(`[NCPDP] Claim submitted, status: ${result.status}`);
      return result;
    } catch (error) {
      logger.error("[NCPDP] Claim submission failed", error);
      throw error;
    }
  }

  /**
   * Submit a B2 (reversal) transaction
   * Reverses a previously submitted claim
   *
   * @param claimId - Original claim ID to reverse
   * @returns Reversal response
   */
  async reverseClaim(claimId: string): Promise<ClaimResponse> {
    try {
      logger.info(`[NCPDP] Reversing claim: ${claimId}`);

      const message = this.buildMessage("B2", {
        claimId,
        timestamp: new Date().toISOString(),
      });

      const response = await this.sendToSwitch(message);
      const result = this.parseResponse(response);

      logger.info(`[NCPDP] Claim reversed, status: ${result.status}`);
      return result;
    } catch (error) {
      logger.error(`[NCPDP] Claim reversal failed for ${claimId}`, error);
      throw error;
    }
  }

  /**
   * Submit a B3 (rebill) transaction
   * Rebills a claim with modifications
   *
   * @param claimId - Original claim ID to rebill
   * @param changes - Changes to apply to claim
   * @returns Rebill response
   */
  async submitRebill(
    claimId: string,
    changes: Partial<ClaimData>
  ): Promise<ClaimResponse> {
    try {
      logger.info(`[NCPDP] Rebilling claim: ${claimId}`);

      // Merge original claim data with changes (in production, fetch original first)
      const mergedData: Partial<ClaimData> = {
        ...changes,
        claimNumber: claimId,
      };

      const segments = this.buildClaimSegments(mergedData as ClaimData);
      const message = this.buildMessage("B3", segments);

      const response = await this.sendToSwitch(message);
      const result = this.parseResponse(response);

      logger.info(`[NCPDP] Claim rebilled, status: ${result.status}`);
      return result;
    } catch (error) {
      logger.error(`[NCPDP] Claim rebill failed for ${claimId}`, error);
      throw error;
    }
  }

  /**
   * Submit E1 eligibility verification
   * Checks patient insurance coverage in real-time
   *
   * @param patientData - Patient information
   * @param planData - Insurance plan information
   * @returns Eligibility response
   */
  async checkEligibility(
    patientData: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    },
    planData: {
      memberId: string;
      bin: string;
      pcn?: string;
      groupNumber?: string;
      personCode?: string;
    }
  ): Promise<EligibilityResponse> {
    try {
      logger.info(
        `[NCPDP] Checking eligibility for ${patientData.lastName}, ${patientData.firstName}`
      );

      const eligData: EligibilityData = {
        patientFirstName: patientData.firstName,
        patientLastName: patientData.lastName,
        patientDateOfBirth: patientData.dateOfBirth,
        memberId: planData.memberId,
        planBin: planData.bin,
        planPcn: planData.pcn,
        groupNumber: planData.groupNumber,
        personCode: planData.personCode,
      };

      const segments = this.buildEligibilitySegments(eligData);
      const message = this.buildMessage("E1", segments);

      const response = await this.sendToSwitch(message);

      // Parse eligibility response
      const result = this.parseEligibilityResponse(response);

      logger.info(
        `[NCPDP] Eligibility check complete, eligible: ${result.eligible}`
      );
      return result;
    } catch (error) {
      logger.error("[NCPDP] Eligibility check failed", error);
      throw error;
    }
  }

  /**
   * Submit prior authorization request
   * Requests approval for non-formulary or restricted medications
   *
   * @param paData - Prior auth request data
   * @returns Prior auth response
   */
  async priorAuthRequest(paData: PriorAuthRequest): Promise<PriorAuthResponse> {
    try {
      logger.info(
        `[NCPDP] Submitting prior auth request for patient: ${paData.patientLastName}, ${paData.patientFirstName}`
      );

      // Build PA request message
      const message = this.buildPriorAuthMessage(paData);
      const response = await this.sendToSwitch(message);

      // Parse PA response
      const result = this.parsePriorAuthResponse(response);

      logger.info(
        `[NCPDP] Prior auth request submitted, approved: ${result.approved}`
      );
      return result;
    } catch (error) {
      logger.error("[NCPDP] Prior auth request failed", error);
      throw error;
    }
  }

  /**
   * Parse NCPDP D.0 response from switch
   *
   * @param rawResponse - Raw response from switch
   * @returns Parsed claim response
   */
  parseResponse(rawResponse: string): ClaimResponse {
    try {
      // NCPDP D.0 uses pipe-delimited segments
      const segments = rawResponse.split("|");

      // Segment 0: Transaction type and status
      const statusSegment = segments[0] || "";
      const status = this.mapStatusCode(statusSegment);

      // Segment 1+: Claim details
      const claimId = segments[1];
      const approvedAmount = segments[2] ? parseFloat(segments[2]) : undefined;
      const approvedCopay = segments[3] ? parseFloat(segments[3]) : undefined;

      // Extract denial codes if present
      const denialCodes: string[] = [];
      const denialMessages: string[] = [];
      for (let i = 4; i < segments.length; i++) {
        if (segments[i]?.startsWith("DEN")) {
          denialCodes.push(segments[i]);
        }
      }

      return {
        claimId,
        status,
        approvedAmount,
        approvedCopay,
        denialCodes: denialCodes.length > 0 ? denialCodes : undefined,
        denialMessages: denialMessages.length > 0 ? denialMessages : undefined,
        messageId: claimId || `msg-${Date.now()}`,
        rawResponse,
      };
    } catch (error) {
      logger.error("[NCPDP] Failed to parse response", error);
      return {
        status: "rejected",
        messageId: `msg-${Date.now()}`,
        rawResponse,
      };
    }
  }

  /**
   * Build NCPDP D.0 claim segments from claim data
   * Segments include:
   * - Header segment
   * - Insurance segment (ISA, GS, ST)
   * - Claim segments with patient, drug, and pricing fields
   * - Trailer segments
   *
   * @param claim - Claim data
   * @returns Segments for transmission
   */
  buildClaimSegments(claim: ClaimData): Record<string, string> {
    return {
      // ISA (Interchange Control Header)
      ISA: this.buildISASegment(),

      // GS (Functional Group Header)
      GS: this.buildGSSegment(),

      // ST (Transaction Set Header)
      ST: `ST|400|${this.formatField(String(Date.now()), 9, "N")}`,

      // 100 - Header (Claim level)
      "100": `100|1|${this.formatField(claim.claimNumber || "", 20, "AN")}`,

      // 200 - Insurance (Payer information)
      "200": `200|${this.formatField(claim.planBin, 10, "AN")}|${this.formatField(
        claim.planPcn || "",
        10,
        "AN"
      )}|${this.formatField(claim.groupNumber || "", 30, "AN")}`,

      // 210 - Patient
      "210": `210|${this.formatField(claim.patientFirstName, 12, "AN")}|${this.formatField(
        claim.patientLastName,
        33,
        "AN"
      )}|${this.formatField(claim.patientDateOfBirth, 8, "D")}|${claim.patientGender}|${this.formatField(
        claim.memberId,
        50,
        "AN"
      )}`,

      // 220 - Pharmacy
      "220": `220|${this.formatField(claim.pharmacyNpi, 10, "AN")}|${this.formatField(
        claim.pharmacyNcpdpId,
        10,
        "AN"
      )}`,

      // 230 - Prescriber
      "230": `230|${this.formatField(claim.prescriberNpi, 10, "AN")}|${this.formatField(
        claim.prescriberLicense || "",
        20,
        "AN"
      )}|${this.formatField(claim.prescriberState || "", 2, "AN")}`,

      // 300 - Drug (Prescription information)
      "300": `300|${this.formatField(claim.drugNdc, 15, "AN")}|${this.formatField(
        String(claim.quantity),
        8,
        "R"
      )}|${this.formatField(String(claim.daysSupply), 4, "N")}|${this.formatField(
        String(claim.refillNumber),
        2,
        "N"
      )}|${this.formatField(claim.dawCode || "", 2, "AN")}`,

      // 400 - Pricing (Claim pricing)
      "400": `400|${this.formatField(String(claim.ingredientCost), 12, "R")}|${this.formatField(
        String(claim.dispensingFee),
        12,
        "R"
      )}|${this.formatField(String(claim.totalAmount), 12, "R")}|${this.formatField(
        String(claim.patientCopay || 0),
        12,
        "R"
      )}`,

      // SE (Transaction Set Trailer)
      SE: "SE|8|1",

      // GE (Functional Group Trailer)
      GE: "GE|1|1",

      // IEA (Interchange Control Trailer)
      IEA: "IEA|1|000000001",
    };
  }

  /**
   * Test switch connectivity
   * Verifies credentials and basic connectivity
   *
   * @returns Connection status
   */
  async testConnection(): Promise<{
    connected: boolean;
    message: string;
    timestamp: Date;
  }> {
    try {
      logger.info("[NCPDP] Testing switch connection");

      const testMessage = `ISA|00|${this.formatField("", 10, "AN")}|00|${this.formatField(
        "",
        10,
        "AN"
      )}|01|${this.formatField(this.senderId, 15, "AN")}|01|${this.formatField(
        this.processorId,
        15,
        "AN"
      )}|000101|0001|X|00401`;

      const response = await this.sendToSwitch(testMessage);

      const connected = !!response && !response.includes("ERROR");

      logger.info(`[NCPDP] Connection test: ${connected ? "success" : "failed"}`);

      return {
        connected,
        message: connected ? "Connection successful" : "Connection failed",
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("[NCPDP] Connection test failed", error);
      return {
        connected: false,
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Format field per NCPDP specification
   *
   * @param value - Value to format
   * @param length - Field length
   * @param type - Field type (AN=alphanumeric, N=numeric, D=date, R=real/decimal)
   * @returns Formatted field
   */
  formatField(value: string, length: number, type: FieldType): string {
    if (!value) {
      return "".padEnd(length);
    }

    switch (type) {
      case "AN": // Alphanumeric - left justify, pad right
        return value.substring(0, length).padEnd(length);

      case "N": // Numeric - right justify, pad left with zeros
        return value.padStart(length, "0").substring(0, length);

      case "D": // Date - YYYYMMDD format, right justify
        return value.padStart(length, "0").substring(0, length);

      case "R": // Real/Decimal - format with 2 decimal places, right justify
        const num = parseFloat(value);
        const formatted = (num * 100).toString().padStart(length, "0");
        return formatted.substring(0, length);

      default:
        return value.substring(0, length).padEnd(length);
    }
  }

  /**
   * Internal: Build ISA header segment
   */
  private buildISASegment(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;
    const time = `${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    return `ISA|00|          |00|          |01|${this.formatField(
      this.senderId,
      15,
      "AN"
    )}|01|${this.formatField(
      this.processorId,
      15,
      "AN"
    )}|${date}|${time}|^|00401|000000001|0|P|:`;
  }

  /**
   * Internal: Build GS header segment
   */
  private buildGSSegment(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;
    const time = `${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    return `GS|HC|${this.senderId}|${this.processorId}|${date}|${time}|1|X|004010`;
  }

  /**
   * Internal: Build eligibility segments
   */
  private buildEligibilitySegments(
    eligData: EligibilityData
  ): Record<string, string> {
    return {
      "100": `100|1|${Date.now()}`,
      "200": `200|${this.formatField(eligData.planBin, 10, "AN")}|${this.formatField(
        eligData.planPcn || "",
        10,
        "AN"
      )}`,
      "210": `210|${this.formatField(
        eligData.patientFirstName,
        12,
        "AN"
      )}|${this.formatField(eligData.patientLastName, 33, "AN")}|${this.formatField(
        eligData.patientDateOfBirth,
        8,
        "D"
      )}|${this.formatField(eligData.memberId, 50, "AN")}`,
    };
  }

  /**
   * Internal: Build prior auth message
   */
  private buildPriorAuthMessage(paData: PriorAuthRequest): string {
    const segments = [
      this.buildISASegment(),
      this.buildGSSegment(),
      `ST|PA1|${Date.now()}`,
      `100|1|${Date.now()}`,
      `200|${this.formatField(paData.planBin, 10, "AN")}`,
      `210|${this.formatField(
        paData.patientFirstName,
        12,
        "AN"
      )}|${this.formatField(paData.patientLastName, 33, "AN")}|${this.formatField(
        paData.patientDateOfBirth,
        8,
        "D"
      )}|${this.formatField(paData.memberId, 50, "AN")}`,
      `300|${this.formatField(paData.drugNdc, 15, "AN")}|${this.formatField(
        String(paData.quantity),
        8,
        "R"
      )}|${this.formatField(String(paData.daysSupply), 4, "N")}`,
      `SE|7|1`,
      `GE|1|1`,
      `IEA|1|000000001`,
    ];

    return segments.join("\n");
  }

  /**
   * Internal: Build generic message
   */
  private buildMessage(
    type: TransactionType,
    data: Record<string, unknown>
  ): string {
    if (typeof data === "object" && data !== null) {
      return JSON.stringify({ type, ...data });
    }
    return `${type}|${String(data)}`;
  }

  /**
   * Internal: Send to switch
   */
  private async sendToSwitch(message: string): Promise<string> {
    const response = await fetch(this.switchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Basic ${Buffer.from(
          `${this.senderId}:${this.password}`
        ).toString("base64")}`,
      },
      body: message,
    });

    if (!response.ok) {
      throw new Error(
        `Switch returned ${response.status}: ${await response.text()}`
      );
    }

    return response.text();
  }

  /**
   * Internal: Map status code to ClaimStatus
   */
  private mapStatusCode(code: string): ClaimStatus {
    const codeMap: Record<string, ClaimStatus> = {
      "1": "approved",
      "2": "rejected",
      "3": "pended",
      "4": "denied",
      "5": "hold",
    };

    return codeMap[code] || "pending";
  }

  /**
   * Internal: Parse eligibility response
   */
  private parseEligibilityResponse(response: string): EligibilityResponse {
    try {
      const segments = response.split("|");
      return {
        eligible: segments[0] === "1",
        effectiveDate: segments[1],
        terminationDate: segments[2],
        copayAmount: segments[3] ? parseFloat(segments[3]) : undefined,
        deductible: segments[4] ? parseFloat(segments[4]) : undefined,
        deductibleMet: segments[5] ? parseFloat(segments[5]) : undefined,
        maxOutOfPocket: segments[6] ? parseFloat(segments[6]) : undefined,
        coverage: segments[7],
        responseCode: segments[8],
      };
    } catch {
      return { eligible: false };
    }
  }

  /**
   * Internal: Parse prior auth response
   */
  private parsePriorAuthResponse(response: string): PriorAuthResponse {
    try {
      const segments = response.split("|");
      return {
        approved: segments[0] === "1",
        authCode: segments[1],
        expirationDate: segments[2],
        messageId: segments[3] || `msg-${Date.now()}`,
        denialReason: segments[4],
      };
    } catch {
      return {
        approved: false,
        messageId: `msg-${Date.now()}`,
      };
    }
  }
}

/**
 * Create a singleton instance with environment variables
 */
export const ncpdpClaimsClient = new NCPDPClaimsClient();
