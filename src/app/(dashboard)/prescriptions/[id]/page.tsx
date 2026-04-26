import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrescription } from "../actions";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
// PrescriptionStatusBar (legacy `Prescription.status` state machine) is no
// longer rendered — `PrescriptionFill.status` is the canonical workflow
// state. The component file is preserved for reference but unused.
import FillForm from "./FillForm";
import PermissionGuard from "@/components/auth/PermissionGuard";
import type { PrescriptionFillWithRelations, StatusLog } from "@/types";
import type { PatientWithRelations } from "@/types/patient";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  intake: { label: "Intake", color: "bg-gray-100 text-gray-700" },
  pending_review: { label: "Pending Review", color: "bg-yellow-50 text-yellow-700" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700" },
  compounding: { label: "Compounding", color: "bg-purple-50 text-purple-700" },
  ready_to_fill: { label: "Ready to Fill", color: "bg-indigo-50 text-indigo-700" },
  filling: { label: "Filling", color: "bg-blue-50 text-blue-700" },
  ready_for_verification: { label: "Needs Verification", color: "bg-orange-50 text-orange-700" },
  verified: { label: "Verified", color: "bg-teal-50 text-teal-700" },
  ready: { label: "Ready", color: "bg-green-50 text-green-700" },
  on_hold: { label: "On Hold", color: "bg-red-50 text-red-700" },
  dispensed: { label: "Dispensed", color: "bg-green-100 text-green-800" },
  shipped: { label: "Shipped", color: "bg-cyan-50 text-cyan-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

async function PrescriptionDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rx = await getPrescription(id);

  if (!rx) notFound();

  // Fetch available lots for the item (non-compound Rx)
  let availableLots: Array<{ id: string; lotNumber: string; quantityOnHand: number; expirationDate: string }> = [];
  if (rx.itemId) {
    const lots = await prisma.itemLot.findMany({
      where: {
        itemId: rx.itemId,
        quantityOnHand: { gt: 0 },
        status: "available",
        expirationDate: { gt: new Date() },
      },
      select: { id: true, lotNumber: true, quantityOnHand: true, expirationDate: true },
      orderBy: { expirationDate: "asc" },
    });
    availableLots = lots.map(l => ({
      ...l,
      quantityOnHand: Number(l.quantityOnHand),
      expirationDate: formatDate(l.expirationDate),
    }));
  }

  // Fetch available batches for the formula (compound Rx)
  let availableBatches: Array<{ id: string; batchNumber: string; quantityPrepared: number; status: string }> = [];
  if (rx.formulaId) {
    const batches = await prisma.batch.findMany({
      where: {
        formulaVersion: { formulaId: rx.formulaId },
        status: { in: ["verified", "completed"] },
      },
      select: { id: true, batchNumber: true, quantityPrepared: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    availableBatches = batches.map(b => ({
      ...b,
      quantityPrepared: Number(b.quantityPrepared),
    }));
  }

  const canFill = ["ready_to_fill", "filling", "in_progress", "verified", "ready"].includes(rx.status);

  const statusInfo = STATUS_CONFIG[rx.status] || { label: rx.status, color: "bg-gray-100 text-gray-700" };
  const drugName = rx.isCompound
    ? rx.formula?.name || "Compound"
    : rx.item
    ? `${rx.item.name} ${rx.item.strength || ""}`
    : "Unspecified";
  const activeAllergies = rx.patient.allergies || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Rx# {rx.rxNumber}</h1>
            {rx.item && <p className="text-sm text-gray-500">{rx.item.name}{rx.item.strength ? ` ${rx.item.strength}` : ""}</p>}
            {rx.formula && <p className="text-sm text-purple-600">{rx.formula.name} (Compound)</p>}
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {(rx.priority === "urgent" || rx.priority === "stat") && (
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${
                rx.priority === "stat" ? "bg-red-100 text-red-800" : "bg-orange-50 text-orange-700"
              }`}>
                {rx.priority.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {drugName}
            {rx.isCompound && " (Compound)"}
            {" — "}
            <Link href={`/patients/${rx.patient.id}`} className="text-[#40721D] hover:underline">
              {rx.patient.lastName}, {rx.patient.firstName}
            </Link>
            {" "}({rx.patient.mrn})
          </p>
        </div>
        <Link href="/prescriptions" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Back to List
        </Link>
      </div>

      {/* Status actions removed: per-fill workflow lives on the queue/process
          pages (driven by PrescriptionFill.status), not on the prescription
          detail page. */}

      {/* Allergy Warning */}
      {activeAllergies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-800 mb-1">Allergy Alert</p>
          <div className="flex flex-wrap gap-2">
            {activeAllergies.map((a: PatientWithRelations["allergies"][number]) => (
              <span key={a.id} className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                a.severity === "life_threatening" || a.severity === "severe"
                  ? "bg-red-200 text-red-900"
                  : "bg-red-100 text-red-700"
              }`}>
                {a.allergen} ({a.severity.replace("_", " ")})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rx Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Prescription Details</h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Drug / Compound</dt>
                <dd className="text-sm text-gray-900 font-medium">{drugName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Source</dt>
                <dd className="text-sm text-gray-900 capitalize">{rx.source}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Quantity</dt>
                <dd className="text-sm text-gray-900">{rx.quantityPrescribed?.toString() || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Days Supply</dt>
                <dd className="text-sm text-gray-900">{rx.daysSupply || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Refills</dt>
                <dd className="text-sm text-gray-900">{rx.refillsRemaining} / {rx.refillsAuthorized}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">DAW</dt>
                <dd className="text-sm text-gray-900">{rx.dawCode || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Date Written</dt>
                <dd className="text-sm text-gray-900">{formatDate(rx.dateWritten)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Received</dt>
                <dd className="text-sm text-gray-900">{formatDate(rx.dateReceived)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Expires</dt>
                <dd className="text-sm text-gray-900">{formatDate(rx.expirationDate)}</dd>
              </div>
            </dl>
            {rx.directions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Directions (SIG)</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{rx.directions}</p>
              </div>
            )}
          </div>

          {/* Fills */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Fill History ({rx.fills.length})
              </h2>
              {canFill && (
                <FillForm
                  prescriptionId={rx.id}
                  isCompound={rx.isCompound}
                  itemId={rx.itemId}
                  formulaId={rx.formulaId}
                  quantityPrescribed={rx.quantityPrescribed ? Number(rx.quantityPrescribed) : null}
                  daysSupply={rx.daysSupply}
                  lots={availableLots}
                  batches={availableBatches}
                  allergies={activeAllergies.map((a: PatientWithRelations["allergies"][number]) => ({ allergen: a.allergen, severity: a.severity }))}
                />
              )}
            </div>
            {rx.fills.length > 0 ? (
              <div className="space-y-3">
                {rx.fills.map((fill: PrescriptionFillWithRelations) => (
                  <div key={fill.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Fill #{fill.fillNumber} {fill.fillNumber === 0 ? "(Original)" : "(Refill)"}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        fill.status === "dispensed" || fill.status === "verified" ? "bg-green-50 text-green-700"
                          : fill.status === "pending" ? "bg-yellow-50 text-yellow-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {fill.status}
                      </span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-gray-400">Qty</dt>
                        <dd className="text-gray-900">{fill.quantity.toString()}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-400">Filled By</dt>
                        <dd className="text-gray-900">
                          {fill.filler ? `${fill.filler.firstName} ${fill.filler.lastName}` : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-400">Verified By</dt>
                        <dd className="text-gray-900">
                          {fill.verifier ? `${fill.verifier.firstName} ${fill.verifier.lastName}` : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No fills yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Prescriber */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Prescriber</h3>
            <p className="text-sm font-medium text-gray-900">
              Dr. {rx.prescriber.lastName}, {rx.prescriber.firstName}
              {rx.prescriber.suffix ? ` ${rx.prescriber.suffix}` : ""}
            </p>
            <p className="text-xs text-gray-500">NPI: {rx.prescriber.npi}</p>
            {rx.prescriber.specialty && <p className="text-xs text-gray-500">{rx.prescriber.specialty}</p>}
            {rx.prescriber.phone && <p className="text-xs text-gray-500">Ph: {rx.prescriber.phone}</p>}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Notes</h3>
            {rx.prescriberNotes && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Prescriber Notes</p>
                <p className="text-sm text-gray-700">{rx.prescriberNotes}</p>
              </div>
            )}
            {rx.internalNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Internal Notes</p>
                <p className="text-sm text-gray-700">{rx.internalNotes}</p>
              </div>
            )}
            {!rx.prescriberNotes && !rx.internalNotes && (
              <p className="text-sm text-gray-400">No notes</p>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Activity Log</h3>
            {rx.statusLog.length > 0 ? (
              <div className="space-y-3">
                {rx.statusLog.map((log: StatusLog) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#40721D] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-900">
                        <span className="capitalize">{log.fromStatus?.replace(/_/g, " ")}</span>
                        {" → "}
                        <span className="font-medium capitalize">{log.toStatus.replace(/_/g, " ")}</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {log.changer.firstName} {log.changer.lastName} — {formatDate(log.changedAt)}
                      </p>
                      {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No status changes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PermissionGuard resource="prescriptions" action="read">
      <PrescriptionDetailPageContent params={params} />
    </PermissionGuard>
  );
}
