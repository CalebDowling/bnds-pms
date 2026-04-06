"use server";

export interface PatientLookupResult {
  id: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  phone: string | null;
  deliveryMethod: string | null;
  active: boolean;
  source: "drx";
  fills: {
    fillId: string;
    rxId: string;
    drugName: string;
    status: string;
    fillDate: string | null;
    quantity: number;
    daysSupply: number | null;
  }[];
}

export async function searchPatientsLive(query: string): Promise<PatientLookupResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const drxClient = await import("@/lib/drx/client");
    const trimmed = query.trim();

    // Determine search strategy: RX number (all digits) vs name
    const isRxSearch = /^\d+$/.test(trimmed);

    if (isRxSearch) {
      // Search by prescription ID — fetch the prescription directly
      return await searchByRxNumber(drxClient, trimmed);
    } else {
      // Search by patient name via DRX /patients endpoint
      return await searchByName(drxClient, trimmed);
    }
  } catch (e) {
    console.error("[PatientLookup] Error:", e);
    return [];
  }
}

async function searchByName(drxClient: any, name: string): Promise<PatientLookupResult[]> {
  const parts = name.split(/\s+/);
  const searchParams: Record<string, string | number> = { limit: 20, offset: 0 };

  if (parts.length >= 2) {
    searchParams.first_name = parts[0];
    searchParams.last_name = parts[parts.length - 1];
  } else {
    searchParams.last_name = parts[0];
  }

  const page = await drxClient.default?.drxFetchPage
    ? null
    : null;

  // Use fetchAllPages to get patient results
  const patients: any[] = [];
  await drxClient.fetchAllPages(
    "/patients",
    20,
    async (batch: any[]) => {
      patients.push(...batch);
    },
    searchParams,
    () => patients.length < 20
  );

  // For each patient, fetch their recent fills
  const results: PatientLookupResult[] = [];

  // Limit to first 10 patients to avoid overwhelming DRX API
  const toProcess = patients.slice(0, 10);

  const fillPromises = toProcess.map(async (patient: any) => {
    const fills = await fetchPatientFills(drxClient, patient.id);
    return {
      id: String(patient.id),
      firstName: patient.first_name || "",
      lastName: patient.last_name || "",
      dob: patient.date_of_birth || null,
      phone: patient.phone_numbers?.[0]?.number || null,
      deliveryMethod: patient.delivery_method || null,
      active: patient.active !== false,
      source: "drx" as const,
      fills,
    };
  });

  return Promise.all(fillPromises);
}

async function searchByRxNumber(drxClient: any, rxId: string): Promise<PatientLookupResult[]> {
  try {
    // Fetch the specific prescription to get the patient
    const fills: any[] = [];
    await drxClient.fetchAllPages(
      "/prescription-fills",
      10,
      async (batch: any[]) => {
        fills.push(...batch);
      },
      { prescription_id: rxId, limit: 10, offset: 0 },
      () => fills.length < 10
    );

    if (fills.length === 0) return [];

    // Group fills by patient
    const patientMap = new Map<string, PatientLookupResult>();

    for (const drx of fills) {
      const patient = drx.patient;
      if (!patient?.id) continue;

      const pid = String(patient.id);
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          id: pid,
          firstName: patient.first_name || "",
          lastName: patient.last_name || "",
          dob: patient.date_of_birth || null,
          phone: patient.phone_numbers?.[0]?.number || null,
          deliveryMethod: patient.delivery_method || null,
          active: true,
          source: "drx",
          fills: [],
        });
      }

      const fill = drx.fill;
      if (fill) {
        patientMap.get(pid)!.fills.push({
          fillId: String(fill.id),
          rxId: drx.prescription?.id ? String(drx.prescription.id) : "—",
          drugName: drx.dispensed_item?.name || "Unknown",
          status: fill.status || "Unknown",
          fillDate: fill.fill_date || fill.created_at || null,
          quantity: fill.dispensed_quantity || 0,
          daysSupply: fill.days_supply || null,
        });
      }
    }

    return Array.from(patientMap.values());
  } catch (e) {
    console.error("[PatientLookup] RX search error:", e);
    return [];
  }
}

async function fetchPatientFills(drxClient: any, patientId: number): Promise<PatientLookupResult["fills"]> {
  try {
    const fills: any[] = [];
    await drxClient.fetchAllPages(
      "/prescription-fills",
      20,
      async (batch: any[]) => {
        fills.push(...batch);
      },
      { patient_id: patientId, limit: 20, offset: 0 },
      () => fills.length < 20
    );

    return fills.map((drx: any) => ({
      fillId: String(drx.fill?.id || 0),
      rxId: drx.prescription?.id ? String(drx.prescription.id) : "—",
      drugName: drx.dispensed_item?.name || "Unknown",
      status: drx.fill?.status || "Unknown",
      fillDate: drx.fill?.fill_date || drx.fill?.created_at || null,
      quantity: drx.fill?.dispensed_quantity || 0,
      daysSupply: drx.fill?.days_supply || null,
    }));
  } catch {
    return [];
  }
}
