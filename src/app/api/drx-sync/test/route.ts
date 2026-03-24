/**
 * DRX Connection Test + List Endpoint Diagnostics
 * GET /api/drx-sync/test — Test heartbeat + probe list endpoints
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DRX_BASE_URL =
  process.env.DRX_BASE_URL || "https://boudreaux.drxapp.com/external_api/v1";
const DRX_API_KEY = process.env.DRX_API_KEY || "";

async function probe(endpoint: string, limit = 2, extraParams?: Record<string, string>): Promise<{
  endpoint: string;
  status: number;
  count: number | null;
  sample: unknown;
  isArray: boolean;
  raw: string;
}> {
  const url = new URL(`${DRX_BASE_URL}${endpoint}`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-DRX-Key": DRX_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* not json */ }
    const isArray = Array.isArray(parsed);
    return {
      endpoint,
      status: res.status,
      count: isArray ? (parsed as unknown[]).length : null,
      sample: isArray ? (parsed as unknown[])[0] : parsed,
      isArray,
      raw: text.slice(0, 500),
    };
  } catch (e) {
    return { endpoint, status: 0, count: null, sample: null, isArray: false, raw: (e as Error).message };
  }
}

export async function GET() {
  try {
    const { testConnection, fetchCustomQueueCounts, fetchAllQueueCounts } = await import("@/lib/drx/client");
    const connection = await testConnection();

    // Probe all list endpoints with limit=2
    const probes = await Promise.all([
      probe("/doctors", 2),
      probe("/items", 2),
      probe("/patients", 2),
      probe("/prescriptions", 2),
      probe("/prescription-fills", 2),
    ]);

    // Probe fills by each active DRX status to see if status filter works
    const queueProbes = await Promise.all([
      probe("/prescription-fills", 1, { status: "Print" }),
      probe("/prescription-fills", 1, { status: "Scan" }),
      probe("/prescription-fills", 1, { status: "Verify" }),
      probe("/prescription-fills", 1, { status: "Sold" }),
      probe("/prescription-fills", 1, { status: "OOS" }),
      probe("/prescription-fills", 1, { status: "Hold" }),
      probe("/prescription-fills", 1, { status: "Waiting Bin" }),
    ]);

    // ─── Custom queue diagnostic ───────────────────────
    // Direct probe of the internal API to see raw response from Vercel's servers
    const DRX_INTERNAL_BASE =
      process.env.DRX_BASE_URL?.replace("/external_api/v1", "") ||
      "https://boudreaux.drxapp.com";
    const customQueueUrl = `${DRX_INTERNAL_BASE}/api/v1/custom_workflow_queue`;

    let customQueueRaw: unknown = null;
    let customQueueStatus = 0;
    let customQueueError: string | null = null;
    try {
      const cqRes = await fetch(customQueueUrl, {
        headers: { "X-DRX-Key": DRX_API_KEY, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      customQueueStatus = cqRes.status;
      const text = await cqRes.text();
      try { customQueueRaw = JSON.parse(text); } catch { customQueueRaw = text.slice(0, 1000); }
    } catch (e) {
      customQueueError = (e as Error).message;
    }

    // Also run the actual fetchCustomQueueCounts to see parsed output
    let parsedCustomCounts: Record<string, number> = {};
    try {
      parsedCustomCounts = await fetchCustomQueueCounts();
    } catch (e) {
      customQueueError = (customQueueError || "") + " | parsedError: " + (e as Error).message;
    }

    // And the full fetchAllQueueCounts
    let allCounts: Record<string, number> = {};
    try {
      allCounts = await fetchAllQueueCounts();
    } catch (e) {
      customQueueError = (customQueueError || "") + " | allCountsError: " + (e as Error).message;
    }

    return NextResponse.json({
      connection,
      probes,
      queueProbes,
      customQueueDiagnostic: {
        url: customQueueUrl,
        internalBase: DRX_INTERNAL_BASE,
        envDrxBaseUrl: process.env.DRX_BASE_URL || "(not set)",
        httpStatus: customQueueStatus,
        rawResponse: customQueueRaw,
        parsedCounts: parsedCustomCounts,
        allQueueCounts: allCounts,
        error: customQueueError,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
