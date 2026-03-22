/**
 * SureScripts eRx/EPCS Integration
 *
 * SureScripts is the network that connects pharmacies to prescribers for:
 * - Electronic prescriptions (eRx)
 * - Electronic prescribing of controlled substances (EPCS)
 *
 * Uses NCPDP SCRIPT (National Council for Prescription Drug Programs) format.
 * Reference: NCPDP SCRIPT standards for RxHub/SureScripts
 */

import { logger } from "@/lib/logger";

/**
 * NCPDP SCRIPT message types
 */
type MessageType = "NEWRX" | "RXCHG" | "CANRX" | "RXREN" | "RXSTAT" | "ERROR";

/**
 * Status for RX acknowledgement
 */
type RxAckStatus = "received" | "rejected" | "pending" | "ready";

/**
 * Rx change types
 */
type ChangeType =
  | "quantity"
  | "strength"
  | "directions"
  | "daysSupply"
  | "refills"
  | "daw";

/**
 * Interface for inbound prescription message from SureScripts
 */
export interface InboundRxMessage {
  messageType: MessageType;
  messageId: string;
  timestamp: string;
  rxId?: string;
  patientName?: string;
  prescriberName?: string;
  drugName?: string;
  strength?: string;
  quantity?: string;
  directions?: string;
  refills?: number;
  daysSupply?: number;
  daw?: string;
  prescriberId?: string;
  npi?: string;
  controlledSubstance?: boolean;
  signature?: string; // For EPCS
  rawXml?: string;
}

/**
 * Interface for message status response
 */
export interface MessageStatus {
  messageId: string;
  status: "sent" | "delivered" | "failed" | "pending";
  sentAt: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

/**
 * Interface for API error response
 */
export interface SureScriptsError {
  code: string;
  message: string;
  details?: string;
}

/**
 * SureScripts API Client
 *
 * Handles all communication with SureScripts for eRx/EPCS operations.
 * Requires environment variables:
 * - SURESCRIPTS_PARTNER_ID: Pharmacy partner ID
 * - SURESCRIPTS_API_KEY: Authentication key
 * - SURESCRIPTS_ENDPOINT: Base URL for SureScripts API
 */
export class SureScriptsClient {
  private partnerId: string;
  private apiKey: string;
  private endpoint: string;
  private messageCache: Map<string, MessageStatus> = new Map();

  constructor(
    partnerId?: string,
    apiKey?: string,
    endpoint?: string
  ) {
    this.partnerId = partnerId || process.env.SURESCRIPTS_PARTNER_ID || "";
    this.apiKey = apiKey || process.env.SURESCRIPTS_API_KEY || "";
    this.endpoint = endpoint || process.env.SURESCRIPTS_ENDPOINT || "";

    if (!this.partnerId || !this.apiKey || !this.endpoint) {
      console.warn(
        "[SureScripts] Configuration incomplete — running in dev mode. Set SURESCRIPTS_PARTNER_ID, SURESCRIPTS_API_KEY, SURESCRIPTS_ENDPOINT to enable."
      );
    }
  }

