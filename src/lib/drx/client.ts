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

  // DRX returns arrays directly
  if (Array.isArray(raw)) {
    return {
      data: raw as T[],
      offset,
      limit,
      hasMore: raw.length >= limit,
    };
  }

  // Handle object wrapper just in case
  const obj = raw as Record<string, unknown>;
  const data = (obj.data || obj.results || obj.items || obj.records || []) as T[];

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
  extraParams?: Record<string, string | number | boolean>
): Promise<number> {
  let offset = 0;
  let total = 0;
  let page = 0;

  while (true) {
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

export interface DrxPrescription {
  id: number;
  created_at: string;
  updated_at: string;
  rx_number: string;
  patient_id: number;
  doctor_id: number;
  item_id: number | null;
  status: string;
  quantity_prescribed: number | null;
  quantity_dispensed: number | null;
  days_supply: number | null;
  directions: string | null;
  sig: string | null;
  daw_code: string | null;
  refills_authorized: number;
  refills_remaining: number;
  date_written: string | null;
  date_received: string | null;
  date_filled: string | null;
  expiration_date: string | null;
  prescriber_notes: string | null;
  internal_notes: string | null;
  priority: string | null;
  source: string | null;
  is_compound: boolean;
  formula_id: number | null;
  [key: string]: unknown;
}

export interface DrxPrescriptionFill {
  id: number;
  created_at: string;
  updated_at: string;
  prescription_id: number;
  fill_number: number;
  item_id: number | null;
  ndc: string | null;
  quantity: number;
  days_supply: number | null;
  status: string;
  bin_location: string | null;
  copay_amount: number | null;
  ingredient_cost: number | null;
  dispensing_fee: number | null;
  total_price: number | null;
  filled_at: string | null;
  verified_at: string | null;
  dispensed_at: string | null;
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
