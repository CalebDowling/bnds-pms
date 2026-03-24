/**
 * DRX API Client — Shadow Mode Sync
 *
 * Connects to DRX pharmacy system at boudreaux.drxapp.com
 * Auth via X-DRX-Key header (API key from DRX Location Settings → API Options).
 * Docs: https://getdrx.readme.io/reference/getting-started-with-your-api-1
 *
 * Key facts from DRX API docs:
 * - Header: X-DRX-Key
 * - URL prefix: /external_api/v1/
 * - Pagination: limit (max 100, default 10) + offset
 * - List endpoints are plural: /patients, /doctors, /items, /prescriptions, /prescription-fills
 * - Individual endpoints are singular: /patient/{id}, /doctor/{id}, etc.
 * - Delta sync: updatedAfter, createdAfter params (ISO 8601)
 */

const DRX_BASE_URL =
  process.env.DRX_BASE_URL || "https://boudreaux.drxapp.com/external_api/v1";
const DRX_API_KEY = process.env.DRX_API_KEY || "";

// ─── Core fetch helper ─────────────────────────

async function drxFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T | null> {
  const url = new URL(`${DRX_BASE_URL}${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-DRX-Key": DRX_API_KEY,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 404) return null;
  if (res.status === 500) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DRX API ${res.status} at ${endpoint}: ${text}`);
  }

  const data = await res.json();
  if (data === null) return null;
  if (data?.success === false) return null;
  return data;
}

// ─── Paginated list helper ─────────────────────

export interface DrxPage<T> {
  data: T[];
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Fetch a paginated list from DRX.
 * DRX returns arrays directly from list endpoints.
 * Pagination uses limit (max 100) + offset query params.
 */
async function drxFetchPage<T>(
  endpoint: string,
  offset: number,
  limit: number,
  extraParams?: Record<string, string | number | boolean>
): Promise<DrxPage<T>> {
  const params: Record<string, string | number | boolean> = {
    limit,
    offset,
    ...extraParams,
  };

  const raw = await drxFetch<unknown>(endpoint, params);

  if (raw === null) {
    return { data: [], offset, limit, hasMore: false };
  }

  // DRX returns arrays directly (unlikely but handle it)
  if (Array.isArray(raw)) {
    return {
      data: raw as T[],
      offset,
      limit,
      hasMore: raw.length >= limit,
    };
  }

  // DRX wraps data in named keys: { success: true, doctors: [...] }
  // Find the first array value in the response object
  const obj = raw as Record<string, unknown>;
  let data: T[] = [];
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      data = value as T[];
      break;
    }
  }

  return {
    data,
    offset,
    limit,
    hasMore: data.length >= limit,
  };
}

/**
 * Iterate through ALL pages of a DRX list endpoint.
 * Calls handler for each batch of records.
 */
export async function fetchAllPages<T>(
  endpoint: string,
  limit: number,
  handler: (records: T[], page: number) => Promise<void>,
  extraParams?: Record<string, string | number | boolean>,
  shouldContinue?: () => boolean
): Promise<number> {
  let offset = 0;
  let total = 0;
  let page = 0;

  while (true) {
    // Check time budget before fetching next page
    if (shouldContinue && !shouldContinue()) break;

    const result = await drxFetchPage<T>(endpoint, offset, limit, extraParams);
    if (result.data.length === 0) break;

    await handler(result.data, page);
    total += result.data.length;

    if (!result.hasMore || result.data.length < limit) break;
    offset += limit;
    page++;
  }

  return total;
}

// ─── DRX Response Types ────────────────────────

