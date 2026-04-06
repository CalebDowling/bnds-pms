/**
 * Stripe Terminal Integration for BNDS PMS Point-of-Sale
 *
 * Manages card-present payments (tap/swipe/insert) via Stripe Terminal,
 * including reader discovery, payment intent creation for prescription copays,
 * FSA/HSA card support, and refund processing.
 *
 * Uses native fetch against the Stripe REST API — no external SDK packages.
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY           — Stripe secret API key
 *   STRIPE_TERMINAL_LOCATION_ID — Stripe Terminal location for this pharmacy
 */

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_TERMINAL_LOCATION_ID = process.env.STRIPE_TERMINAL_LOCATION_ID;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payment methods accepted at the physical terminal. */
export type TerminalPaymentMethod =
  | "card_present"
  | "contactless"
  | "manual_entry";

/** High-level status for a terminal payment intent. */
export type TerminalPaymentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "succeeded"
  | "canceled";

/** Card brand identifiers returned by Stripe. */
export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "diners"
  | "jcb"
  | "unionpay"
  | "unknown";

/** Card funding type — used to flag FSA / HSA cards. */
export type CardFunding = "credit" | "debit" | "prepaid" | "unknown";

export interface TerminalReader {
  id: string;
  object: "terminal.reader";
  label: string;
  serial_number: string;
  device_type: string;
  status: "online" | "offline";
  ip_address?: string;
  location?: string;
  action?: ReaderAction | null;
}

export interface ReaderAction {
  type: string;
  status: "in_progress" | "succeeded" | "failed";
  failure_code?: string;
  failure_message?: string;
  process_payment_intent?: { payment_intent: string };
}

export interface TerminalPaymentIntent {
  id: string;
  object: "payment_intent";
  amount: number;
  amount_received: number;
  currency: string;
  status: TerminalPaymentStatus;
  client_secret: string;
  description?: string;
  metadata: Record<string, string>;
  payment_method_types: string[];
  capture_method: "automatic" | "manual";
  charges?: {
    data: TerminalCharge[];
  };
  latest_charge?: string;
}

export interface TerminalCharge {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  payment_method_details?: {
    card_present?: {
      brand: CardBrand;
      last4: string;
      exp_month: number;
      exp_year: number;
      funding: CardFunding;
      read_method: "contact_emv" | "contactless_emv" | "magnetic_stripe_track2" | "contactless_magstripe_mode";
      receipt?: {
        application_preferred_name: string;
        dedicated_file_name: string;
      };
    };
  };
  refunded: boolean;
  amount_refunded: number;
}

export interface TerminalRefund {
  id: string;
  object: "refund";
  amount: number;
  charge: string;
  currency: string;
  payment_intent: string;
  status: "succeeded" | "failed" | "pending" | "canceled";
  reason?: string;
  created: number;
}

export interface ConnectionToken {
  object: "terminal.connection_token";
  secret: string;
  location?: string;
}

export interface CreatePaymentIntentParams {
  /** Amount in cents (e.g., 1250 = $12.50). */
  amount: number;
  /** Optional fill ID to link the payment to a prescription fill. */
  fillId?: string;
  /** Patient ID for the transaction. */
  patientId?: string;
  /** POS session ID for reconciliation. */
  sessionId?: string;
  /** Free-text description (shown on receipt). */
  description?: string;
  /** How the card is read — defaults to card_present. */
  paymentMethod?: TerminalPaymentMethod;
  /** Whether this is an FSA/HSA-eligible purchase. */
  isFsaHsa?: boolean;
  /** Additional metadata to attach to the intent. */
  metadata?: Record<string, string>;
}

export interface ProcessPaymentParams {
  /** Stripe reader ID (e.g., tmr_xxx). */
  readerId: string;
  /** Payment intent ID to collect. */
  paymentIntentId: string;
}

export interface RefundPaymentParams {
  /** Payment intent ID to refund. */
  paymentIntentId: string;
  /** Optional partial refund amount in cents. Omit for full refund. */
  amount?: number;
  /** Reason for the refund. */
  reason?: "requested_by_customer" | "duplicate" | "fraudulent";
}

export interface RegisterReaderParams {
  /** Registration code displayed on the reader. */
  registrationCode: string;
  /** Human-readable label (e.g., "Front Counter"). */
  label: string;
}

export interface StripeTerminalResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class StripeTerminalClient {
  private readonly baseUrl = "https://api.stripe.com/v1";
  private readonly isDev: boolean;

