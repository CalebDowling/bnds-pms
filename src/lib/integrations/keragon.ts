/**
 * Keragon Integration
 * HIPAA-compliant healthcare automation platform
 *
 * Keragon connects to Supabase, DRX, Twilio, and other tools via:
 *   1. HTTP Webhook triggers  – Supabase DB events → Keragon workflow
 *   2. HTTP Client actions     – Keragon workflow → PMS API callbacks
 *   3. Native DRX connector    – Keragon ↔ DRX bidirectional sync
 *
 * Architecture:
 *   Supabase DB change → pg_net HTTP POST → Keragon webhook URL → workflow runs
 *   Keragon workflow   → HTTP Client action → /api/integrations/keragon/webhook
 *
 * @see https://help.keragon.com/hc/en-us
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const KERAGON_API_BASE = process.env.KERAGON_API_BASE || "https://api.keragon.com";
const KERAGON_API_KEY = process.env.KERAGON_API_KEY;
const KERAGON_WEBHOOK_SECRET = process.env.KERAGON_WEBHOOK_SECRET; // shared secret for HMAC verification

/**
 * Map of Keragon workflow webhook URLs keyed by pharmacy event type.
 * Each URL is the unique Keragon trigger endpoint generated when you create
 * a workflow with an "HTTP Webhook" trigger in the Keragon UI.
 *
 * Set these in .env.local — they look like:
 *   KERAGON_WF_NEW_RX=https://hooks.keragon.com/wf/abc123...
 *   KERAGON_WF_RX_DISPENSED=https://hooks.keragon.com/wf/def456...
 */
export const KERAGON_WORKFLOWS: Record<string, string | undefined> = {
  // Prescription lifecycle
  "rx.new":             process.env.KERAGON_WF_NEW_RX,
  "rx.fill.created":    process.env.KERAGON_WF_RX_FILL_CREATED,
  "rx.fill.verified":   process.env.KERAGON_WF_RX_FILL_VERIFIED,
  "rx.dispensed":       process.env.KERAGON_WF_RX_DISPENSED,
  "rx.transferred":     process.env.KERAGON_WF_RX_TRANSFERRED,
  "rx.refill.due":      process.env.KERAGON_WF_REFILL_DUE,

  // Claims
  "claim.submitted":    process.env.KERAGON_WF_CLAIM_SUBMITTED,
  "claim.paid":         process.env.KERAGON_WF_CLAIM_PAID,
  "claim.rejected":     process.env.KERAGON_WF_CLAIM_REJECTED,

  // Patient events
  "patient.created":    process.env.KERAGON_WF_PATIENT_CREATED,
  "patient.updated":    process.env.KERAGON_WF_PATIENT_UPDATED,

  // Inventory
  "inventory.low":      process.env.KERAGON_WF_INVENTORY_LOW,
  "inventory.expiring": process.env.KERAGON_WF_INVENTORY_EXPIRING,

  // Compounding
  "batch.created":      process.env.KERAGON_WF_BATCH_CREATED,
  "batch.completed":    process.env.KERAGON_WF_BATCH_COMPLETED,
  "batch.failed_qa":    process.env.KERAGON_WF_BATCH_FAILED_QA,

  // LTC
  "mar.generated":      process.env.KERAGON_WF_MAR_GENERATED,
  "facility.order":     process.env.KERAGON_WF_FACILITY_ORDER,

  // Hardware
  "hardware.count_complete": process.env.KERAGON_WF_HARDWARE_COUNT_COMPLETE,
  "hardware.error":     process.env.KERAGON_WF_HARDWARE_ERROR,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeragonEvent {
  /** The event type, e.g. "rx.dispensed" */
  event: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Unique event ID for idempotency */
  eventId: string;
  /** Source system */
  source: "bnds-pms";
  /** The event payload — varies by event type */
  data: Record<string, any>;
}

export interface KeragonWebhookPayload {
  /** Action Keragon wants the PMS to take */
  action: string;
  /** Workflow run ID for traceability */
  workflowRunId?: string;
  /** Workflow name for logging */
  workflowName?: string;
  /** Action-specific payload */
  data: Record<string, any>;
}

export interface KeragonDispatchResult {
  success: boolean;
  event: string;
  workflowUrl?: string;
  statusCode?: number;
  error?: string;
  webhookLogId?: string;
}

// ---------------------------------------------------------------------------
// Core dispatch function
// ---------------------------------------------------------------------------

/**
 * Dispatch a pharmacy event to the corresponding Keragon workflow.
 *
 * If no workflow URL is configured for the event type, the event is silently
 * skipped (returns success: true with a note). This lets you incrementally
 * enable workflows without code changes.
 */
export async function dispatchToKeragon(
  event: string,
  data: Record<string, any>,
  options: { retries?: number; timeoutMs?: number } = {}
): Promise<KeragonDispatchResult> {
  const { retries = 2, timeoutMs = 10_000 } = options;

  const workflowUrl = KERAGON_WORKFLOWS[event];

  if (!workflowUrl) {
    logger.debug(`[Keragon] No workflow URL configured for event "${event}" — skipping`);
    return { success: true, event, error: "No workflow URL configured" };
  }

  const payload: KeragonEvent = {
    event,
    timestamp: new Date().toISOString(),
    eventId: crypto.randomUUID(),
    source: "bnds-pms",
    data,
  };

  let lastError: string | undefined;
  let statusCode: number | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Event-Type": event,
        "X-Event-Id": payload.eventId,
      };

      // Add API key if configured (some Keragon plans require it)
      if (KERAGON_API_KEY) {
        headers["X-Keragon-Key"] = KERAGON_API_KEY;
      }

      // Add HMAC signature for payload verification
      if (KERAGON_WEBHOOK_SECRET) {
        const signature = crypto
          .createHmac("sha256", KERAGON_WEBHOOK_SECRET)
          .update(JSON.stringify(payload))
          .digest("hex");
        headers["X-Webhook-Signature"] = signature;
      }

      const response = await fetch(workflowUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);
      statusCode = response.status;

      if (response.ok) {
        // Log successful dispatch
        const webhookLog = await logWebhookDelivery({
          event,
          payload,
          responseStatus: statusCode,
          responseBody: await response.text().catch(() => ""),
          attempt: attempt + 1,
          success: true,
        });

        logger.info(`[Keragon] Dispatched "${event}" → ${workflowUrl} (${statusCode})`);

        return {
          success: true,
          event,
          workflowUrl,
          statusCode,
          webhookLogId: webhookLog?.id,
        };
      }

      lastError = `HTTP ${statusCode}: ${await response.text().catch(() => "unknown")}`;
      logger.warn(`[Keragon] Attempt ${attempt + 1} failed for "${event}": ${lastError}`);
    } catch (err: any) {
      lastError = err.name === "AbortError" ? "Request timed out" : err.message;
      logger.warn(`[Keragon] Attempt ${attempt + 1} error for "${event}": ${lastError}`);
    }

    // Exponential backoff: 500ms, 1000ms, 2000ms ...
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }

  // All retries exhausted — log failure
  await logWebhookDelivery({
    event,
    payload,
    responseStatus: statusCode || 0,
    responseBody: lastError || "Unknown error",
    attempt: retries + 1,
    success: false,
  });

  logger.error(`[Keragon] Failed to dispatch "${event}" after ${retries + 1} attempts: ${lastError}`);

  return {
    success: false,
    event,
    workflowUrl,
    statusCode,
    error: lastError,
  };
}

