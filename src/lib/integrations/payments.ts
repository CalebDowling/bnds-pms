/**
 * Payment Processing Integration (Stripe)
 * Handles payment intents, refunds, customers, and webhook processing
 * Uses native fetch - no external packages
 */

import { logger } from "@/lib/logger";
import crypto from "crypto";

// Environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Type definitions
export interface PaymentIntent {
  id: string;
  object: "payment_intent";
  amount: number;
  currency: string;
  status: "requires_payment_method" | "requires_confirmation" | "requires_action" | "processing" | "requires_capture" | "succeeded" | "canceled";
  client_secret: string;
  customer?: string;
  description?: string;
  metadata?: Record<string, string>;
  charges?: {
    data: PaymentCharge[];
  };
}

export interface PaymentCharge {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed";
  refunded: boolean;
  amountRefunded: number;
}

export interface StripeCustomer {
  id: string;
  object: "customer";
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  created: number;
}

export interface PaymentMethod {
  id: string;
  object: "payment_method";
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface Refund {
  id: string;
  object: "refund";
  charge: string;
  amount: number;
  status: "succeeded" | "failed" | "pending" | "canceled";
  reason?: string;
  created: number;
}

export interface PaymentHistoryFilter {
  limit?: number;
  startingAfter?: string;
  created?: {
    gte?: number;
    lte?: number;
  };
}

export interface PatientData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface StripeAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Stripe Payment Client
 * Handles all payment operations via Stripe REST API
 */
class StripePaymentClient {
  private secretKey: string | undefined;
  private publishableKey: string | undefined;
  private webhookSecret: string | undefined;
  private baseUrl = "https://api.stripe.com/v1";
  private isDev: boolean;

  constructor() {
    this.secretKey = STRIPE_SECRET_KEY;
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;
    this.webhookSecret = STRIPE_WEBHOOK_SECRET;
    this.isDev = !this.secretKey;
  }

  /**
   * Create Authorization header with Bearer token
   */
  private getAuthHeader(): string {
    if (!this.secretKey) {
      return "";
    }
    return `Bearer ${this.secretKey}`;
  }

