import Link from "next/link";
import { Plus, FlaskConical, Clock, CheckCircle2, ShieldCheck, PackageCheck } from "lucide-react";
import { getBatches } from "@/app/(dashboard)/compounding/actions";
import { formatDate } from "@/lib/utils";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  in_progress: { label: "In Progress", bg: "#fefce8", color: "#a16207" },
  completed: { label: "Completed", bg: "#eff6ff", color: "#1d4ed8" },
  verified: { label: "Verified", bg: "var(--green-100)", color: "var(--green-700)" },
  released: { label: "Released", bg: "#ecfdf5", color: "#047857" },
  failed: { label: "Failed", bg: "#fef2f2", color: "#b91c1c" },
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
      title="Batch Records"
      subtitle="Compounding batch log and quality assurance"
      actions={
        <Link
          href="/compounding/batches/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={14} /> New Batch
        </Link>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Total", value: batches.total || 0, icon: <FlaskConical size={12} /> },
            { label: "In Progress", value: inProgressCount, icon: <Clock size={12} />, accent: inProgressCount > 0 ? "#eab308" : undefined },
            { label: "Completed", value: completedCount, icon: <CheckCircle2 size={12} />, accent: "#3b82f6" },
            { label: "Verified", value: verifiedCount, icon: <ShieldCheck size={12} />, accent: "var(--color-primary)" },
            { label: "Released", value: releasedCount, icon: <PackageCheck size={12} />, accent: "#10b981" },
          ]}
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        {batchList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Batch #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Formula</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Quantity</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Created</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Compounder</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Verifier</th>
                </tr>
              </thead>
              <tbody>
                {batchList.map((batch: any, idx: number) => {
                  const statusConfig =
                    STATUS_CONFIG[batch.status] || {
                      label: batch.status,
                      bg: "rgba(0,0,0,0.05)",
                      color: "#6b7280",
                    };

                  return (
                    <tr
                      key={batch.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/compounding/batches/${batch.id}`}
                          className="font-mono text-sm font-semibold hover:underline no-underline"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {batch.batchNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {batch.formulaVersion.formula.name}
                        </p>
                        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          {batch.formulaVersion.formula.formulaCode}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {Number(batch.quantityPrepared)} {batch.unit}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {formatDate(batch.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {batch.compounder.firstName} {batch.compounder.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {batch.verifier
                          ? `${batch.verifier.firstName} ${batch.verifier.lastName}`
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
            <p className="mb-4" style={{ color: "var(--text-muted)" }}>No batch records found</p>
            <Link
              href="/compounding/batches/new"
              className="text-sm font-semibold hover:underline no-underline"
              style={{ color: "var(--color-primary)" }}
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
