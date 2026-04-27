/**
 * /pickup/[fillId] — DEPRECATED.
 *
 * This route was a parallel pickup-completion flow that bypassed key safety
 * gates:
 *   - Did NOT enforce OBRA-90 counseling
 *   - Did NOT enforce ID verification for controlled substances
 *   - Did NOT route through advanceFillStatus, so FillEvent audit rows were
 *     never written
 *   - Set status="dispensed" instead of the canonical terminal "sold"
 *   - completedBy was being set to fillId (literal bug — the param was
 *     passed where the user.id should have gone)
 *
 * The canonical pickup workflow lives at /queue/process/[fillId], which
 * walks the pharmacist through verify → waiting_bin → sold with all the
 * pickup-checklist guards wired up. This route now permanently redirects
 * to that page so any cached / bookmarked links still work.
 */
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ fillId: string }>;
}

export default async function DeprecatedPickupRedirect({ params }: PageProps) {
  const { fillId } = await params;
  redirect(`/queue/process/${fillId}`);
}