export interface DrxPatient {
  id: number;
  created_at: string;
  updated_at: string;
  first_name: string;
  middle_initial: string | null;
  last_name: string;
  email: string;
  date_of_birth: string;
  gender: string;
  race: string | null;
  primary_language: string | null;
  active: boolean;
  deceased: boolean;
  delivery_method: string | null;
  primary_care_doctor_id: number | null;
  facility_id: number | null;
  custom_status_id: number | null;
  addresses: {
    id: number;
    street: string;
    line_two: string;
    city: string;
    state: string;
    zip_code: string;
    type_: string;
    patient_id: number;
    address_id: number;
  }[];
  phone_numbers: {
    id: number;
    number: string;
    phone_type: string;
    use_for_notification: boolean | null;
  }[];
  allergies: {
    dam_concept_id?: string;
    concept_description?: string;
    [key: string]: unknown;
  }[];
  third_parties: {
    id: number;
    bin_number: string;
    name: string;
    pcn: string;
    cardholder_id: string;
    cardholder_relationship: string;
    relationship_code: string;
    group_number: string;
    [key: string]: unknown;
  }[];
  comments: { id: number; comment: string; [key: string]: unknown }[];
  [key: string]: unknown;
}

export interface DrxDoctor {
  id: number;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  prescriber_type: string | null;
  dea: string | null;
  dea_suffix: string | null;
  npi: string | null;
  spi: string | null;
  email: string | null;
  website: string | null;
  state_license: string | null;
  practice_location: string | null;
  fax_number: string | null;
  phone_numbers: {
    id: number;
    number: string;
    phone_type: string;
  }[];
  addresses: {
    id: number;
    street: string;
    line_two: string;
    city: string;
    state: string;
    zip_code: string;
  }[];
  [key: string]: unknown;
}

export interface DrxItem {
  id: number;
  created_at: string;
  updated_at: string;
  ndc: string | null;
  name: string;
  print_name: string | null;
  generic_name: string | null;
  brand_name: string | null;
  manufacturer: string | null;
  strength: string | null;
  dosage_form: string | null;
  dosage_form_description: string | null;
  route_of_administration: string | null;
  unit_of_measure: string | null;
  awp: number | null;
  unit_cost: number | null;
  rdc_net_cost: number | null;
  retail_cost: number | null;
  nadac_per_unit: number | null;
  stock_size: number | null;
  min_inventory: number | null;
  max_inventory: number | null;
  dea_schedule: string | null;
  compounding_chemical: boolean;
  otc_indicator: string | null;
  refrigerated: boolean;
  active: boolean;
  generic: boolean;
  gcn: string | null;
  [key: string]: unknown;
}

// DRX /prescriptions endpoint returns nested objects:
// { patient: {...}, doctor: {...}, prescribed_item: {...}, id, sig, ... }
export interface DrxPrescription {
  id: number;
  store_id: number;
  created_at: string;
  updated_at: string | null;
  written_date: string | null;
  expiration_date: string | null;
  inactivated: boolean;
  sig: string | null;
  sig_code: string | null;
  daw: boolean;
  daw_code: string | null;
  refills: number;
  origin_code: string | null;
  total_qty_remaining: number;
  last_filled_on: string | null;
  last_fill_id: number | null;
  last_fill_status: string | null;
  // Nested objects
  patient: { id: number; first_name: string; last_name: string; [key: string]: unknown } | null;
  doctor: { id: number; first_name: string; last_name: string; npi: string; [key: string]: unknown } | null;
  prescribed_item: { id: number; name: string; ndc: string | null; [key: string]: unknown } | null;
  prescription_fills: { id: number; status: string; fill_date: string; days_supply: number; dispensed_quantity: number; [key: string]: unknown }[];
  [key: string]: unknown;
}

