import Link from "next/link";
import { getPickupHistory } from "../actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";

async function PickupHistoryContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const { fills, total, pages } = await getPickupHistory(search, page);

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pickup History</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} completed pickups
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <Suspense fallback={null}>
          <SearchBar
            placeholder="Search by patient name, Rx#..."
            basePath="/pickup/history"
          />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                Pickup Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Picked Up By
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
                    No pickup records found
                  </p>
                </td>
              </tr>
            ) : (
              fills.map((fill) => {
                const pickupRecord = (fill.metadata as any)?.pickupRecord;
                const pickedUpBy = pickupRecord?.pickupPerson
                  ? pickupRecord.pickupPerson.name
                  : fill.prescription.patient.firstName +
                    " " +
                    fill.prescription.patient.lastName;

                return (
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(fill.dispensedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {pickedUpBy}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {pickupRecord?.signatureBase64 && (
                        <button
                          onClick={() => {
                            // View signature
                            const img = new Image();
                            img.src = pickupRecord.signatureBase64;
                            const win = window.open();
                            if (win) {
                              win.document.write(
                                "<img src='" +
                                  pickupRecord.signatureBase64 +
                                  "' style='max-width:100%;'>"
                              );
                            }
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          View Signature
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
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
            basePath="/pickup/history"
          />
        </div>
      )}
    </div>
  );
}

export default async function PickupHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  return <PickupHistoryContent searchParams={searchParams} />;
}
