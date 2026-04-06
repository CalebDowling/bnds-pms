/**
 * Twilio Integration
 * Handles SMS, Voice, and Fax communications via Twilio REST API
 * Uses native fetch - no external packages
 */

import { logger } from "@/lib/logger";

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_FAX_NUMBER = process.env.TWILIO_FAX_NUMBER;

// Type definitions
export interface TwilioMessage {
  sid: string;
  status: "queued" | "sending" | "sent" | "failed" | "delivered" | "undelivered";
  errorCode?: string;
  errorMessage?: string;
  to: string;
  from: string;
  body: string;
  dateCreated: string;
  dateSent?: string;
  price?: string;
}

export interface TwilioCall {
  sid: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer";
  direction: "inbound" | "outbound-api" | "outbound-dial";
  to: string;
  from: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  errorCode?: string;
}

export interface TwilioFax {
  sid: string;
  status: "queued" | "sending" | "sent" | "failed" | "received" | "accepted";
  to: string;
  from: string;
  mediaUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SMSHistoryFilter {
  limit?: number;
  offset?: number;
  to?: string;
  from?: string;
  status?: string;
  dateSentAfter?: string;
  dateSentBefore?: string;
}

export interface BulkSMSRecipient {
  to: string;
  body?: string; // If omitted, uses default body
}

export interface IVROption {
  digit: string;
  description: string;
  action: string;
}

export interface TwilioAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Twilio REST API Client
 * Handles authentication and API calls
 */
class TwilioClient {
  private accountSid: string | undefined;
  private authToken: string | undefined;
  private phoneNumber: string | undefined;
  private faxNumber: string | undefined;
  private baseUrl: string;
  private isDev: boolean;

  constructor() {
    this.accountSid = TWILIO_ACCOUNT_SID;
    this.authToken = TWILIO_AUTH_TOKEN;
    this.phoneNumber = TWILIO_PHONE_NUMBER;
    this.faxNumber = TWILIO_FAX_NUMBER;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
    this.isDev = !this.accountSid || !this.authToken;
  }

  /**
   * Create Basic Auth header for Twilio API
   */
  private getAuthHeader(): string {
    if (!this.accountSid || !this.authToken) {
      return "";
    }
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    return `Basic ${credentials}`;
  }

  /**
   * Generic fetch wrapper for Twilio API calls
   */
  private async fetchTwilio<T>(
    endpoint: string,
    method: "GET" | "POST" = "POST",
    body?: URLSearchParams | FormData
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
    };