// DRX /prescription-fills endpoint returns nested objects:
// { patient: {...}, dispensed_item: {...}, doctor: {...}, prescription: {...}, fill: {...} }
export interface DrxPrescriptionFill {
  patient: { id: number; [key: string]: unknown } | null;
  dispensed_item: { id: number; name: string; ndc: string | null; dea_schedule: number | null; [key: string]: unknown } | null;
  doctor: { id: number; [key: string]: unknown } | null;
  prescription: { id: number; created_at: string; sig: string | null; [key: string]: unknown } | null;
  fill: {
    id: number;
    refill: number;
    status: string;
    fill_date: string | null;
    dispensed_quantity: number;
    days_supply: number | null;
    patient_pay_amount: number | null;
    fill_cost: number | null;
    retail_amount: number | null;
    dispensing_fee?: number | null;
    created_at: string;
    updated_at: string | null;
    first_sold_on: string | null;
    last_sold_on: string | null;
    pharmacist: string | null;
    will_call_location: string | null;
    tracking_number: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DrxClaim {
  id: number;
  created_at: string;
  updated_at: string;
  prescription_fill_id: number;
  patient_insurance_id: number | null;
  status: string;
  transaction_code: string | null;
  amount_billed: number | null;
  amount_paid: number | null;
  patient_pay: number | null;
  copay: number | null;
  rejection_codes: string | null;
  response_message: string | null;
  submitted_at: string | null;
  adjudicated_at: string | null;
  [key: string]: unknown;
}

export interface DrxRefillRequest {
  id: number;
  created_at: string;
  updated_at: string;
  prescription_id: number;
  patient_id: number;
  source: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
  [key: string]: unknown;
}

export interface DrxInventory {
  id: number;
  item_id: number;
  lot_number: string | null;
  quantity_on_hand: number;
  quantity_received: number;
  unit_cost: number | null;
  expiration_date: string | null;
  date_received: string | null;
  status: string;
  [key: string]: unknown;
}

// ─── Live queue count from DRX ─────────────────
// Makes a single API call with limit=1 per status and reads the "total" field
// from the response envelope. This gives us exact queue counts without
// having to paginate through all fills.

export async function fetchFillCountByStatus(
  status: string
): Promise<number> {
  const raw = await drxFetch<Record<string, unknown>>(
    "/prescription-fills",
    { status, limit: 1, offset: 0 }
  );
  if (raw === null) return 0;
  // DRX response: { success: true, total: 86, fills: [...] }
  if (typeof raw.total === "number") return raw.total;
  // Fallback: if total field isn't present, count the array
  for (const value of Object.values(raw)) {
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

/**
 * Fetch live queue counts for all active DRX fill statuses in parallel.
 * Returns a map like { "Print": 86, "Scan": 205, ... }
 *
 * Standard statuses come from the external API (/external_api/v1/prescription-fills?status=X).
 * Custom queues come from DRX's internal API (/api/v1/custom_workflow_queue).
 */
const STANDARD_QUEUE_STATUSES = [
  "Pre-Check", "Adjudicating", "Rejected", "Print", "Scan", "Verify",
  "OOS", "Waiting Bin",
] as const;

// ─── DRX Internal API for custom workflow queues ────────
// DRX uses /api/v1/custom_workflow_queue (internal, cookie-based or API-key auth)
// Returns: { status: "ok", queues: [{ name: "price check", total: 13, ... }, ...] }

const DRX_INTERNAL_BASE =
  process.env.DRX_BASE_URL?.replace("/external_api/v1", "") ||
  "https://boudreaux.drxapp.com";

interface DrxCustomQueue {
  name: string;
  total: number;
  id: number;
  prescription_fill_tag_id: number;
}

/**
 * Parse custom queue data from the internal API response.
 * Handles multiple response shapes:
 * 1. Raw array: [{name, total, ...}, ...]
 * 2. Wrapped: { queues: [...] } or { status: "ok", queues: [...] }
 */
function parseCustomQueueResponse(data: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  let queues: DrxCustomQueue[] = [];

  if (Array.isArray(data)) {
    queues = data;
  } else if (
    typeof data === "object" &&
    data !== null &&
    "queues" in data &&
    Array.isArray((data as Record<string, unknown>).queues)
  ) {
    queues = (data as Record<string, unknown>).queues as DrxCustomQueue[];
  } else if (typeof data === "object" && data !== null) {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0 && (value[0] as Record<string, unknown>)?.name !== undefined) {
        queues = value as DrxCustomQueue[];
        break;
      }
    }
  }

  for (const q of queues) {
    const name = q.name || (q as unknown as { prescription_fill_tag?: { name?: string } }).prescription_fill_tag?.name;
    const total = typeof q.total === "number" ? q.total : 0;
    if (name) {
      counts[name] = total;
    }
  }

  return counts;
}

/**
 * Extract fill_tags array from DRX /fill-tags response.
 * Response format: { success: true, total: 1425, fill_tags: [{id, name, prescription_fills: [{prescription_fill_id}...]}] }
 */
function extractFillTags(raw: unknown): { id: number; name: string; prescription_fills: { prescription_fill_id: number }[] }[] {
  if (!raw || typeof raw !== "object") return [];

  // If it's a wrapped response with fill_tags key
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.fill_tags)) {
    return obj.fill_tags as { id: number; name: string; prescription_fills: { prescription_fill_id: number }[] }[];
  }

