/**
 * /pos — Point of Sale register (status page).
 *
 * The previous mock-data version showed a hardcoded cart for "James
 * Hebert / Atorvastatin / $14.20" with a non-functional Charge button
 * and a hardcoded 9.45% tax computed via float math (.toFixed(2) on
 * floating-point arithmetic). That's a dangerous footgun for a
 * pharmacy — operators could click Charge, see a success animation,
 * and assume the patient was charged when nothing actually happened.
 *
 * Until the real register flow is built, the canonical place to ring
 * a patient up is /queue/process/[fillId] — that has the real pickup
 * checklist (counsel offered, signature captured, payment received),
 * the controlled-substance ID gate, and writes a real Payment row
 * via the existing recordPickupChecklist + processFill server actions.
 *
 * /pos/history is fully wired to real getTransactions() — that view
 * shows actual processed POS transactions when they exist.
 */
import { getPosStats } from "./actions";
import PosClient from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const stats = await getPosStats();
  return <PosClient stats={stats} />;
}
