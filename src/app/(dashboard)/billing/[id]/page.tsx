import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaim, getClaimStatusHistory, updateClaimStatus } from "../actions";
import { lookupRejectionCode } from "../ncpdp-codes";
import { formatDate } from "@/lib/utils";
import PermissionGuard from "@/components/auth/PermissionGuard";

const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  submitted: { label: "Submitted", color: "bg-blue-50 text-blue-700 border-blue-200" },
  accepted: { label: "Accepted", color: "bg-green-50 text-green-700 border-green-200" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800 border-green-300" },
  partial: { label: "Partial Pay", color: "bg-orange-50 text-orange-700 border-orange-200" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" },
  reversed: { label: "Reversed", color: "bg-gray-100 text-gray-600 border-gray-300" },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["submitted"],
  submitted: ["accepted", "rejected"],
  accepted: ["paid", "partial"],
  partial: ["paid"],
  rejected: ["submitted"],
  paid: ["reversed"],
  reversed: [],
};

async function ClaimDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [claim, statusHistory] = await Promise.all([
    getClaim(id),
    getClaimStatusHistory(id),
  ]);

  if (!claim) return notFound();

  const si = CLAIM_STATUS[claim.status] || { label: claim.status, color: "bg-gray-100 text-gray-600 border-gray-300" };
  const fill = claim.fills?.[0];
  const rx = fill?.prescription;
  const drugName = rx?.item?.name || rx?.formula?.name || "Unknown";
  const patient = claim.insurance?.patient;
  const plan = claim.insurance?.thirdPartyPlan;
  const nextStatuses = STATUS_TRANSITIONS[claim.status] || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/billing" className="hover:text-[#40721D]">Billing</Link>
        <span>/</span>
        <span className="text-gray-900">{claim.claimNumber || `Claim ${id.slice(0, 8)}`}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {claim.claimNumber || `Claim ${id.slice(0, 8)}`}
          </h1>
          <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${si.color}`}>
            {si.label}
          </span>
        </div>

        {/* Status transition buttons */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-2">
            {nextStatuses.map((ns) => {
              const nsi = CLAIM_STATUS[ns] || { label: ns };
              return (
                <form key={ns} action={async () => {
                  "use server";
                  await updateClaimStatus(id, ns);
                }}>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Mark as {nsi.label}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Billed</p>
                <p className="text-xl font-bold text-gray-900 mt-1">${Number(claim.amountBilled).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Allowed</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {claim.amountAllowed ? `$${Number(claim.amountAllowed).toFixed(2)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Paid</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {claim.amountPaid ? `$${Number(claim.amountPaid).toFixed(2)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Copay</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {claim.patientCopay ? `$${Number(claim.patientCopay).toFixed(2)}` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Prescription / Fill Details */}
          {fill && rx && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Prescription Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Drug</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{drugName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Rx Number</p>
                  <Link href={`/prescriptions/${rx.rxNumber}`} className="text-sm font-mono text-[#40721D] hover:underline mt-1 inline-block">
                    {rx.rxNumber}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Fill #</p>
                  <p className="text-sm text-gray-900 mt-1">{fill.fillNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Prescriber</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {rx.prescriber ? `Dr. ${rx.prescriber.firstName} ${rx.prescriber.lastName}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Info with Code Lookup */}
          {claim.status === "rejected" && claim.rejectionCodes && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-3">Rejection Details</h2>
              <div className="space-y-3">
                {(Array.isArray(claim.rejectionCodes) ? claim.rejectionCodes : [claim.rejectionCodes]).map((code: any, i: number) => {
                  const codeStr = String(code);
                  const ncpdpDesc = lookupRejectionCode(codeStr);
                  const customMsg = claim.rejectionMessages
                    ? Array.isArray(claim.rejectionMessages)
                      ? String(claim.rejectionMessages[i] || "")
                      : String(claim.rejectionMessages)
                    : "";
                  return (
                    <div key={i} className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-mono text-red-700 bg-red-100 px-2 py-0.5 rounded shrink-0">
                          Code {codeStr}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-red-800">{ncpdpDesc}</p>
                          {customMsg && customMsg !== ncpdpDesc && (
                            <p className="text-xs text-red-600 mt-1">{customMsg}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status History / Audit Trail */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
            {statusHistory.length > 0 ? (
              <div className="space-y-3">
                {statusHistory.map((log) => {
                  const toSi = CLAIM_STATUS[log.toStatus] || { label: log.toStatus, color: "bg-gray-100 text-gray-600 border-gray-300" };
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#40721D] mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {log.fromStatus && (
                            <>
                              <span className="text-xs text-gray-500 uppercase">{log.fromStatus}</span>
                              <span className="text-gray-400">→</span>
                            </>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${toSi.color}`}>
                            {toSi.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{formatDate(log.changedAt)}</span>
                          {log.changer && (
                            <span className="text-xs text-gray-400">
                              by {log.changer.firstName} {log.changer.lastName}
                            </span>
                          )}
                        </div>
                        {log.reason && (
                          <p className="text-xs text-gray-600 mt-1">{log.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback to simple timeline if no status logs yet */
              <div className="space-y-3">
                <TimelineItem label="Created" date={claim.createdAt} />
                {claim.submittedAt && <TimelineItem label="Submitted" date={claim.submittedAt} />}
                {claim.adjudicatedAt && <TimelineItem label="Adjudicated" date={claim.adjudicatedAt} />}
                {claim.paidAt && <TimelineItem label="Paid" date={claim.paidAt} />}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Card */}
          {patient && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Patient</h3>
              <Link href={`/patients/${patient.id}`} className="text-lg font-medium text-[#40721D] hover:underline">
                {patient.lastName}, {patient.firstName}
              </Link>
              <p className="text-sm text-gray-500 font-mono mt-1">{patient.mrn}</p>
            </div>
          )}

          {/* Insurance Card */}
          {plan && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Insurance</h3>
              <p className="text-sm font-medium text-gray-900">{plan.planName}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {plan.bin && <p>BIN: <span className="font-mono">{plan.bin}</span></p>}
                {plan.pcn && <p>PCN: <span className="font-mono">{plan.pcn}</span></p>}
                {plan.helpDeskPhone && <p>Help Desk: <span className="font-mono">{plan.helpDeskPhone}</span></p>}
              </div>
              {claim.insurance?.memberId && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Member ID</p>
                  <p className="text-sm font-mono text-gray-900 mt-1">{claim.insurance.memberId}</p>
                  {claim.insurance.groupNumber && (
                    <>
                      <p className="text-xs text-gray-400 uppercase font-semibold mt-2">Group</p>
                      <p className="text-sm font-mono text-gray-900 mt-1">{claim.insurance.groupNumber}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Claim Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Claim ID</span>
                <span className="font-mono text-gray-900">{id.slice(0, 8)}</span>
              </div>
              {claim.claimNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Claim #</span>
                  <span className="font-mono text-gray-900">{claim.claimNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{formatDate(claim.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: Date | string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[#40721D]" />
      <span className="text-sm font-medium text-gray-900 w-24">{label}</span>
      <span className="text-sm text-gray-500">{formatDate(date)}</span>
    </div>
  );
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PermissionGuard resource="billing" action="read">
      <ClaimDetailContent params={params} />
    </PermissionGuard>
  );
}
