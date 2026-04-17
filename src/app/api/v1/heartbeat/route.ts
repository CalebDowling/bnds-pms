import { withApiAuth, apiOk } from "@/lib/api/with-api-auth";

/**
 * GET /api/v1/heartbeat
 * Verify that an API key is valid and the API is reachable.
 * Requires any valid key (no scope needed — we use a wildcard-style check).
 */
export const GET = withApiAuth(
  { resource: "*", action: "*" },
  async (_req, { apiKey }) => {
    return apiOk({
      status: "ok",
      pulse: 1,
      serverTime: new Date().toISOString(),
      apiVersion: "v1",
      environment: apiKey.environment,
    });
  }
);
