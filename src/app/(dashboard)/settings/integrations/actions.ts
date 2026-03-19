"use server";

import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

export type IntegrationStatus = "connected" | "configured" | "planned" | "error" | "not_configured";

export interface IntegrationInfo {
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: string;
  configured: boolean;
  lastConnected?: string;
  error?: string;
}

/**
 * Get all integration statuses based on environment configuration
 */
export async function getIntegrationStatuses(): Promise<IntegrationInfo[]> {
  await requireUser();
  await requirePermission("settings", "read");

  const integrations: IntegrationInfo[] = [
    {
      name: "Supabase",
      description: "Database & Auth",
      icon: "database",
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      status: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY ? "connected" : "configured",
      lastConnected: new Date().toISOString(),
    },
    {
      name: "SureScripts",
      description: "eRx / EPCS",
      icon: "prescription",
      configured: !!process.env.SURESCRIPTS_PARTNER_ID && !!process.env.SURESCRIPTS_API_KEY,
      status: process.env.SURESCRIPTS_PARTNER_ID ? "configured" : "planned",
    },
    {
      name: "NCPDP / D.0",
      description: "Insurance claims",
      icon: "shield",
      configured: !!process.env.NCPDP_SWITCH_URL,
      status: process.env.NCPDP_SWITCH_URL ? "configured" : "planned",
    },
    {
      name: "Twilio",
      description: "SMS, Voice, Fax",
      icon: "message",
      configured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
      status: process.env.TWILIO_ACCOUNT_SID ? "configured" : "planned",
    },
    {
      name: "Stripe / Square",
      description: "Payment processing",
      icon: "credit-card",
      configured: !!process.env.STRIPE_SECRET_KEY || !!process.env.SQUARE_ACCESS_TOKEN,
      status: process.env.STRIPE_SECRET_KEY || process.env.SQUARE_ACCESS_TOKEN ? "configured" : "planned",
    },
    {
      name: "USPS / UPS / FedEx",
      description: "Shipping labels & tracking",
      icon: "truck",
      configured:
        !!process.env.USPS_API_KEY ||
        !!process.env.UPS_API_KEY ||
        !!process.env.FEDEX_API_KEY,
      status:
        process.env.USPS_API_KEY || process.env.UPS_API_KEY || process.env.FEDEX_API_KEY
          ? "configured"
          : "planned",
    },
    {
      name: "Claude AI",
      description: "AI agent platform",
      icon: "brain",
      configured: !!process.env.ANTHROPIC_API_KEY,
      status: process.env.ANTHROPIC_API_KEY ? "configured" : "planned",
    },
  ];

  return integrations;
}

/**
 * Test connection for a specific integration
 */
export async function testIntegration(name: string): Promise<{
  success: boolean;
  status: "connected" | "error";
  message: string;
  error?: string;
}> {
  await requireUser();
  await requirePermission("settings", "write");

  try {
    switch (name) {
      case "Supabase": {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
          return {
            success: false,
            status: "error",
            message: "Supabase not configured",
            error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
          };
        }

        try {
          const response = await fetch(`${url}/rest/v1/`, {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          });

          if (response.ok) {
            return {
              success: true,
              status: "connected",
              message: "Supabase connection successful",
            };
          }

          return {
            success: false,
            status: "error",
            message: "Supabase connection failed",
            error: `HTTP ${response.status}`,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          return {
            success: false,
            status: "error",
            message: "Supabase connection failed",
            error: errorMsg,
          };
        }
      }

      case "Claude AI": {
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
          return {
            success: false,
            status: "error",
            message: "Claude AI not configured",
            error: "Missing ANTHROPIC_API_KEY",
          };
        }

        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2024-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 100,
              messages: [
                {
                  role: "user",
                  content: "Respond with 'success' if you can read this.",
                },
              ],
            }),
          });

          if (response.ok) {
            return {
              success: true,
              status: "connected",
              message: "Claude AI connection successful",
            };
          }

          const error = await response.json();
          return {
            success: false,
            status: "error",
            message: "Claude AI connection failed",
            error: error.message || `HTTP ${response.status}`,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          return {
            success: false,
            status: "error",
            message: "Claude AI connection failed",
            error: errorMsg,
          };
        }
      }

      case "Twilio": {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
          return {
            success: false,
            status: "error",
            message: "Twilio not configured",
            error: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN",
          };
        }

        try {
          const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
            headers: {
              Authorization: `Basic ${auth}`,
            },
          });

          if (response.ok) {
            return {
              success: true,
              status: "connected",
              message: "Twilio connection successful",
            };
          }

          return {
            success: false,
            status: "error",
            message: "Twilio connection failed",
            error: `HTTP ${response.status}`,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          return {
            success: false,
            status: "error",
            message: "Twilio connection failed",
            error: errorMsg,
          };
        }
      }

      default:
        return {
          success: false,
          status: "error",
          message: `Connection test not implemented for ${name}`,
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Integration test failed: ${name}`, { error: errorMsg });

    return {
      success: false,
      status: "error",
      message: `Connection test failed`,
      error: errorMsg,
    };
  }
}

/**
 * Get configuration info for an integration
 */
export async function getIntegrationConfig(
  name: string
): Promise<{
  configured: boolean;
  envVars: { key: string; configured: boolean }[];
}> {
  await requireUser();
  await requirePermission("settings", "read");

  const envVarMap: Record<string, string[]> = {
    Supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    SureScripts: [
      "SURESCRIPTS_PARTNER_ID",
      "SURESCRIPTS_API_KEY",
      "SURESCRIPTS_ENDPOINT",
    ],
    "NCPDP / D.0": ["NCPDP_SWITCH_URL", "NCPDP_MERCHANT_ID"],
    Twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
    "Stripe / Square": ["STRIPE_SECRET_KEY", "SQUARE_ACCESS_TOKEN"],
    "USPS / UPS / FedEx": [
      "USPS_API_KEY",
      "UPS_API_KEY",
      "FEDEX_API_KEY",
    ],
    "Claude AI": ["ANTHROPIC_API_KEY"],
  };

  const vars = envVarMap[name] || [];
  const envVars = vars.map((key) => ({
    key,
    configured: !!process.env[key],
  }));

  return {
    configured: envVars.some((v) => v.configured),
    envVars,
  };
}
