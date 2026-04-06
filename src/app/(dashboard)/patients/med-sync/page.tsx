export const dynamic = "force-dynamic";
import { MedSyncPage } from "./client";
import type { SyncPatient, MedSyncStats } from "./client";
import { getMedSyncPatients, getMedSyncStats } from "./actions";

export default async function Page() {
  const initialStats: MedSyncStats = {
    enrolledCount: 0,
    nextBatchDate: null,
    avgMedsPerPatient: 0,
  };

  let initialPatients: SyncPatient[] = [];
  let finalStats = initialStats;

  try {
    const [patientsData, statsData] = await Promise.all([
      getMedSyncPatients(),
      getMedSyncStats(),
    ]);
    initialPatients = patientsData;
    finalStats = statsData;
  } catch (error) {
    console.error("Failed to load med sync data:", error);
  }

  return (
    <MedSyncPage
      initialPatients={initialPatients}
      initialStats={finalStats}
    />
  );
}