  // If it's a raw array
  if (Array.isArray(raw)) {
    return raw as { id: number; name: string; prescription_fills: { prescription_fill_id: number }[] }[];
  }

  // Find first array value in the response
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0 && typeof (value[0] as Record<string, unknown>)?.name === "string") {
      return value as { id: number; name: string; prescription_fills: { prescription_fill_id: number }[] }[];
    }
  }

  return [];
}

/**
 * Fetch custom queue counts via the external API's /fill-tags endpoint.
 * This works from ANY IP (including Vercel) because it uses the standard
 * X-DRX-Key auth on the external API — unlike the internal API which is
 * IP-restricted to the pharmacy network.
 *
 * Strategy:
 * 1. Paginate through /fill-tags to find tags matching known custom queue names
 * 2. For each match, query /prescription-fills with tag filter to get total count
 * 3. Fall back to prescription_fills array length if tag filtering doesn't work
 */
const KNOWN_CUSTOM_QUEUES = [
  "price check", "prepay", "ok to charge", "decline", "ok to charge clinic", "mochi",
];

async function fetchCustomQueueCountsViaExternalApi(): Promise<Record<string, number>> {
  try {
    // Paginate through all fill tags to find our custom queue tags
    // DRX has ~1,425 tags, max 100 per page = ~15 pages
    const matchedTags: { id: number; name: string; fillCount: number }[] = [];
    let offset = 0;
    const PAGE_LIMIT = 100;
    const MAX_PAGES = 20; // Safety limit

    for (let page = 0; page < MAX_PAGES; page++) {
      const raw = await drxFetch<unknown>("/fill-tags", { limit: PAGE_LIMIT, offset });
      if (!raw) break;

      const tags = extractFillTags(raw);
      if (tags.length === 0) break;

      // Check each tag against known custom queue names
      for (const tag of tags) {
        const tagNameLower = (tag.name || "").toLowerCase().trim();
        if (KNOWN_CUSTOM_QUEUES.some((q) => q.toLowerCase() === tagNameLower)) {
          matchedTags.push({
            id: tag.id,
            name: tag.name,
            fillCount: Array.isArray(tag.prescription_fills) ? tag.prescription_fills.length : 0,
          });
        }
      }

      // If we found all 6 custom queues, stop early
      if (matchedTags.length >= KNOWN_CUSTOM_QUEUES.length) break;

      // If this page had fewer than limit, no more pages
      if (tags.length < PAGE_LIMIT) break;
      offset += PAGE_LIMIT;
    }

    console.log(`[DRX] Found ${matchedTags.length} matching custom queue tags:`, matchedTags.map((t) => `${t.name}(id=${t.id})`).join(", "));

    if (matchedTags.length === 0) return {};

    // For each matched tag, try to get exact fill count via /prescription-fills with tag filter
    // Try multiple param names since we don't know exactly which one DRX uses
    const TAG_FILTER_PARAMS = ["prescription_fill_tag_id", "fill_tag_id", "tag_id", "tag"];
    const counts: Record<string, number> = {};

    await Promise.all(
      matchedTags.map(async (tag) => {
        // Try each filter param to see which gives us a filtered count
        for (const paramName of TAG_FILTER_PARAMS) {
          try {
            const raw = await drxFetch<Record<string, unknown>>("/prescription-fills", {
              [paramName]: tag.id,
              limit: 1,
              offset: 0,
            });
            if (raw && typeof raw.total === "number") {
              // Check if the total is actually filtered (should be < total fills)
              // Total unfiltered fills is ~497k, custom queues are typically < 200 each
              if (raw.total < 10000) {
                counts[tag.name] = raw.total;
                console.log(`[DRX] Tag "${tag.name}" count via ${paramName}: ${raw.total}`);
                return; // Found working filter param
              }
            }
          } catch {
            // This param didn't work, try next
          }
        }

        // Fallback: use the prescription_fills array length from the tag data
        // Note: this may be truncated (DRX seems to return max 10 per tag in list response)
        // Better than nothing, but may undercount
        counts[tag.name] = tag.fillCount;
        console.log(`[DRX] Tag "${tag.name}" fallback count from fill_tags array: ${tag.fillCount}`);
      })
    );

    console.log("[DRX] Custom queue counts via external API:", JSON.stringify(counts));
    return counts;
  } catch (e) {
    console.error("[DRX] Error fetching custom queues via external API:", e);
    return {};
  }
}

