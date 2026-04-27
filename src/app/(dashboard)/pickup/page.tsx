import Link from "next/link";
import { getReadyForPickup } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";
import { formatPatientName, formatDrugName } from "@/lib/utils/formatters";

async function PickupQueueContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const { fills, total, pages } = await getReadyForPickup(search, page);

  return (
    <PageShell
      eyebrow="Operations"
      title="Patient Pickup"
      subtitle={`${total.toLocaleString()} prescription${total === 1 ? "" : "s"} ready for pickup`}
      toolbar={
        <FilterBar
          search={
            <Suspense fallback={null}>
              <SearchBar
                placeholder="Search by patient name, Rx#, or MRN..."
                basePath="/pickup"
              />
            </Suspense>
          }
        />
      }
    >
      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead style={{ backgroundColor: "#f4ede0", borderBottom: "1px solid #e3ddd1" }}>
            <tr>
              <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
              <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Rx #</th>
              <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Drug</th>
              <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Qty</th>
              <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
              <th className="text-left px-6 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {fills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <p style={{ color: "#7a8a78" }}>
                    No prescriptions ready for pickup
                  </p>
                </td>
              </tr>
            ) : (
              fills.map((fill, idx) => (
                <tr
                  key={fill.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                >
                  <td className="px-6 py-3">
                    <div style={{ color: "#0f2e1f", fontWeight: 500 }}>
                      {formatPatientName({
                        firstName: fill.prescription.patient.firstName,
                        lastName: fill.prescription.patient.lastName,
                      })}
                    </div>
                    <div style={{ color: "#7a8a78", fontSize: 12 }}>
                      MRN: {fill.prescription.patient.mrn}
                    </div>
                  </td>
                  <td className="px-6 py-3" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#1f5a3a", fontWeight: 600 }}>
                    {fill.prescription.rxNumber}
                  </td>
                  <td className="px-6 py-3" style={{ color: "#3a4a3c" }}>
                    {fill.prescription.item?.name ? formatDrugName(fill.prescription.item.name) : "N/A"}
                  </td>
                  <td className="px-6 py-3" style={{ color: "#3a4a3c" }}>
                    {fill.quantity.toString()}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className="inline-flex items-center"
                      style={{
                        backgroundColor:
                          fill.status === "ready"
                            ? "rgba(90,168,69,0.14)"
                            : fill.status === "verified"
                            ? "rgba(56,109,140,0.12)"
                            : "rgba(31,90,58,0.12)",
                        color:
                          fill.status === "ready"
                            ? "#2d6a1f"
                            : fill.status === "verified"
                            ? "#2c5e7a"
                            : "#1f5a3a",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {fill.status === "ready"
                        ? "Ready"
                        : fill.status === "verified"
                        ? "Verified"
                        : "Completed"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/pickup/${fill.id}`}
                      className="inline-flex items-center rounded-md font-semibold no-underline transition-colors"
                      style={{
                        backgroundColor: "#1f5a3a",
                        color: "#ffffff",
                        border: "1px solid #1f5a3a",
                        padding: "5px 11px",
                        fontSize: 12,
                      }}
                    >
                      Process
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            pages={pages}
            total={total}
            basePath="/pickup"
          />
        </div>
      )}
    </PageShell>
  );
}

export default async function PickupPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  return <PickupQueueContent searchParams={searchParams} />;
}