  /**
   * Send RX acknowledgement (ACK) back to prescriber
   * Informs prescriber of receipt status
   *
   * @param rxId - Prescription external ID
   * @param status - Acknowledgement status (received, rejected, pending, ready)
   * @returns Message ID if successful
   */
  async sendNewRxResponse(
    rxId: string,
    status: RxAckStatus
  ): Promise<{ messageId: string }> {
    try {
      logger.info(`[SureScripts] Sending RX response for ${rxId}: ${status}`);

      const payload = {
        messageType: "RXACKN",
        rxId,
        status,
        timestamp: new Date().toISOString(),
        partnerId: this.partnerId,
      };

      const response = await this.sendToApi("/rxacknowledgement", payload);

      if (!response.messageId) {
        throw new Error("No messageId returned from SureScripts");
      }

      // Cache message status
      const messageId = String(response.messageId || "");
      this.messageCache.set(messageId, {
        messageId,
        status: "sent",
        sentAt: new Date(),
      });

      logger.info(`[SureScripts] RX response sent: ${messageId}`);
      return { messageId };
    } catch (error) {
      logger.error(`[SureScripts] Failed to send RX response for ${rxId}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Request therapy change from prescriber
   * Used when pharmacy needs to request different medication/quantity/etc
   *
   * @param rxId - Prescription external ID
   * @param changeType - Type of change requested
   * @param reason - Reason for change request
   * @returns Message ID if successful
   */
  async sendRxChangeRequest(
    rxId: string,
    changeType: ChangeType,
    reason: string
  ): Promise<{ messageId: string }> {
    try {
      logger.info(
        `[SureScripts] Requesting change for ${rxId}: ${changeType} - ${reason}`
      );

      const payload = {
        messageType: "RXCHG",
        rxId,
        changeType,
        reason,
        timestamp: new Date().toISOString(),
        partnerId: this.partnerId,
      };

      const response = await this.sendToApi("/rxchange", payload);

      if (!response.messageId) {
        throw new Error("No messageId returned from SureScripts");
      }

      const messageId = String(response.messageId || "");
      this.messageCache.set(messageId, {
        messageId,
        status: "sent",
        sentAt: new Date(),
      });

      logger.info(`[SureScripts] Change request sent: ${messageId}`);
      return { messageId };
    } catch (error) {
      logger.error(`[SureScripts] Failed to send RX change request for ${rxId}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Send refill/renewal request to prescriber
   * Requests authorization for additional fills
   *
   * @param rxId - Prescription external ID
   * @param patientId - Patient identifier
   * @returns Message ID if successful
   */
  async sendRxRenewalRequest(
    rxId: string,
    patientId: string
  ): Promise<{ messageId: string }> {
    try {
      logger.info(`[SureScripts] Requesting renewal for ${rxId}`);

      const payload = {
        messageType: "RXREN",
        rxId,
        patientId,
        timestamp: new Date().toISOString(),
        partnerId: this.partnerId,
      };

      const response = await this.sendToApi("/rxrenewal", payload);

      if (!response.messageId) {
        throw new Error("No messageId returned from SureScripts");
      }

      const messageId = String(response.messageId || "");
      this.messageCache.set(messageId, {
        messageId,
        status: "sent",
        sentAt: new Date(),
      });

      logger.info(`[SureScripts] Renewal request sent: ${messageId}`);
      return { messageId };
    } catch (error) {
      logger.error(`[SureScripts] Failed to send renewal request for ${rxId}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Cancel an existing prescription with prescriber
   *
   * @param rxId - Prescription external ID
   * @param reason - Reason for cancellation
   * @returns Message ID if successful
   */
  async sendCancelRx(
    rxId: string,
    reason: string
  ): Promise<{ messageId: string }> {
    try {
      logger.info(`[SureScripts] Cancelling prescription ${rxId}: ${reason}`);

      const payload = {
        messageType: "CANRX",
        rxId,
        reason,
        timestamp: new Date().toISOString(),
        partnerId: this.partnerId,
      };

      const response = await this.sendToApi("/rxcancel", payload);

      if (!response.messageId) {
        throw new Error("No messageId returned from SureScripts");
      }

      const messageId = String(response.messageId || "");
      this.messageCache.set(messageId, {
        messageId,
        status: "sent",
        sentAt: new Date(),
      });

      logger.info(`[SureScripts] Cancel request sent: ${messageId}`);
      return { messageId };
    } catch (error) {
      logger.error(`[SureScripts] Failed to cancel prescription ${rxId}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Get status of a previously sent message
   *
   * @param messageId - Message ID to check
   * @returns Message status
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    try {
      logger.info(`[SureScripts] Checking message status: ${messageId}`);

      // Check cache first
      const cached = this.messageCache.get(messageId);
      if (cached && cached.status !== "pending") {
        return cached;
      }

      const response = await this.sendToApi(`/messagestatus/${messageId}`, {});

      const statusStr = String(response.status || "pending") as MessageStatus["status"];
      const sentAtVal = response.sentAt ? new Date(String(response.sentAt)) : new Date();
      const deliveredAtVal = response.deliveredAt ? new Date(String(response.deliveredAt)) : undefined;

      const status: MessageStatus = {
        messageId: String(response.messageId || messageId),
        status: statusStr,
        sentAt: sentAtVal,
        deliveredAt: deliveredAtVal,
        errorMessage: response.errorMessage ? String(response.errorMessage) : undefined,
      };

      // Update cache
      this.messageCache.set(messageId, status);

      return status;
    } catch (error) {
      logger.error(`[SureScripts] Failed to get message status for ${messageId}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Process inbound message from SureScripts webhook
   * Parses NCPDP SCRIPT XML format
   *
   * @param xml - Raw XML message from SureScripts
   * @returns Parsed message
   */
  async processInboundMessage(xml: string): Promise<InboundRxMessage> {
    try {
      logger.info("[SureScripts] Processing inbound message");

      // Parse XML (simplified — in production use proper XML parser like xml2js)
      const message = this.parseNcpdpScript(xml);

      logger.info(`[SureScripts] Parsed message type: ${message.messageType}`);

      return message;
    } catch (error) {
      logger.error("[SureScripts] Failed to process inbound message", error);
      throw this.formatError(error);
    }
  }

  /**
   * Verify EPCS (Electronic Prescribing of Controlled Substances) signature
   * Stub for EPCS verification — full implementation requires:
   * - Certificate chain validation
   * - Timestamp verification
   * - DEA EPCS rules compliance
   *
   * @param rxData - Prescription data with signature
   * @returns True if signature is valid
   */
  async verifyEPCSSignature(rxData: {
    signature?: string;
    timestamp?: string;
    prescriberId?: string;
  }): Promise<boolean> {
    try {
      logger.info("[SureScripts] Verifying EPCS signature");

      if (!rxData.signature) {
        logger.warn("[SureScripts] No EPCS signature provided");
        return false;
      }

      // TODO: Implement full EPCS signature verification
      // - Validate signature against prescriber certificate
      // - Check timestamp is within acceptable range
      // - Verify DEA compliance (Form 106 requirements, etc)
      // - Log all verification attempts for audit trail

      logger.info("[SureScripts] EPCS signature verification placeholder");
      return true;
    } catch (error) {
      logger.error("[SureScripts] EPCS signature verification failed", error);
      return false;
    }
  }

  /**
   * Test connection to SureScripts
   * Verifies credentials and connectivity
   *
   * @returns Status object
   */
  async testConnection(): Promise<{
    connected: boolean;
    message: string;
    timestamp: Date;
  }> {
    try {
      logger.info("[SureScripts] Testing connection");

      const response = await this.sendToApi("/healthcheck", {});

      const result = {
        connected: response.status === "ok",
        message: String(response.message || "Connection successful"),
        timestamp: new Date(),
      };

      logger.info(`[SureScripts] Connection test result: ${result.connected}`);
      return result;
    } catch (error) {
      logger.error("[SureScripts] Connection test failed", error);
      return {
        connected: false,
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Internal: Send request to SureScripts API
   */
  private async sendToApi(
    path: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `${this.endpoint}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Partner-ID": this.partnerId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw {
        status: response.status,
        ...error,
      };
    }

    const data = (await response.json()) as Record<string, unknown>;
    return data;
  }

  /**
   * Internal: Parse NCPDP SCRIPT XML format
   * Simplified parser — production should use xml2js or similar
   */
  private parseNcpdpScript(xml: string): InboundRxMessage {
    // Extract message type from XML (simplified regex)
    const typeMatch = xml.match(/<MessageType>(\w+)<\/MessageType>/);
    const messageType = (typeMatch?.[1] || "ERROR") as MessageType;

    // Extract key fields (simplified)
    const extract = (field: string): string | undefined => {
      const match = xml.match(new RegExp(`<${field}>([^<]+)</${field}>`));
      return match?.[1];
    };

    return {
      messageType,
      messageId: extract("MessageID") || "",
      timestamp: extract("Timestamp") || new Date().toISOString(),
      rxId: extract("RxID"),
      patientName: extract("PatientName"),
      prescriberName: extract("PrescriberName"),
      drugName: extract("DrugName"),
      strength: extract("Strength"),
      quantity: extract("Quantity"),
      directions: extract("Directions"),
      refills: extract("Refills") ? parseInt(extract("Refills")!) : undefined,
      daysSupply: extract("DaysSupply") ? parseInt(extract("DaysSupply")!) : undefined,
      daw: extract("DAW"),
      prescriberId: extract("PrescriberId"),
      npi: extract("NPI"),
      controlledSubstance: extract("ControlledSubstance") === "true",
      signature: extract("Signature"),
      rawXml: xml,
    };
  }

  /**
   * Internal: Format error for consistent error handling
   */
  private formatError(error: unknown): SureScriptsError {
    if (error instanceof Error) {
      return {
        code: "SURESCRIPTS_ERROR",
        message: error.message,
      };
    }

    if (typeof error === "object" && error !== null) {
      const err = error as Record<string, unknown>;
      return {
        code: String(err.code || "SURESCRIPTS_ERROR"),
        message: String(err.message || "Unknown error"),
        details: String(err.details || undefined),
      };
    }

    return {
      code: "SURESCRIPTS_ERROR",
      message: String(error),
    };
  }
}

/**
 * Create a singleton instance with environment variables
 */
export const surescriptsClient = new SureScriptsClient();
