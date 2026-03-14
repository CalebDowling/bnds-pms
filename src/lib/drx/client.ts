/**
 * DRX API Client
 *
 * Connects to the DRX pharmacy system at boudreaux.drxapp.com
 * via the internal API (/api/v1/) which accepts Bearer token auth.
 *
 * Records are fetched individually by ID since the list endpoints
 * require session auth. We iterate through ID ranges to import data.
 */

const DRX_BASE_URL =
  process.env.DRX_BASE_URL || "https://boudreaux.drxapp.com/api/v1";
const DRX_API_KEY = process.env.DRX_API_KEY || "";

async function drxFetch<T>(endpoint: string): Promise<T | null> {
  const res = await fetch(`${DRX_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${DRX_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (res.status === 404) return null;
  if (res.status === 500) return null; // Some IDs trigger server errors
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DRX API ${res.status} at ${endpoint}: ${text}`);
  }

  const data = await res.json();
  // Some endpoints return null for non-existent records
  if (data === null) return null;
  // /rx endpoint returns { success: false } for missing records
  if (data?.success === false) return null;
  return data;
}

// ─── DRX Response Types (matching actual API responses) ──────────

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

// ─── API Methods ─────────────────────────────

export async function fetchPatientById(id: number): Promise<DrxPatient | null> {
  return drxFetch<DrxPatient>(`/patient/${id}`);
}

export async function fetchDoctorById(id: number): Promise<DrxDoctor | null> {
  return drxFetch<DrxDoctor>(`/doctor/${id}`);
}

export async function fetchItemById(id: number): Promise<DrxItem | null> {
  return drxFetch<DrxItem>(`/item/${id}`);
}

/**
 * Iterate through DRX records by ID range.
 * Calls handler for each non-null result. Returns count of records found.
 */
export async function iterateByIdRange<T>(
  fetcher: (id: number) => Promise<T | null>,
  startId: number,
  endId: number,
  opts?: {
    concurrency?: number;
    onRecord?: (record: T, id: number) => Promise<void>;
    onProgress?: (current: number, total: number, found: number) => void;
    /** Stop after this many consecutive 404s/nulls */
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

    // If we've seen too many consecutive misses, we've likely passed the last record
    if (consecutiveMisses >= maxMisses) {
      break;
    }
  }

  return found;
}

export async function testConnection(): Promise<boolean> {
  try {
    // Try fetching a known endpoint
    const res = await fetch(`${DRX_BASE_URL}/stores`, {
      headers: {
        Authorization: `Bearer ${DRX_API_KEY}`,
        Accept: "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
