import Link from "next/link";
import { Plus } from "lucide-react";
import { getFormulas, getBatches } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatPatientName, toTitleCase } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

// BNDS PMS Redesign — heritage status palette
const BATCH_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  in_progress: { label: "In Progress", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  completed: { label: "Completed", bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
  verified: { label: "Verified", bg: "rgba(90,168,69,0.14)", color: "#2d6a1f" },
  failed: { label: "Failed QA", bg: "rgba(184,58,47,0.10)", color: "#9a2c1f" },
  quarantined: { label: "Quarantined", bg: "rgba(212,138,40,0.18)", color: "#8a5a17" },
};

async function CompoundingPageContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "formulas";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";

  return (
    <PageShell
      eyebrow="Pharmacy"
      title="Compounding"
      subtitle="Formulas, batches, and quality assurance"
      actions={
        <>
          <Link
            href="/compounding/formulas/new"
            className="inline-flex items-center gap-1.5 rounded-md font-medium no-underline transition-colors"
            style={{
              border: "1px solid #d9d2c2",
              color: "#3a4a3c",
              backgroundColor: "#ffffff",
              padding: "7px 13px",
              fontSize: 13,
            }}
          >
            <Plus size={14} strokeWidth={2} /> New Formula
          </Link>
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
        </>
      }
      toolbar={
        <FilterBar
          filters={
            <>
              {[
                { id: "formulas", label: "Formulas" },
                { id: "batches", label: "Batches" },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <Link
                    key={t.id}
                    href={`/compounding?tab=${t.id}`}
                    className="inline-flex items-center font-medium rounded-md no-underline transition-colors"
                    style={{
                      backgroundColor: active ? "#1f5a3a" : "#ffffff",
                      color: active ? "#ffffff" : "#3a4a3c",
                      border: active ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
                      padding: "5px 13px",
                      fontSize: 12,
                    }}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </>
          }
        />
      }
    >
      {tab === "formulas" ? (
        <FormulasTab search={search} page={page} />
      ) : (
        <BatchesTab search={search} page={page} status={status} />
      )}
    </PageShell>
  );
}

async function FormulasTab({ search, page }: { search: string; page: number }) {
  const { formulas, total, pages } = await getFormulas({ search, page });

  return (
    <>
      <div
        className="rounded-lg p-4 mb-4"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <Suspense fallback={null}>
          <SearchBar placeholder="Search formulas by name or code..." basePath="/compounding?tab=formulas" />
        </Suspense>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {formulas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>No formulas yet</p>
            <Link
              href="/compounding/formulas/new"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#1f5a3a" }}
            >
              Create your first formula
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Code</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Formula Name</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Category</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Dosage Form</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Version</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Ingredients</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Rxs</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Sterile</th>
                </tr>
              </thead>
              <tbody>
                {formulas.map((f, idx) => {
                  const currentVersion = f.versions[0];
                  const ingredientCount = currentVersion?.ingredients.length || 0;

                  return (
                    <tr key={f.id} style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/compounding/formulas/${f.id}`}
                          className="hover:underline"
                          style={{
                            color: "#1f5a3a",
                            fontWeight: 600,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 13,
                          }}
                        >
                          {f.formulaCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3" style={{ color: "#0f2e1f", fontWeight: 500 }}>{f.name}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{f.category || "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{f.dosageForm || "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                        {currentVersion ? `v${currentVersion.versionNumber}` : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{ingredientCount}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{f._count.prescriptions}</td>
                      <td className="px-4 py-3">
                        {f.isSterile ? (
                          <span
                            className="inline-flex items-center"
                            style={{
                              backgroundColor: "rgba(120,80,160,0.12)",
                              color: "#5e3d8a",
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            Sterile
                          </span>
                        ) : (
                          <span style={{ color: "#7a8a78", fontSize: 12 }}>Non-sterile</span>
                        )}
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
            <Pagination total={total} pages={pages} page={page} basePath="/compounding?tab=formulas" />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function BatchesTab({ search, page, status }: { search: string; page: number; status: string }) {
  const { batches, total, pages } = await getBatches({ search, status, page });

  return (
    <>
      <div
        className="rounded-lg p-4 mb-4"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <div className="mb-3">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search by batch number..." basePath="/compounding?tab=batches" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "in_progress", "completed", "verified", "failed"].map((s) => {
            const active = status === s;
            return (
              <Link
                key={s}
                href={`/compounding?tab=batches&status=${s}${search ? `&search=${search}` : ""}`}
                className="inline-flex items-center font-medium rounded-md no-underline transition-colors"
                style={{
                  backgroundColor: active ? "#1f5a3a" : "#ffffff",
                  color: active ? "#ffffff" : "#3a4a3c",
                  border: active ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
                  padding: "5px 11px",
                  fontSize: 12,
                }}
              >
                {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {batches.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>No batches yet</p>
            <Link
              href="/compounding/batches/new"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#1f5a3a" }}
            >
              Compound your first batch
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Batch #</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Formula</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Rx / Patient</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Qty</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>BUD</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Compounder</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>QA</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, idx) => {
                  const statusInfo = BATCH_STATUS[b.status] || { label: b.status, bg: "rgba(122,138,120,0.14)", color: "#5a6b58" };

                  return (
                    <tr key={b.id} style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/compounding/batches/${b.id}`}
                          className="hover:underline"
                          style={{
                            color: "#1f5a3a",
                            fontWeight: 600,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 13,
                          }}
                        >
                          {b.batchNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#0f2e1f", fontWeight: 500 }}>{b.formulaVersion.formula.name}</p>
                        <p style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{b.formulaVersion.formula.formulaCode}</p>
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                        {b.prescription ? (
                          <>Rx# {b.prescription.rxNumber} — {toTitleCase(b.prescription.patient.lastName)}</>
                        ) : (
                          <span style={{ color: "#7a8a78" }}>Stock batch</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                        {b.quantityPrepared.toString()} {b.unit}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{formatDate(b.budDate)}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                        {formatPatientName({ firstName: b.compounder.firstName, lastName: b.compounder.lastName })}
                      </td>
                      <td className="px-4 py-3">
                        {b._count.qa > 0 ? (
                          <span style={{ color: "#5a6b58", fontSize: 12 }}>{b._count.qa} check{b._count.qa !== 1 ? "s" : ""}</span>
                        ) : (
                          <span style={{ color: "#7a8a78", fontSize: 12 }}>None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                          }}
                        >
                          {statusInfo.label}
                        </span>
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
            <Pagination total={total} pages={pages} page={page} basePath="/compounding?tab=batches" />
          </Suspense>
        </div>
      </div>
    </>
  );
}
export default function CompoundingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string; status?: string }>;
}) {
  return (
    <PermissionGuard resource="compounding" action="read">
      <CompoundingPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
