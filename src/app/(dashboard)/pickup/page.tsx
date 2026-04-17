import Link from "next/link";
import { getReadyForPickup } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";

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
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Rx #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Drug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <p className="text-gray-500">
                    No prescriptions ready for pickup
                  </p>
                </td>
              </tr>
            ) : (
              fills.map((fill) => (
                <tr
                  key={fill.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">
                      {fill.prescription.patient.firstName}{" "}
                      {fill.prescription.patient.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      MRN: {fill.prescription.patient.mrn}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">
                    {fill.prescription.rxNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {fill.prescription.item?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {fill.quantity.toString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        fill.status === "ready"
                          ? "bg-green-100 text-green-700"
                          : fill.status === "verified"
                            ? "bg-teal-100 text-teal-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {fill.status === "ready"
                        ? "Ready"
                        : fill.status === "verified"
                          ? "Verified"
                          : "Completed"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/pickup/${fill.id}`}
                      className="px-3 py-1 bg-[#40721D] text-white text-xs rounded-lg hover:bg-[#2D5114] transition-colors"
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