  constructor() {
    this.isDev = !STRIPE_SECRET_KEY;
    if (this.isDev) {
      logger.warn("[StripeTerminal] No STRIPE_SECRET_KEY — running in dev/mock mode");
    }
  }

  // -----------------------------------------------------------------------
  // HTTP helpers
  // -----------------------------------------------------------------------

  private getAuthHeader(): string {
    return `Bearer ${STRIPE_SECRET_KEY}`;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "POST",
    body?: URLSearchParams
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? body.toString() : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const err = (data as Record<string, any>).error || {};
      const code = err.code || `http_${response.status}`;
      const message = err.message || `Stripe API error (HTTP ${response.status})`;
      logger.error(`[StripeTerminal] ${method} ${endpoint} failed: ${message}`);
      const error = new Error(message) as Error & { code: string };
      error.code = code;
      throw error;
    }

    return data as T;
  }

  // -----------------------------------------------------------------------
  // Connection tokens
  // -----------------------------------------------------------------------

  /**
   * Create a connection token for the Stripe Terminal JS SDK.
   * The SDK calls this to authenticate the reader.
   */
  async createConnectionToken(): Promise<StripeTerminalResponse<ConnectionToken>> {
    try {
      if (this.isDev) {
        logger.info("[StripeTerminal:DEV] Creating mock connection token");
        return {
          success: true,
          data: {
            object: "terminal.connection_token",
            secret: `pst_test_dev_${Date.now()}`,
            location: STRIPE_TERMINAL_LOCATION_ID || "tml_dev_location",
          },
        };
      }

      const params = new URLSearchParams();
      if (STRIPE_TERMINAL_LOCATION_ID) {
        params.append("location", STRIPE_TERMINAL_LOCATION_ID);
      }

      const token = await this.request<ConnectionToken>(
        "/terminal/connection_tokens",
        "POST",
        params.toString() ? params : undefined
      );

      logger.info("[StripeTerminal] Connection token created");
      return { success: true, data: token };
    } catch (error) {
      return this.handleError<ConnectionToken>(error, "createConnectionToken");
    }
  }

  // -----------------------------------------------------------------------
  // Payment intents
  // -----------------------------------------------------------------------

  /**
   * Create a payment intent configured for card-present (terminal) payments.
   *
   * For FSA/HSA transactions the intent is tagged with metadata so the
   * issuer can recognise it as a qualified medical expense.
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<StripeTerminalResponse<TerminalPaymentIntent>> {
    try {
      const {
        amount,
        fillId,
        patientId,
        sessionId,
        description,
        paymentMethod = "card_present",
        isFsaHsa = false,
        metadata = {},
      } = params;

      if (!Number.isInteger(amount) || amount < 1) {
        return {
          success: false,
          error: "Amount must be a positive integer (cents)",
          errorCode: "invalid_amount",
        };
      }

      // Build metadata for pharmacy context
      const intentMetadata: Record<string, string> = {
        ...metadata,
        source: "bnds_pms_terminal",
        payment_method_type: paymentMethod,
      };
      if (fillId) intentMetadata.fill_id = fillId;
      if (patientId) intentMetadata.patient_id = patientId;
      if (sessionId) intentMetadata.session_id = sessionId;
      if (isFsaHsa) {
        intentMetadata.fsa_hsa = "true";
        intentMetadata.merchant_category_code = "5912"; // MCC for pharmacies
      }

      if (this.isDev) {
        logger.info(
          `[StripeTerminal:DEV] Creating payment intent: $${(amount / 100).toFixed(2)} [${paymentMethod}]`
        );
        return {
          success: true,
          data: {
            id: `pi_dev_${Date.now()}`,
            object: "payment_intent",
            amount,
            amount_received: 0,
            currency: "usd",
            status: "requires_payment_method",
            client_secret: `pi_dev_${Date.now()}_secret`,
            description: description || "Prescription copay",
            metadata: intentMetadata,
            payment_method_types: ["card_present"],
            capture_method: "automatic",
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("amount", String(amount));
      formData.append("currency", "usd");
      formData.append("payment_method_types[]", "card_present");
      formData.append("capture_method", "automatic");

      if (description) {
        formData.append("description", description);
      } else {
        formData.append("description", "Prescription copay — BNDS Pharmacy");
      }

      for (const [key, value] of Object.entries(intentMetadata)) {
        formData.append(`metadata[${key}]`, value);
      }

      const intent = await this.request<TerminalPaymentIntent>(
        "/payment_intents",
        "POST",
        formData
      );

      logger.info(
        `[StripeTerminal] Created payment intent ${intent.id}: $${(amount / 100).toFixed(2)}`
      );

      return { success: true, data: intent };
    } catch (error) {
      return this.handleError<TerminalPaymentIntent>(error, "createPaymentIntent");
    }
  }

  // -----------------------------------------------------------------------
  // Process payment (hand-off to reader)
  // -----------------------------------------------------------------------

  /**
   * Instruct a terminal reader to collect payment for a given intent.
   * The reader will prompt the customer to tap / insert / swipe.
   */
  async processPayment(
    params: ProcessPaymentParams
  ): Promise<StripeTerminalResponse<TerminalReader>> {
    try {
      const { readerId, paymentIntentId } = params;

      if (!readerId) {
        return { success: false, error: "readerId is required", errorCode: "missing_reader" };
      }
      if (!paymentIntentId) {
        return { success: false, error: "paymentIntentId is required", errorCode: "missing_intent" };
      }

      if (this.isDev) {
        logger.info(
          `[StripeTerminal:DEV] Processing ${paymentIntentId} on reader ${readerId}`
        );
        return {
          success: true,
          data: {
            id: readerId,
            object: "terminal.reader",
            label: "Dev Reader",
            serial_number: "DEV-000",
            device_type: "simulated_wisepos_e",
            status: "online",
            action: {
              type: "process_payment_intent",
              status: "succeeded",
              process_payment_intent: { payment_intent: paymentIntentId },
            },
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("payment_intent", paymentIntentId);

      const reader = await this.request<TerminalReader>(
        `/terminal/readers/${encodeURIComponent(readerId)}/process_payment_intent`,
        "POST",
        formData
      );

      logger.info(
        `[StripeTerminal] Reader ${readerId} processing ${paymentIntentId} — action: ${reader.action?.status}`
      );

      return { success: true, data: reader };
    } catch (error) {
      return this.handleError<TerminalReader>(error, "processPayment");
    }
  }

  /**
   * Capture (confirm) a payment intent that is in requires_capture status.
   * Used when capture_method is "manual".
   */
  async capturePaymentIntent(
    paymentIntentId: string
  ): Promise<StripeTerminalResponse<TerminalPaymentIntent>> {
    try {
      if (!paymentIntentId) {
        return { success: false, error: "paymentIntentId is required", errorCode: "missing_intent" };
      }

      if (this.isDev) {
        logger.info(`[StripeTerminal:DEV] Capturing ${paymentIntentId}`);
        return {
          success: true,
          data: {
            id: paymentIntentId,
            object: "payment_intent",
            amount: 0,
            amount_received: 0,
            currency: "usd",
            status: "succeeded",
            client_secret: "",
            metadata: {},
            payment_method_types: ["card_present"],
            capture_method: "manual",
          },
        };
      }

      const intent = await this.request<TerminalPaymentIntent>(
        `/payment_intents/${encodeURIComponent(paymentIntentId)}/capture`,
        "POST"
      );

      logger.info(`[StripeTerminal] Captured ${paymentIntentId} — status: ${intent.status}`);

      return { success: true, data: intent };
    } catch (error) {
      return this.handleError<TerminalPaymentIntent>(error, "capturePaymentIntent");
    }
  }

  /**
   * Cancel a payment intent that has not yet been captured.
   */
  async cancelPaymentIntent(
    paymentIntentId: string
  ): Promise<StripeTerminalResponse<TerminalPaymentIntent>> {
    try {
      if (!paymentIntentId) {
        return { success: false, error: "paymentIntentId is required", errorCode: "missing_intent" };
      }

      if (this.isDev) {
        logger.info(`[StripeTerminal:DEV] Canceling ${paymentIntentId}`);
        return {
          success: true,
          data: {
            id: paymentIntentId,
            object: "payment_intent",
            amount: 0,
            amount_received: 0,
            currency: "usd",
            status: "canceled",
            client_secret: "",
            metadata: {},
            payment_method_types: ["card_present"],
            capture_method: "automatic",
          },
        };
      }

      const intent = await this.request<TerminalPaymentIntent>(
        `/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
        "POST"
      );

      logger.info(`[StripeTerminal] Canceled ${paymentIntentId}`);

      return { success: true, data: intent };
    } catch (error) {
      return this.handleError<TerminalPaymentIntent>(error, "cancelPaymentIntent");
    }
  }

  /**
   * Retrieve the current state of a payment intent.
   */
  async getPaymentIntent(
    paymentIntentId: string
  ): Promise<StripeTerminalResponse<TerminalPaymentIntent>> {
    try {
      if (!paymentIntentId) {
        return { success: false, error: "paymentIntentId is required", errorCode: "missing_intent" };
      }

      if (this.isDev) {
        return {
          success: true,
          data: {
            id: paymentIntentId,
            object: "payment_intent",
            amount: 0,
            amount_received: 0,
            currency: "usd",
            status: "requires_payment_method",
            client_secret: "",
            metadata: {},
            payment_method_types: ["card_present"],
            capture_method: "automatic",
          },
        };
      }

      const intent = await this.request<TerminalPaymentIntent>(
        `/payment_intents/${encodeURIComponent(paymentIntentId)}`,
        "GET"
      );

      return { success: true, data: intent };
    } catch (error) {
      return this.handleError<TerminalPaymentIntent>(error, "getPaymentIntent");
    }
  }

  // -----------------------------------------------------------------------
  // Refunds
  // -----------------------------------------------------------------------

  /**
   * Issue a full or partial refund for a terminal payment.
   */
  async refundPayment(
    params: RefundPaymentParams
  ): Promise<StripeTerminalResponse<TerminalRefund>> {
    try {
      const { paymentIntentId, amount, reason } = params;

      if (!paymentIntentId) {
        return { success: false, error: "paymentIntentId is required", errorCode: "missing_intent" };
      }

      if (amount !== undefined && (!Number.isInteger(amount) || amount < 1)) {
        return {
          success: false,
          error: "Refund amount must be a positive integer (cents)",
          errorCode: "invalid_amount",
        };
      }

      if (this.isDev) {
        logger.info(
          `[StripeTerminal:DEV] Refunding ${paymentIntentId}` +
            (amount ? ` ($${(amount / 100).toFixed(2)})` : " (full)")
        );
        return {
          success: true,
          data: {
            id: `re_dev_${Date.now()}`,
            object: "refund",
            amount: amount || 0,
            charge: `ch_dev_${Date.now()}`,
            currency: "usd",
            payment_intent: paymentIntentId,
            status: "succeeded",
            reason: reason || "requested_by_customer",
            created: Math.floor(Date.now() / 1000),
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("payment_intent", paymentIntentId);

      if (amount) {
        formData.append("amount", String(amount));
      }

      if (reason) {
        formData.append("reason", reason);
      }

      const refund = await this.request<TerminalRefund>(
        "/refunds",
        "POST",
        formData
      );

      logger.info(
        `[StripeTerminal] Refund ${refund.id} for ${paymentIntentId}: $${(refund.amount / 100).toFixed(2)} — ${refund.status}`
      );

      return { success: true, data: refund };
    } catch (error) {
      return this.handleError<TerminalRefund>(error, "refundPayment");
    }
  }

  // -----------------------------------------------------------------------
  // Reader management
  // -----------------------------------------------------------------------

  /**
   * List all terminal readers at this location.
   */
  async listReaders(): Promise<StripeTerminalResponse<TerminalReader[]>> {
    try {
      if (this.isDev) {
        logger.info("[StripeTerminal:DEV] Listing mock readers");
        return {
          success: true,
          data: [
            {
              id: "tmr_dev_front",
              object: "terminal.reader",
              label: "Front Counter (Dev)",
              serial_number: "DEV-001",
              device_type: "simulated_wisepos_e",
              status: "online",
              location: STRIPE_TERMINAL_LOCATION_ID || "tml_dev_location",
            },
          ],
        };
      }

      const params = new URLSearchParams();
      if (STRIPE_TERMINAL_LOCATION_ID) {
        params.append("location", STRIPE_TERMINAL_LOCATION_ID);
      }
      params.append("limit", "100");

      const result = await this.request<{ data: TerminalReader[] }>(
        `/terminal/readers?${params.toString()}`,
        "GET"
      );

      logger.info(`[StripeTerminal] Found ${result.data.length} reader(s)`);

      return { success: true, data: result.data };
    } catch (error) {
      return this.handleError<TerminalReader[]>(error, "listReaders");
    }
  }

  /**
   * Register a new terminal reader at this pharmacy location.
   */
  async registerReader(
    params: RegisterReaderParams
  ): Promise<StripeTerminalResponse<TerminalReader>> {
    try {
      const { registrationCode, label } = params;

      if (!registrationCode) {
        return {
          success: false,
          error: "registrationCode is required",
          errorCode: "missing_registration_code",
        };
      }
      if (!label) {
        return { success: false, error: "label is required", errorCode: "missing_label" };
      }

      if (this.isDev) {
        logger.info(
          `[StripeTerminal:DEV] Registering reader "${label}" with code ${registrationCode}`
        );
        return {
          success: true,
          data: {
            id: `tmr_dev_${Date.now()}`,
            object: "terminal.reader",
            label,
            serial_number: `DEV-${registrationCode}`,
            device_type: "verifone_P400",
            status: "online",
            location: STRIPE_TERMINAL_LOCATION_ID || "tml_dev_location",
          },
        };
      }

      const locationId = STRIPE_TERMINAL_LOCATION_ID;
      if (!locationId) {
        return {
          success: false,
          error: "STRIPE_TERMINAL_LOCATION_ID environment variable is not set",
          errorCode: "missing_location",
        };
      }

      const formData = new URLSearchParams();
      formData.append("registration_code", registrationCode);
      formData.append("label", label);
      formData.append("location", locationId);

      const reader = await this.request<TerminalReader>(
        "/terminal/readers",
        "POST",
        formData
      );

      logger.info(
        `[StripeTerminal] Registered reader ${reader.id} ("${label}") — ${reader.device_type}`
      );

      return { success: true, data: reader };
    } catch (error) {
      return this.handleError<TerminalReader>(error, "registerReader");
    }
  }

  /**
   * Cancel the current action on a reader (e.g., cancel collecting a payment).
   */
  async cancelReaderAction(
    readerId: string
  ): Promise<StripeTerminalResponse<TerminalReader>> {
    try {
      if (!readerId) {
        return { success: false, error: "readerId is required", errorCode: "missing_reader" };
      }

      if (this.isDev) {
        logger.info(`[StripeTerminal:DEV] Canceling action on reader ${readerId}`);
        return {
          success: true,
          data: {
            id: readerId,
            object: "terminal.reader",
            label: "Dev Reader",
            serial_number: "DEV-000",
            device_type: "simulated_wisepos_e",
            status: "online",
            action: null,
          },
        };
      }

      const reader = await this.request<TerminalReader>(
        `/terminal/readers/${encodeURIComponent(readerId)}/cancel_action`,
        "POST"
      );

      logger.info(`[StripeTerminal] Canceled action on reader ${readerId}`);

      return { success: true, data: reader };
    } catch (error) {
      return this.handleError<TerminalReader>(error, "cancelReaderAction");
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private handleError<T>(error: unknown, method: string): StripeTerminalResponse<T> {
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = (error as any)?.code || "unknown";

    logger.error(`[StripeTerminal] ${method} failed: ${message} (code: ${code})`);

    return {
      success: false,
      error: message,
      errorCode: typeof code === "string" ? code : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton + named exports
// ---------------------------------------------------------------------------

const terminalClient = new StripeTerminalClient();

/** Create a connection token for the Terminal JS SDK. */
export const createConnectionToken = terminalClient.createConnectionToken.bind(terminalClient);

/** Create a card-present payment intent for a prescription copay. */
export const createPaymentIntent = terminalClient.createPaymentIntent.bind(terminalClient);

/** Send a payment intent to a reader for collection (tap/swipe/insert). */
export const processPayment = terminalClient.processPayment.bind(terminalClient);

/** Capture a payment intent that was authorized with manual capture. */
export const capturePaymentIntent = terminalClient.capturePaymentIntent.bind(terminalClient);

/** Cancel a payment intent before it is captured. */
export const cancelPaymentIntent = terminalClient.cancelPaymentIntent.bind(terminalClient);

/** Retrieve the current state of a payment intent. */
export const getPaymentIntent = terminalClient.getPaymentIntent.bind(terminalClient);

/** Issue a full or partial refund for a terminal payment. */
export const refundPayment = terminalClient.refundPayment.bind(terminalClient);

/** List all terminal readers at this pharmacy location. */
export const listReaders = terminalClient.listReaders.bind(terminalClient);

/** Register a new terminal reader. */
export const registerReader = terminalClient.registerReader.bind(terminalClient);

/** Cancel the current action on a reader. */
export const cancelReaderAction = terminalClient.cancelReaderAction.bind(terminalClient);

export default terminalClient;
