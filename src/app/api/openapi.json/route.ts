import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/api/openapi-registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/openapi.json
 * Serves the OpenAPI 3.1 spec for the /api/v1/* public API.
 * Consumed by the /developers Scalar docs page and by external tooling
 * like Postman, openapi-typescript, openapi-generator, etc.
 *
 * Public endpoint — no auth required (spec itself contains no secrets).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const spec = buildOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
