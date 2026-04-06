/**
 * Eyecon Pill Counting System Integration
 *
 * Communicates with an Eyecon device over its local REST API
 * (typically exposed on the pharmacy LAN at http://<device-ip>:8080).
 *
 * Environment variable:
 *   EYECON_API_URL — base URL of the Eyecon device (default: http://localhost:8080)
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return process.env.EYECON_API_URL ?? "http://localhost:8080";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CountSessionStatus =
  | "pending"      // session created, counting not yet started
  | "counting"     // device is actively counting
  | "complete"     // count finished
  | "error";       // an error occurred during counting

export interface EyeconCountResult {
  /** Unique session identifier returned by the Eyecon device */
  sessionId: string;
  /** Current status of the counting session */
  status: CountSessionStatus;
  /** Number of pills counted so far (or final count when status=complete) */
  pillCount: number;
  /** Whether the Eyecon verified the NDC of the pills against the expected NDC */
  ndcVerified: boolean;
  /** NDC that was expected (echoed back from the start request) */
  expectedNdc: string;
  /** NDC detected by the Eyecon camera, if available */
  detectedNdc: string | null;
  /** URLs to pill tray images captured by the device (empty until complete) */
  images: string[];
  /** ISO-8601 timestamp when the session was created */
  createdAt: string;
  /** ISO-8601 timestamp of the last status update */
  updatedAt: string;
  /** Human-readable error message, if status is "error" */
  errorMessage: string | null;
}

export interface CountVerification {
  /** Whether expected and actual pill counts match */
  match: boolean;
  /** Expected pill count */
  expected: number;
  /** Actual pill count from the Eyecon */
  actual: number;
  /** Difference (actual - expected). Positive = over-count, negative = under-count */
  difference: number;
  /** Whether the NDC was verified by the device */
  ndcVerified: boolean;
  /** The full Eyecon count result */
  countResult: EyeconCountResult;
}

export interface StartCountOptions {
  /** NDC of the drug being counted (11-digit format preferred) */
  ndc: string;
  /** Optional expected quantity — stored for later verification */
  expectedQuantity?: number;
  /** Optional prescription or fill ID for auditing */
  referenceId?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

class EyeconError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "EyeconError";
  }
}

async function eyeconFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new EyeconError(
      `Failed to reach Eyecon device at ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EyeconError(
      `Eyecon API error ${res.status}: ${res.statusText}`,
      res.status,
      body,
    );
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start a new pill counting session on the Eyecon device.
 *
 * The device will illuminate the tray and begin image capture once pills
 * are placed. The returned session ID is used to poll for results.
 */
export async function startCount(
  options: StartCountOptions,
): Promise<EyeconCountResult> {
  const payload = {
    ndc: options.ndc,
    expectedQuantity: options.expectedQuantity ?? null,
    referenceId: options.referenceId ?? null,
  };

  const result = await eyeconFetch<EyeconCountResult>("/api/v1/count/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result;
}

/**
 * Get the current result / status of an existing count session.
 *
 * Poll this endpoint until `status` is `"complete"` or `"error"`.
 */
export async function getCountResult(
  sessionId: string,
): Promise<EyeconCountResult> {
  if (!sessionId) {
    throw new EyeconError("sessionId is required");
  }

  const result = await eyeconFetch<EyeconCountResult>(
    `/api/v1/count/${encodeURIComponent(sessionId)}`,
  );

  return result;
}

/**
 * Verify a completed count against an expected quantity.
 *
 * If the session is not yet complete this will still return a verification
 * object, but `match` will reflect the current (possibly partial) count.
 */
export async function verifyCount(
  sessionId: string,
  expectedQuantity: number,
): Promise<CountVerification> {
  const countResult = await getCountResult(sessionId);

  const difference = countResult.pillCount - expectedQuantity;

  return {
    match: difference === 0,
    expected: expectedQuantity,
    actual: countResult.pillCount,
    difference,
    ndcVerified: countResult.ndcVerified,
    countResult,
  };
}

/**
 * Cancel an in-progress counting session (if the device supports it).
 * Returns `true` if the device acknowledged the cancellation.
 */
export async function cancelCount(sessionId: string): Promise<boolean> {
  if (!sessionId) {
    throw new EyeconError("sessionId is required");
  }

  try {
    await eyeconFetch<{ success: boolean }>(
      `/api/v1/count/${encodeURIComponent(sessionId)}/cancel`,
      { method: "POST" },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Ping the Eyecon device to check connectivity.
 * Returns `true` if the device responded successfully.
 */
export async function pingDevice(): Promise<boolean> {
  try {
    await eyeconFetch<{ status: string }>("/api/v1/status");
    return true;
  } catch {
    return false;
  }
}
