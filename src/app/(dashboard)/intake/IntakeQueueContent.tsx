import Link from "next/link";
import { getIntakeQueue, getIntakeStats, getIntakeStatsBySource } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#fefce8", color: "#a16207" },
  matched: { label: "Matched", bg: "#eff6ff", color: "#1d4ed8" },
  processing: { label: "Processing", bg: "#faf5ff", color: "#7e22ce" },
  complete: { label: "Complete", bg: "var(--green-100)", color: "var(--green-700)" },
  error: { label: "Error", bg: "#fef2f2", color: "#b91c1c" },
};

const PRIORITY_CONFIG: Record<string, { label: string; badgeBg: string; badgeColor: string; badgeBorder: string }> = {
  stat: { label: "STAT", badgeBg: "#fee2e2", badgeColor: "#991b1b", badgeBorder: "#fca5a5" },
  urgent: { label: "Urgent", badgeBg: "#ffedd5", badgeColor: "#9a3412", badgeBorder: "#fdba74" },
  normal: { label: "Normal", badgeBg: "rgba(0,0,0,0.05)", badgeColor: "#6b7280", badgeBorder: "var(--border)" },
};

const SOURCE_CONFIG: Record<string, { label: string }> = {
  prescriber_portal: { label: "Prescriber Portal" },
  walk_in: { label: "Walk-in" },
  phone: { label: "Phone/Fax" },
  fax: { label: "Fax" },
  erx: { label: "eRx (SureScripts)" },
  surescripts: { label: "eRx (SureScripts)" },
  patient_portal: { label: "Patient Portal" },
  ncpdp: { label: "NCPDP" },
  epcs: { label: "EPCS" },
  manual: { label: "Manual" },
  fhir: { label: "FHIR" },
};

const SOURCE_FILTERS = [
  { value: "all", label: "All Sources" },
  { value: "prescriber_portal", label: "Prescriber Portal" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone/Fax" },
  { value: "erx", label: "eRx" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "processing", label: "Processing" },
  { value: "complete", label: "Complete" },
  { value: "error", label: "Error" },
];

const SORT_OPTIONS = [
  { value: "received", label: "Newest" },
  { value: "priority", label: "Priority" },
  { value: "patient", label: "Patient" },
];

export default async function IntakeQueueContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string; source?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";
  const source = params.source || "all";
  const sort = params.sort || "received";

  const [{ items, total, pages }, stats] = await Promise.all([
    getIntakeQueue({ search, status, source, page, sort }),
    getIntakeStats(),
    getIntakeStatsBySource(),
  ]);

  const buildHref = (overrides: { source?: string; status?: string; sort?: string }) => {
    const src = overrides.source ?? source;
    const st = overrides.status ?? status;
    const sr = overrides.sort ?? sort;
    const parts: string[] = [];
    if (src !== "all") parts.push(`source=${src}`);
    if (st !== "all") parts.push(`status=${st}`);
    if (sr !== "received") parts.push(`sort=${sr}`);
    if (search) parts.push(`search=${search}`);
    return `/intake${parts.length ? `?${parts.join("&")}` : ""}`;
  };

  return (
    <PageShell
      title="eRx Intake Queue"
      subtitle={`${total.toLocaleString()} prescription${total === 1 ? "" : "s"} waiting for intake`}
      stats={
        <StatsRow
          stats={[
            { label: "Pending", value: stats.pending, accent: "#eab308" },
            { label: "Matched", value: stats.matched, accent: "#3b82f6" },
            { label: "Processing", value: stats.processing, accent: "#a855f7" },
            { label: "Complete", value: stats.complete, accent: "var(--color-primary)" },
            { label: "Errors", value: stats.error, accent: stats.error > 0 ? "#ef4444" : undefined },
          ]}
        />
      }
      toolbar={
        <FilterBar
          search={
            <Suspense fallback={null}>
              <SearchBar
                placeholder="Search by patient, prescriber, or medication..."
                basePath="/intake"
              />
            </Suspense>
          }
          filters={
            <>
              {SOURCE_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={buildHref({ source: f.value })}
                  className="px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: source === f.value ? "var(--color-primary)" : "transparent",
                    color: source === f.value ? "#fff" : "var(--text-secondary)",
                    borderColor: source === f.value ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {f.label}
                </Link>
              ))}
              <span className="w-px h-5 mx-1" style={{ backgroundColor: "var(--border)" }} />
              {STATUS_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={buildHref({ status: f.value })}
                  className="px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: status === f.value ? "var(--color-primary)" : "transparent",
                    color: status === f.value ? "#fff" : "var(--text-secondary)",
                    borderColor: status === f.value ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {f.label}
                </Link>
              ))}
            </>
          }
          right={
            <>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Sort
              </span>
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildHref({ sort: opt.value })}
                  className="px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: sort === opt.value ? "var(--color-primary)" : "transparent",
                    color: sort === opt.value ? "#fff" : "var(--text-secondary)",
                    borderColor: sort === opt.value ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {opt.label}
                </Link>
              ))}
            </>
          }
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "var(--text-muted)" }}>
              {search ? "No intake items match your search" : "No intake items in queue"}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)", opacity: 0.75 }}>
              E-prescriptions will appear here as they are received.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Received</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Prescriber</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Medication</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const statusConfig = STATUS_CONFIG[item.status] || { label: item.status, bg: "rgba(0,0,0,0.05)", color: "#6b7280" };
                  const priorityConfig = PRIORITY_CONFIG[item.priority || "normal"] || PRIORITY_CONFIG.normal;
                  const sourceConfig = SOURCE_CONFIG[item.source] || { label: item.source };

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/intake/${item.id}`}
                          className="text-sm font-mono font-semibold hover:underline"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {formatDate(item.receivedAt)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {sourceConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {item.patientName || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.prescriberName || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.drugName || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border"
                          style={{
                            backgroundColor: priorityConfig.badgeBg,
                            color: priorityConfig.badgeColor,
                            borderColor: priorityConfig.badgeBorder,
                          }}
                        >
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {item.assignee
                            ? `${item.assignee.firstName} ${item.assignee.lastName}`
                            : "—"}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/intake" />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