export async function fetchCustomQueueCounts(): Promise<Record<string, number>> {
  // Strategy: Try internal API first (works from pharmacy network),
  // fall back to external API /fill-tags (works from anywhere including Vercel)
  try {
    const url = `${DRX_INTERNAL_BASE}/api/v1/custom_workflow_queue`;

    // The internal API may require different auth than the external API.
    // Try X-DRX-Key + Bearer together first, fall back to each individually.
    const authVariants: Record<string, string>[] = [
      { "X-DRX-Key": DRX_API_KEY, Authorization: `Bearer ${DRX_API_KEY}` },
      { Authorization: `Bearer ${DRX_API_KEY}` },
      { "X-DRX-Key": DRX_API_KEY },
    ];

    let res: Response | null = null;
    for (const authHeaders of authVariants) {
      const attempt = await fetch(url, {
        headers: {
          ...authHeaders,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (attempt.ok) {
        res = attempt;
        break;
      }
      if (attempt.status === 401 || attempt.status === 403) {
        continue;
      }
      console.log(`[DRX] custom_workflow_queue returned ${attempt.status}`);
      break;
    }

    if (res?.ok) {
      const data = await res.json();
      const counts = parseCustomQueueResponse(data);
      if (Object.keys(counts).length > 0) {
        console.log(`[DRX] custom queue counts (internal API):`, JSON.stringify(counts));
        return counts;
      }
    }

    // Internal API failed (IP-restricted from Vercel) — try external API fallback
    console.log("[DRX] Internal API unavailable, trying external API /fill-tags fallback...");
    return await fetchCustomQueueCountsViaExternalApi();
  } catch (e) {
    console.error("[DRX] Error fetching custom queues:", e);
    // Last resort: try external API
    try {
      return await fetchCustomQueueCountsViaExternalApi();
    } catch {
      return {};
    }
  }
}

// ─── Custom queue fills by tag name ──────────────────
// Custom queues are based on fill tags, not DRX statuses.
// The DRX /prescription-fills endpoint does NOT support filtering by tag.
// Strategy:
// 1. Find the tag by name in /fill-tags (paginate to find it)
// 2. Get the fill IDs from the tag's prescription_fills array
// 3. Fetch individual fills via /prescription-fill/{id} with concurrency

/**
 * Find a fill tag by name from the DRX /fill-tags endpoint.
 * Returns the tag's fill IDs (prescription_fill_id values).
 * Paginates through all tags to find a case-insensitive match.
 */
async function findFillTag(tagName: string): Promise<{ id: number; fillIds: number[] } | null> {
  const targetLower = tagName.toLowerCase().trim();
  let offset = 0;
  const PAGE_LIMIT = 100;

  for (let page = 0; page < 20; page++) {
    const raw = await drxFetch<unknown>("/fill-tags", { limit: PAGE_LIMIT, offset });
    if (!raw) break;

    const tags = extractFillTags(raw);
    if (tags.length === 0) break;

    for (const tag of tags) {
      if ((tag.name || "").toLowerCase().trim() === targetLower) {
        const fillIds = Array.isArray(tag.prescription_fills)
          ? tag.prescription_fills.map((f) => f.prescription_fill_id).filter(Boolean)
          : [];
        console.log(`[DRX] Found fill tag "${tagName}" → id=${tag.id}, ${fillIds.length} fill IDs`);
        return { id: tag.id, fillIds };
      }
    }

    if (tags.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  console.log(`[DRX] Fill tag "${tagName}" not found`);
  return null;
}

/**
 * Check if a queue name is a custom queue (fill-tag-based) rather than a standard status.
 */
export function isCustomQueue(drxName: string): boolean {
  return KNOWN_CUSTOM_QUEUES.some((q) => q.toLowerCase() === drxName.toLowerCase().trim());
}

/**
 * Fetch fills for a custom queue (tag-based) from the external API.
 * Gets fill IDs from the tag, then fetches each fill by ID.
 * Returns the total count and a page of fill records.
 */
export async function fetchFillsByTagName(
  tagName: string,
  limit: number,
  offset: number
): Promise<{ total: number; fills: Record<string, unknown>[] }> {
  const tag = await findFillTag(tagName);
  if (!tag || tag.fillIds.length === 0) return { total: 0, fills: [] };

  const total = tag.fillIds.length;

  // Paginate: take the slice of fill IDs for this page
  const pageIds = tag.fillIds.slice(offset, offset + limit);
  if (pageIds.length === 0) return { total, fills: [] };

  // Fetch individual fills by ID with concurrency (5 at a time)
  const CONCURRENCY = 5;
  const fills: Record<string, unknown>[] = [];

  for (let i = 0; i < pageIds.length; i += CONCURRENCY) {
    const batch = pageIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((fillId) =>
        drxFetch<Record<string, unknown>>(`/prescription-fill/${fillId}`)
      )
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        fills.push(result.value);
      }
    }
  }

  console.log(`[DRX] Tag "${tagName}": total=${total}, fetched ${fills.length}/${pageIds.length} fills (offset=${offset})`);
  return { total, fills };
}

export async function fetchAllQueueCounts(): Promise<Record<string, number>> {
  // Fetch standard statuses + custom queues in parallel
  const [standardResults, customCounts] = await Promise.all([
    Promise.all(
      STANDARD_QUEUE_STATUSES.map(async (status) => {
        try {
          const count = await fetchFillCountByStatus(status);
          return { status, count };
        } catch {
          return { status, count: 0 };
        }
      })
    ),
    fetchCustomQueueCounts(),
  ]);

  const counts: Record<string, number> = {};

  // Standard statuses
  for (const r of standardResults) {
    counts[r.status] = r.count;
  }

  // Custom queues (merge in)
  for (const [name, total] of Object.entries(customCounts)) {
    counts[name] = total;
  }

  return counts;
}

// ─── Individual fetch methods (singular paths) ──

export async function fetchPatientById(id: number): Promise<DrxPatient | null> {
  return drxFetch<DrxPatient>(`/patient/${id}`);
}

export async function fetchDoctorById(id: number): Promise<DrxDoctor | null> {
  return drxFetch<DrxDoctor>(`/doctor/${id}`);
}

export async function fetchItemById(id: number): Promise<DrxItem | null> {
  return drxFetch<DrxItem>(`/item/${id}`);
}

export async function fetchPrescriptionById(id: number): Promise<DrxPrescription | null> {
  return drxFetch<DrxPrescription>(`/prescription/${id}`);
}

export async function fetchPrescriptionFillById(id: number): Promise<DrxPrescriptionFill | null> {
  return drxFetch<DrxPrescriptionFill>(`/prescription-fill/${id}`);
}

export async function fetchClaimById(id: number): Promise<DrxClaim | null> {
  return drxFetch<DrxClaim>(`/claim/${id}`);
}

// ─── List endpoints (plural paths, paginated) ──

export async function fetchPatients(offset = 0, limit = 100) {
  return drxFetchPage<DrxPatient>("/patients", offset, limit);
}

export async function fetchDoctors(offset = 0, limit = 100) {
  return drxFetchPage<DrxDoctor>("/doctors", offset, limit);
}

export async function fetchItems(offset = 0, limit = 100) {
  return drxFetchPage<DrxItem>("/items", offset, limit);
}

export async function fetchPrescriptions(offset = 0, limit = 100) {
  return drxFetchPage<DrxPrescription>("/prescriptions", offset, limit);
}

export async function fetchPrescriptionFills(offset = 0, limit = 100) {
  return drxFetchPage<DrxPrescriptionFill>("/prescription-fills", offset, limit);
}

export async function fetchClaims(offset = 0, limit = 100) {
  return drxFetchPage<DrxClaim>("/claims", offset, limit);
}

export async function fetchRefillRequests(offset = 0, limit = 100) {
  return drxFetchPage<DrxRefillRequest>("/refill-requests", offset, limit);
}

export async function fetchInventory(offset = 0, limit = 100) {
  return drxFetchPage<DrxInventory>("/inventory", offset, limit);
}

// ─── Modified-since endpoints (for delta sync) ──

/**
 * Fetch records modified after a given timestamp.
 * DRX supports updatedAfter/createdAfter on items, prescriptions, and fills.
 * For patients/doctors, we fall back to fetching all and filtering client-side.
 */
export async function fetchModifiedSince<T>(
  endpoint: string,
  since: Date,
  limit = 100
): Promise<T[]> {
  const allRecords: T[] = [];
  const sinceStr = since.toISOString();

  // DRX uses updatedAfter param (ISO 8601)
  await fetchAllPages<T>(
    endpoint,
    limit,
    async (records) => {
      allRecords.push(...records);
    },
    { updatedAfter: sinceStr }
  );

  return allRecords;
}

// ─── ID Range Iterator (legacy, for initial import) ──

export async function iterateByIdRange<T>(
  fetcher: (id: number) => Promise<T | null>,
  startId: number,
  endId: number,
  opts?: {
    concurrency?: number;
    onRecord?: (record: T, id: number) => Promise<void>;
    onProgress?: (current: number, total: number, found: number) => void;
    maxConsecutiveMisses?: number;
  }
): Promise<number> {
  const concurrency = opts?.concurrency || 5;
  const maxMisses = opts?.maxConsecutiveMisses || 500;
  let found = 0;
  let consecutiveMisses = 0;

  for (let i = startId; i <= endId; i += concurrency) {
    const batch = Array.from(
      { length: Math.min(concurrency, endId - i + 1) },
      (_, j) => i + j
    );

    const results = await Promise.allSettled(
      batch.map((id) => fetcher(id))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value !== null) {
        found++;
        consecutiveMisses = 0;
        if (opts?.onRecord) {
          await opts.onRecord(result.value, batch[j]);
        }
      } else {
        consecutiveMisses++;
      }
    }

    opts?.onProgress?.(i + batch.length - 1, endId, found);

    if (consecutiveMisses >= maxMisses) break;
  }

  return found;
}

// ─── Connection test (uses /heartbeat) ──────────

export async function testConnection(): Promise<{
  connected: boolean;
  error?: string;
  heartbeat?: number;
  listSupported?: boolean;
}> {
  try {
    if (!DRX_API_KEY) {
      return { connected: false, error: "DRX_API_KEY not set" };
    }

    // Test with the heartbeat endpoint (recommended by DRX docs)
    const res = await fetch(`${DRX_BASE_URL}/heartbeat`, {
      headers: {
        "X-DRX-Key": DRX_API_KEY,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      return { connected: false, error: "Invalid API key or insufficient permissions" };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { connected: false, error: `DRX API returned ${res.status}: ${text}` };
    }

    const data = await res.json().catch(() => ({}));
    const heartbeat = data?.pulse;

    // Also test list endpoint
    let listSupported = false;
    try {
      const listRes = await fetch(`${DRX_BASE_URL}/patients?limit=1&offset=0`, {
        headers: {
          "X-DRX-Key": DRX_API_KEY,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });
      listSupported = listRes.ok;
    } catch {
      listSupported = false;
    }

    return { connected: true, heartbeat, listSupported };
  } catch (e) {
    return { connected: false, error: (e as Error).message };
  }
}