// ---------------------------------------------------------------------------
// Batch dispatch — fire multiple events concurrently
// ---------------------------------------------------------------------------

export async function dispatchBatch(
  events: Array<{ event: string; data: Record<string, any> }>
): Promise<KeragonDispatchResult[]> {
  return Promise.all(events.map(({ event, data }) => dispatchToKeragon(event, data)));
}

// ---------------------------------------------------------------------------
// Webhook verification — verify incoming Keragon callbacks
// ---------------------------------------------------------------------------

/**
 * Verify an incoming webhook from Keragon using HMAC-SHA256 signature.
 * Keragon sends the signature in the X-Webhook-Signature header.
 */
export function verifyKeragonSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!KERAGON_WEBHOOK_SECRET || !signature) {
    // If no secret configured, skip verification (dev mode)
    logger.warn("[Keragon] No webhook secret configured — skipping signature verification");
    return true;
  }

  const expected = crypto
    .createHmac("sha256", KERAGON_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// ---------------------------------------------------------------------------
// Webhook logging
// ---------------------------------------------------------------------------

async function logWebhookDelivery(params: {
  event: string;
  payload: KeragonEvent;
  responseStatus: number;
  responseBody: string;
  attempt: number;
  success: boolean;
}) {
  try {
    // Find or create the Keragon webhook record
    let webhook = await prisma.webhook.findFirst({
      where: { url: { contains: "keragon" } },
    });

    if (!webhook) {
      // Auto-create a webhook record for Keragon if it doesn't exist
      webhook = await prisma.webhook.create({
        data: {
          url: KERAGON_API_BASE,
          events: Object.keys(KERAGON_WORKFLOWS),
          secret: KERAGON_WEBHOOK_SECRET || "",
          isActive: true,
        },
      });
    }

    const log = await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        eventType: params.event,
        payload: params.payload as any,
        responseStatus: params.responseStatus,
        responseBody: params.responseBody.substring(0, 2000),
        deliveredAt: new Date(),
        retryCount: params.attempt - 1,
      },
    });

    return log;
  } catch (err) {
    // Don't let logging failures break the main flow
    logger.error("[Keragon] Failed to log webhook delivery:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Test the Keragon connection by dispatching a ping event.
 * Returns true if at least one workflow URL is configured and responds.
 */
export async function testKeragonConnection(): Promise<{
  connected: boolean;
  configuredWorkflows: string[];
  unconfiguredWorkflows: string[];
  error?: string;
}> {
  const configured = Object.entries(KERAGON_WORKFLOWS)
    .filter(([, url]) => !!url)
    .map(([event]) => event);

  const unconfigured = Object.entries(KERAGON_WORKFLOWS)
    .filter(([, url]) => !url)
    .map(([event]) => event);

  if (configured.length === 0) {
    return {
      connected: false,
      configuredWorkflows: [],
      unconfiguredWorkflows: unconfigured,
      error: "No Keragon workflow URLs configured in environment variables",
    };
  }

  // Try to dispatch a test event to the first configured workflow
  const testEvent = configured[0];
  const result = await dispatchToKeragon(testEvent, {
    _test: true,
    message: "Connection test from BNDS PMS",
    timestamp: new Date().toISOString(),
  }, { retries: 0, timeoutMs: 5000 });

  return {
    connected: result.success,
    configuredWorkflows: configured,
    unconfiguredWorkflows: unconfigured,
    error: result.error,
  };
}

// ---------------------------------------------------------------------------
// Utility: Get workflow status summary
// ---------------------------------------------------------------------------

export function getKeragonStatus(): {
  configured: number;
  total: number;
  workflows: Array<{ event: string; configured: boolean }>;
} {
  const workflows = Object.entries(KERAGON_WORKFLOWS).map(([event, url]) => ({
    event,
    configured: !!url,
  }));

  return {
    configured: workflows.filter((w) => w.configured).length,
    total: workflows.length,
    workflows,
  };
}
