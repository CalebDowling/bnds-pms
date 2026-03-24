/**
 * DRX Connection Test + List Endpoint Diagnostics
 * GET /api/drx-sync/test — Test heartbeat + probe list endpoints
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DRX_BASE_URL =
  process.env.DRX_BASE_URL || "https://boudreaux.drxapp.com/external_api/v1";
const DRX_API_KEY = process.env.DRX_API_KEY || "";

async function probe(endpoint: string, limit = 2): Promise<{
  endpoint: string;
  status: number;
  count: number | null;
  sample: unknown;
  isArray: boolean;
  raw: string;
}> {
  const url = `${DRX_BASE_URL}${endpoint}?limit=${limit}&offset=0`;
  try {
    const res = await fetch(url, {
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
    const { testConnection } = await import("@/lib/drx/client");
    const connection = await testConnection();

    // Probe all list endpoints with limit=2
    const probes = await Promise.all([
      probe("/doctors", 2),
      probe("/items", 2),
      probe("/patients", 2),
      probe("/prescriptions", 2),
      probe("/prescription-fills", 2),
    ]);

    return NextResponse.json({
      connection,
      probes,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
