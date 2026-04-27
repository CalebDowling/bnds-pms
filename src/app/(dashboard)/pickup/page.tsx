/**
 * /pickup — Will-call bin board (real data).
 *
 * Replaces the mock-data redesign with real fills in waiting_bin status,
 * grouped by physical bin location. Each card links to /queue/process/[fillId]
 * — the canonical workflow page where the pickup checklist (counsel offered,
 * signature captured, payment received, ID for controlled substances) is
 * collected before the fill can advance to "sold".
 *
 * NOTE: We deliberately do NOT link to the legacy /pickup/[fillId] route.
 * That route is being deprecated because it bypasses the pickup-checklist
 * gate and uses an invalid terminal status ("dispensed" vs "sold"). Existing
 * links from older deploys will redirect to the canonical page.
 */
import { prisma } from "@/lib/prisma";
import { formatDrugWithStrength, formatItemDisplayName } from "@/lib/utils/formatters";
import { isControlledDrug, isScheduleII } from "@/lib/utils/dea";
import PickupClient, { type PickupBin } from "./PickupClient";

export const dynamic = "force-dynamic";

export default async function PickupPage() {
  // Fills physically in the will-call bins are status="waiting_bin". We pull
  // controlled-substance + allergy info so the bin card can render the
  // "C-II · ID" / "Counsel" pills without a second query.
  let fills: any[] = [];
  try {
    fills = await prisma.prescriptionFill.findMany({
      where: { status: "waiting_bin" },
      include: {
        prescription: {
          select: {
            rxNumber: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                allergies: {
                  where: { status: "active" },
                  select: { severity: true },
                },
                insurance: {
                  where: { isActive: true },
                  orderBy: { priority: "asc" },
                  take: 1,
                  select: { thirdPartyPlan: { select: { planName: true } } },
                },
              },
            },
            item: {
              select: {
                name: true,
                genericName: true,
                brandName: true,
                ndc: true,
                strength: true,
                deaSchedule: true,
                isControlled: true,
              },
            },
          },
        },
        item: {
          select: {
            name: true,
            genericName: true,
            brandName: true,
            ndc: true,
            strength: true,
            deaSchedule: true,
            isControlled: true,
          },
        },
      },
      orderBy: { verifiedAt: "asc" }, // oldest first → those need to be flagged for restock
      take: 200,
    });
  } catch (e) {
    console.error("[/pickup] Failed to fetch waiting_bin fills:", e);
  }

  const now = Date.now();
  const bins: PickupBin[] = fills.map((f) => {
    const item = f.item ?? f.prescription?.item;
    const patient = f.prescription?.patient;
    const allergies = patient?.allergies ?? [];
    const insurance =
      patient?.insurance?.[0]?.thirdPartyPlan?.planName ??
      (patient?.insurance?.length ? "On file" : "Cash");

    // Use the shared isControlledDrug helper so the queue / pickup /
    // workflow page agree on what counts as a controlled substance.
    // See lib/utils/dea.ts.
    const deaSchedule = item?.deaSchedule ? String(item.deaSchedule) : null;
    const isCII = isScheduleII({ deaSchedule });
    const isControlled = isControlledDrug({
      isControlled: !!item?.isControlled,
      deaSchedule,
    });

    const hasSevereAllergy = allergies.some(
      (a: any) => a.severity === "severe" || a.severity === "critical"
    );

    const verifiedAt = f.verifiedAt ?? f.createdAt ?? null;
    const ageMs = verifiedAt ? now - new Date(verifiedAt).getTime() : 0;
    const ageHours = ageMs / (60 * 60 * 1000);
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    const ageLabel =
      ageDays >= 1 ? `${Math.floor(ageDays)}d` : `${Math.max(1, Math.floor(ageHours))}h`;
    const copay = f.copayAmount != null ? Number(f.copayAmount) : 0;

    return {
      fillId: f.id,
      bin: f.binLocation || "—",
      rxNumber: f.prescription?.rxNumber ?? "—",
      patientName: patient
        ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim()
        : "Unknown",
      patientId: patient?.id ?? null,
      // #14/#16 — same dedup/sanitize logic as the queue page so the
      // pickup card and the queue row render the same drug label.
      itemName: item
        ? formatDrugWithStrength(formatItemDisplayName(item), item.strength)
        : "Unknown drug",
      copay,
      ageLabel,
      ageDays: Math.floor(ageDays),
      insurance,
      isCII,
      isControlled,
      hasSevereAllergy,
    };
  });

  return <PickupClient bins={bins} />;
}