    // Only set content-type for URLSearchParams (not FormData, which sets its own)
    if (body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? body.toString() : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = (data as any).message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  /**
   * Send a single SMS
   */
  async sendSMS(to: string, body: string): Promise<TwilioAPIResponse<TwilioMessage>> {
    try {
      // Validate phone number
      const cleanNumber = to.replace(/\D/g, "");
      if (cleanNumber.length < 10) {
        return {
          success: false,
          error: "Invalid phone number format",
        };
      }

      if (this.isDev) {
        logger.info(`[Twilio SMS - DEV] SMS to ${to}: ${body}`);
        return {
          success: true,
          data: {
            sid: `dev-${Date.now()}`,
            status: "sent",
            to,
            from: this.phoneNumber || "unknown",
            body,
            dateCreated: new Date().toISOString(),
          },
        };
      }

      if (!this.phoneNumber) {
        return {
          success: false,
          error: "TWILIO_PHONE_NUMBER not configured",
        };
      }

      const formData = new URLSearchParams();
      formData.append("To", to);
      formData.append("From", this.phoneNumber);
      formData.append("Body", body);

      const message = await this.fetchTwilio<TwilioMessage>("/Messages.json", "POST", formData);

      logger.info(`[Twilio SMS] Sent to ${to} (SID: ${message.sid})`);

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Twilio SMS] Failed to send SMS to ${to}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSMS(
    recipients: BulkSMSRecipient[]
  ): Promise<TwilioAPIResponse<TwilioMessage[]>> {
    try {
      if (!recipients || recipients.length === 0) {
        return {
          success: false,
          error: "No recipients provided",
        };
      }

      const messages: TwilioMessage[] = [];
      const errors: string[] = [];

      for (const recipient of recipients) {
        const body = recipient.body || "Message from Boudreaux's Pharmacy";
        const result = await this.sendSMS(recipient.to, body);

        if (result.success && result.data) {
          messages.push(result.data);
        } else {
          errors.push(`${recipient.to}: ${result.error}`);
        }
      }

      logger.info(
        `[Twilio Bulk SMS] Sent ${messages.length}/${recipients.length} messages`
      );

      return {
        success: errors.length === 0,
        data: messages,
        error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Twilio Bulk SMS] Failed to send bulk SMS", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<TwilioAPIResponse<TwilioMessage>> {
    try {
      const message = await this.fetchTwilio<TwilioMessage>(
        `/Messages/${messageSid}.json`,
        "GET"
      );

      logger.debug(`[Twilio] Message ${messageSid} status: ${message.status}`);

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Twilio] Failed to get message status for ${messageSid}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get SMS history with filters
   */
  async getSMSHistory(
    filters?: SMSHistoryFilter
  ): Promise<TwilioAPIResponse<TwilioMessage[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.append("PageSize", String(filters.limit));
      if (filters?.to) params.append("To", filters.to);
      if (filters?.from) params.append("From", filters.from);
      if (filters?.status) params.append("Status", filters.status);
      if (filters?.dateSentAfter)
        params.append("DateSentAfter", filters.dateSentAfter);
      if (filters?.dateSentBefore)
        params.append("DateSentBefore", filters.dateSentBefore);

      const endpoint = `/Messages.json?${params.toString()}`;
      const response = await this.fetchTwilio<{
        messages: TwilioMessage[];
        pageSize: number;
        start: number;
        end: number;
        total: number;
      }>(endpoint, "GET");

      logger.info(
        `[Twilio SMS History] Retrieved ${response.messages.length} messages`
      );

      return {
        success: true,
        data: response.messages,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Twilio SMS History] Failed to retrieve history", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Make an outbound call with TwiML
   */
  async makeCall(to: string, twiml: string): Promise<TwilioAPIResponse<TwilioCall>> {
    try {
      // Validate phone number
      const cleanNumber = to.replace(/\D/g, "");
      if (cleanNumber.length < 10) {
        return {
          success: false,
          error: "Invalid phone number format",
        };
      }

      if (this.isDev) {
        logger.info(`[Twilio Voice - DEV] Call to ${to}`);
        return {
          success: true,
          data: {
            sid: `dev-call-${Date.now()}`,
            status: "queued",
            direction: "outbound-api",
            to,
            from: this.phoneNumber || "unknown",
          },
        };
      }

      if (!this.phoneNumber) {
        return {
          success: false,
          error: "TWILIO_PHONE_NUMBER not configured",
        };
      }

      const formData = new URLSearchParams();
      formData.append("To", to);
      formData.append("From", this.phoneNumber);
      formData.append("Twiml", twiml);

      const call = await this.fetchTwilio<TwilioCall>("/Calls.json", "POST", formData);

      logger.info(`[Twilio Voice] Call initiated to ${to} (SID: ${call.sid})`);

      return {
        success: true,
        data: call,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Twilio Voice] Failed to initiate call to ${to}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<TwilioAPIResponse<TwilioCall>> {
    try {
      const call = await this.fetchTwilio<TwilioCall>(`/Calls/${callSid}.json`, "GET");

      logger.debug(`[Twilio] Call ${callSid} status: ${call.status}`);

      return {
        success: true,
        data: call,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Twilio] Failed to get call status for ${callSid}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Generate TwiML for pharmacy IVR
   */
  generateIVR(options: IVROption[]): string {
    const optionsXml = options
      .map(
        (opt) =>
          `<Option digits="${opt.digit}">${opt.description}</Option>`
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/integrations/twilio/ivr/action" method="POST">
    <Say>Welcome to Boudreaux's Pharmacy. Press 1 to check prescription status. Press 2 to request a refill. Press 3 to speak with a pharmacist.</Say>
    <Pause length="1"/>
    <Say>Please enter your selection.</Say>
  </Gather>
  <Say>We did not receive any input. Goodbye.</Say>
</Response>`;
  }

  /**
   * Send a fax
   */
  async sendFax(to: string, mediaUrl: string): Promise<TwilioAPIResponse<TwilioFax>> {
    try {
      // Validate phone number
      const cleanNumber = to.replace(/\D/g, "");
      if (cleanNumber.length < 10) {
        return {
          success: false,
          error: "Invalid phone number format",
        };
      }

      if (this.isDev) {
        logger.info(`[Twilio Fax - DEV] Fax to ${to}`);
        return {
          success: true,
          data: {
            sid: `dev-fax-${Date.now()}`,
            status: "sent",
            to,
            from: this.faxNumber || "unknown",
            mediaUrl,
          },
        };
      }

      if (!this.faxNumber) {
        return {
          success: false,
          error: "TWILIO_FAX_NUMBER not configured",
        };
      }

      const formData = new URLSearchParams();
      formData.append("To", to);
      formData.append("From", this.faxNumber);
      formData.append("MediaUrl", mediaUrl);

      const fax = await this.fetchTwilio<TwilioFax>(
        "/FaxMessages.json",
        "POST",
        formData
      );

      logger.info(`[Twilio Fax] Fax sent to ${to} (SID: ${fax.sid})`);

      return {
        success: true,
        data: fax,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Twilio Fax] Failed to send fax to ${to}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get fax status
   */
  async getFaxStatus(faxSid: string): Promise<TwilioAPIResponse<TwilioFax>> {
    try {
      const fax = await this.fetchTwilio<TwilioFax>(
        `/FaxMessages/${faxSid}.json`,
        "GET"
      );

      logger.debug(`[Twilio] Fax ${faxSid} status: ${fax.status}`);

      return {
        success: true,
        data: fax,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Twilio] Failed to get fax status for ${faxSid}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Test Twilio connection
   */
  async testConnection(): Promise<TwilioAPIResponse<{ timestamp: string }>> {
    try {
      if (this.isDev) {
        logger.warn("[Twilio] Running in dev mode - connection test skipped");
        return {
          success: false,
          error: "Twilio not configured (dev mode)",
        };
      }

      // Try to fetch account details
      const url = this.baseUrl + ".json";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info("[Twilio] Connection test successful");

      return {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Twilio] Connection test failed", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

// Export singleton instance
export const twilioClient = new TwilioClient();
