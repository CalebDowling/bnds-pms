"use client";

import { useState, useEffect } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  patientName: string;
  medication: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
}

interface BillingData {
  totalBilledYTD: number;
  outstandingBalance: number;
  lastPaymentDate: string;
  invoices: Invoice[];
}

export default function BillingPage(): React.ReactNode {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchBilling();
  }, []);

  useEffect(() => {
    if (!billing) return;

    let filtered = billing.invoices;

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(
        (inv) => new Date(inv.date) >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(
        (inv) => new Date(inv.date) <= end
      );
    }

    setFilteredInvoices(filtered);
  }, [startDate, endDate, billing]);

  const fetchBilling = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch("/api/prescriber-portal/billing");
      if (!response.ok) throw new Error("Failed to fetch billing");
      const data = await response.json();
      setBilling(data);
      setFilteredInvoices(data.invoices || []);
    } catch (err) {
      setError("Error loading billing information. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePayNow = (invoiceId: string) => {
    // Placeholder for payment flow
    console.log("Pay invoice:", invoiceId);
    alert("Payment flow would be implemented here");
  };

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: fadeUp 0.3s ease-out 0.05s both; }
        .stagger-2 { animation: fadeUp 0.3s ease-out 0.1s both; }
        .stagger-3 { animation: fadeUp 0.3s ease-out 0.15s both; }
        .stagger-4 { animation: fadeUp 0.3s ease-out 0.2s both; }
        .stagger-5 { animation: fadeUp 0.3s ease-out 0.25s both; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 stagger-1">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">Billing & Payments</h1>
          <p className="text-[13px] text-gray-600 mt-1">
            Invoice history and payment management
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl stagger-2">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {billing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 stagger-2">
          {/* Total Billed YTD */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-[12px] uppercase tracking-wider font-medium text-gray-600 mb-2">
              Total Billed (YTD)
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              ${billing.totalBilledYTD.toFixed(2)}
            </p>
            <div className="mt-3 h-1 bg-[#40721D] rounded-full w-8"></div>
          </div>

          {/* Outstanding Balance */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-[12px] uppercase tracking-wider font-medium text-gray-600 mb-2">
              Outstanding Balance
            </p>
            <p className="text-2xl font-semibold text-red-600">
              ${billing.outstandingBalance.toFixed(2)}
            </p>
            <div className="mt-3 h-1 bg-red-500 rounded-full w-8"></div>
          </div>

          {/* Last Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-[12px] uppercase tracking-wider font-medium text-gray-600 mb-2">
              Last Payment
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {billing.lastPaymentDate
                ? new Date(billing.lastPaymentDate).toLocaleDateString()
                : "No payments yet"}
            </p>
            <div className="mt-3 h-1 bg-emerald-500 rounded-full w-8"></div>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 stagger-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden stagger-4">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-[13px]">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-[13px]">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Medication
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#f8faf6] transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {invoice.patientName}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {invoice.medication}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 border text-[11px] font-semibold rounded-lg ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {invoice.status === "Pending" ||
                      invoice.status === "Overdue" ? (
                        <button
                          onClick={() => handlePayNow(invoice.id)}
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-[#40721D] text-white hover:bg-[#355f1a] active:scale-[0.98] transition-all shadow-sm"
                        >
                          Pay Now
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl stagger-5">
          <p className="text-[13px] text-blue-700">
            Showing {filteredInvoices.length} invoice
            {filteredInvoices.length !== 1 ? "s" : ""} •{" "}
            <span className="font-semibold">
              Total: $
              {filteredInvoices
                .reduce((sum, inv) => sum + inv.amount, 0)
                .toFixed(2)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