  /**
   * Generic fetch wrapper for Stripe API calls
   */
  private async fetchStripe<T>(
    endpoint: string,
    method: "GET" | "POST" = "POST",
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
      const error = (data as any).error || {};
      const errorMsg = error.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string = "usd",
    metadata?: Record<string, string>
  ): Promise<StripeAPIResponse<PaymentIntent>> {
    try {
      if (!Number.isInteger(amount) || amount < 1) {
        return {
          success: false,
          error: "Invalid amount - must be positive integer",
        };
      }

      if (this.isDev) {
        logger.info(
          `[Stripe Payment Intent - DEV] Amount: ${amount} ${currency}`
        );
        return {
          success: true,
          data: {
            id: `pi_dev_${Date.now()}`,
            object: "payment_intent",
            amount,
            currency,
            status: "requires_payment_method",
            client_secret: `pi_dev_${Date.now()}_secret_dev`,
            metadata,
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("amount", String(amount));
      formData.append("currency", currency);

      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          formData.append(`metadata[${key}]`, value);
        });
      }

      const intent = await this.fetchStripe<PaymentIntent>(
        "/payment_intents",
        "POST",
        formData
      );

      logger.info(
        `[Stripe] Created payment intent ${intent.id}: ${amount} ${currency}`
      );

      return {
        success: true,
        data: intent,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Stripe] Failed to create payment intent", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(
    paymentIntentId: string
  ): Promise<StripeAPIResponse<PaymentIntent>> {
    try {
      if (!paymentIntentId) {
        return {
          success: false,
          error: "Payment intent ID required",
        };
      }

      if (this.isDev) {
        logger.info(`[Stripe Capture - DEV] Intent: ${paymentIntentId}`);
        return {
          success: true,
          data: {
            id: paymentIntentId,
            object: "payment_intent",
            amount: 0,
            currency: "usd",
            status: "succeeded",
            client_secret: "dev_secret",
          },
        };
      }

      const formData = new URLSearchParams();
      const intent = await this.fetchStripe<PaymentIntent>(
        `/payment_intents/${paymentIntentId}/confirm`,
        "POST",
        formData
      );

      logger.info(
        `[Stripe] Captured payment intent ${paymentIntentId}: ${intent.status}`
      );

      return {
        success: true,
        data: intent,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[Stripe] Failed to capture payment ${paymentIntentId}`,
        error
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Refund a payment (full or partial)
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<StripeAPIResponse<Refund>> {
    try {
      if (!paymentIntentId) {
        return {
          success: false,
          error: "Payment intent ID required",
        };
      }

      if (this.isDev) {
        logger.info(
          `[Stripe Refund - DEV] Intent: ${paymentIntentId}, Amount: ${amount || "full"}`
        );
        return {
          success: true,
          data: {
            id: `re_dev_${Date.now()}`,
            object: "refund",
            charge: paymentIntentId,
            amount: amount || 0,
            status: "succeeded",
            created: Math.floor(Date.now() / 1000),
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("payment_intent", paymentIntentId);
      if (amount) {
        formData.append("amount", String(amount));
      }

      const refund = await this.fetchStripe<Refund>(
        "/refunds",
        "POST",
        formData
      );

      logger.info(
        `[Stripe] Refund ${refund.id} for intent ${paymentIntentId}: ${refund.status}`
      );

      return {
        success: true,
        data: refund,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[Stripe] Failed to refund payment ${paymentIntentId}`,
        error
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    paymentIntentId: string
  ): Promise<StripeAPIResponse<PaymentIntent>> {
    try {
      if (!paymentIntentId) {
        return {
          success: false,
          error: "Payment intent ID required",
        };
      }

      const intent = await this.fetchStripe<PaymentIntent>(
        `/payment_intents/${paymentIntentId}`,
        "GET"
      );

      logger.debug(`[Stripe] Payment ${paymentIntentId} status: ${intent.status}`);

      return {
        success: true,
        data: intent,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[Stripe] Failed to get payment status for ${paymentIntentId}`,
        error
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    filters?: PaymentHistoryFilter
  ): Promise<StripeAPIResponse<PaymentIntent[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.append("limit", String(filters.limit));
      if (filters?.startingAfter) params.append("starting_after", filters.startingAfter);
      if (filters?.created) {
        if (filters.created.gte)
          params.append("created[gte]", String(filters.created.gte));
        if (filters.created.lte)
          params.append("created[lte]", String(filters.created.lte));
      }

      const endpoint = `/payment_intents?${params.toString()}`;
      const response = await this.fetchStripe<{
        object: string;
        data: PaymentIntent[];
        has_more: boolean;
      }>(endpoint, "GET");

      logger.info(
        `[Stripe History] Retrieved ${response.data.length} payment intents`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Stripe History] Failed to retrieve transactions", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Create a Stripe customer linked to a patient
   */
  async createCustomer(
    patientData: PatientData
  ): Promise<StripeAPIResponse<StripeCustomer>> {
    try {
      if (!patientData.email) {
        return {
          success: false,
          error: "Patient email required",
        };
      }

      if (this.isDev) {
        logger.info(`[Stripe Customer - DEV] Email: ${patientData.email}`);
        return {
          success: true,
          data: {
            id: `cus_dev_${Date.now()}`,
            object: "customer",
            email: patientData.email,
            name: `${patientData.firstName || ""} ${patientData.lastName || ""}`.trim(),
            phone: patientData.phone,
            created: Math.floor(Date.now() / 1000),
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("email", patientData.email);
      if (patientData.firstName)
        formData.append("name", patientData.firstName);
      if (patientData.lastName)
        formData.append("description", patientData.lastName);
      if (patientData.phone) formData.append("phone", patientData.phone);

      if (patientData.address) {
        formData.append("address[line1]", patientData.address.line1);
        formData.append("address[city]", patientData.address.city);
        formData.append("address[state]", patientData.address.state);
        formData.append("address[postal_code]", patientData.address.postalCode);
      }

      const customer = await this.fetchStripe<StripeCustomer>(
        "/customers",
        "POST",
        formData
      );

      logger.info(`[Stripe] Created customer ${customer.id}`);

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Stripe] Failed to create customer", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<StripeAPIResponse<PaymentMethod>> {
    try {
      if (!customerId || !paymentMethodId) {
        return {
          success: false,
          error: "Customer ID and payment method ID required",
        };
      }

      if (this.isDev) {
        logger.info(
          `[Stripe Attach - DEV] Customer: ${customerId}, Method: ${paymentMethodId}`
        );
        return {
          success: true,
          data: {
            id: paymentMethodId,
            object: "payment_method",
            type: "card",
            card: {
              brand: "visa",
              last4: "4242",
              expMonth: 12,
              expYear: 2025,
            },
          },
        };
      }

      const formData = new URLSearchParams();
      formData.append("customer", customerId);

      const paymentMethod = await this.fetchStripe<PaymentMethod>(
        `/payment_methods/${paymentMethodId}/attach`,
        "POST",
        formData
      );

      logger.info(`[Stripe] Attached payment method ${paymentMethodId}`);

      return {
        success: true,
        data: paymentMethod,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[Stripe] Failed to attach payment method ${paymentMethodId}`,
        error
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Verify and process a Stripe webhook
   */
  processWebhook(
    payload: string,
    signature: string
  ): StripeAPIResponse<WebhookPayload> {
    try {
      if (!this.webhookSecret) {
        return {
          success: false,
          error: "Webhook secret not configured",
        };
      }

      // Verify signature
      const hash = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(payload)
        .digest("hex");

      const expectedSignature = `t=${Math.floor(Date.now() / 1000)},v1=${hash}`;

      // For dev mode, allow any signature
      if (!this.isDev && signature !== `v1=${hash}`) {
        logger.warn("[Stripe Webhook] Invalid signature");
        return {
          success: false,
          error: "Invalid webhook signature",
        };
      }

      const event = JSON.parse(payload) as WebhookPayload;

      logger.info(`[Stripe Webhook] Received event: ${event.type}`);

      return {
        success: true,
        data: event,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Stripe Webhook] Failed to process webhook", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Test Stripe connection
   */
  async testConnection(): Promise<StripeAPIResponse<{ timestamp: string }>> {
    try {
      if (this.isDev) {
        logger.warn("[Stripe] Running in dev mode - connection test skipped");
        return {
          success: false,
          error: "Stripe not configured (dev mode)",
        };
      }

      // Try to fetch balance
      const response = await fetch(`${this.baseUrl}/balance`, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info("[Stripe] Connection test successful");

      return {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Stripe] Connection test failed", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

// Export singleton instance
export const stripePaymentClient = new StripePaymentClient();
