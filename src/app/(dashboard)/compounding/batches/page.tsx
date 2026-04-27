import Link from "next/link";
import { Plus, FlaskConical, Clock, CheckCircle2, ShieldCheck, PackageCheck } from "lucide-react";
import { getBatches } from "@/app/(dashboard)/compounding/actions";
import { formatDate } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";

// BNDS PMS Redesign — heritage status palette (forest+leaf+amber+burgundy)
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  in_progress: { label: "In Progress", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  completed: { label: "Completed", bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
  verified: { label: "Verified", bg: "rgba(90,168,69,0.14)", color: "#2d6a1f" },
  released: { label: "Released", bg: "rgba(31,90,58,0.14)", color: "#1f5a3a" },
  failed: { label: "Failed", bg: "rgba(184,58,47,0.10)", color: "#9a2c1f" },
};

async function BatchListContent() {
  const batches = await getBatches({ limit: 100 });
  const batchList = batches.batches || [];

  const inProgressCount = batchList.filter((b: any) => b.status === "in_progress").length;
  const completedCount = batchList.filter((b: any) => b.status === "completed").length;
  const verifiedCount = batchList.filter((b: any) => b.status === "verified").length;
  const releasedCount = batchList.filter((b: any) => b.status === "released").length;

  return (
    <PageShell
      eyebrow="Pharmacy"
      title="Batch Records"
      subtitle="Compounding batch log and quality assurance · USP 795/797"
      actions={
        <Link
          href="/compounding/batches/new"
          className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
          style={{
            backgroundColor: "#1f5a3a",
            color: "#ffffff",
            border: "1px solid #1f5a3a",
            padding: "7px 13px",
            fontSize: 13,
          }}
        >
          <Plus size={14} strokeWidth={2} /> New Batch
        </Link>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Total", value: batches.total || 0, icon: <FlaskConical size={12} /> },
            { label: "In Progress", value: inProgressCount, icon: <Clock size={12} />, accent: inProgressCount > 0 ? "#d48a28" : undefined },
            { label: "Completed", value: completedCount, icon: <CheckCircle2 size={12} />, accent: "#386d8c" },
            { label: "Verified", value: verifiedCount, icon: <ShieldCheck size={12} />, accent: "#5aa845" },
            { label: "Released", value: releasedCount, icon: <PackageCheck size={12} />, accent: "#1f5a3a" },
          ]}
        />
      }
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {batchList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Batch #</th>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Formula</th>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Quantity</th>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Created</th>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Compounder</th>
                  <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Verifier</th>
                </tr>
              </thead>
              <tbody>
                {batchList.map((batch: any, idx: number) => {
                  const statusConfig =
                    STATUS_CONFIG[batch.status] || {
                      label: batch.status,
                      bg: "rgba(122,138,120,0.14)",
                      color: "#5a6b58",
                    };

                  return (
                    <tr
                      key={batch.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/compounding/batches/${batch.id}`}
                          className="hover:underline no-underline"
                          style={{
                            color: "#1f5a3a",
                            fontWeight: 600,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 13,
                          }}
                        >
                          {batch.batchNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <p style={{ color: "#0f2e1f", fontWeight: 500 }}>
                          {batch.formulaVersion.formula.name}
                        </p>
                        <p style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                          {batch.formulaVersion.formula.formulaCode}
                        </p>
                      </td>
                      <td className="px-6 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>
                        {Number(batch.quantityPrepared)} {batch.unit}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: statusConfig.bg,
                            color: statusConfig.color,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-3" style={{ color: "#3a4a3c" }}>
                        {formatDate(batch.createdAt)}
                      </td>
                      <td className="px-6 py-3" style={{ color: "#3a4a3c" }}>
                        {formatPatientName({ firstName: batch.compounder.firstName, lastName: batch.compounder.lastName })}
                      </td>
                      <td className="px-6 py-3" style={{ color: "#3a4a3c" }}>
                        {batch.verifier
                          ? formatPatientName({ firstName: batch.verifier.firstName, lastName: batch.verifier.lastName })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="mb-4" style={{ color: "#7a8a78" }}>No batch records found</p>
            <Link
              href="/compounding/batches/new"
              className="text-sm font-semibold hover:underline no-underline"
              style={{ color: "#1f5a3a" }}
            >
              Create the first batch →
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function BatchListPage() {
  return (
    <PermissionGuard resource="compounding" action="read">
      <BatchListContent />
    </PermissionGuard>
  );
}
