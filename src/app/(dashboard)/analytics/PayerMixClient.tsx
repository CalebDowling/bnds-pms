"use client";

import DataTable, { type Column } from "./components/DataTable";

type PayerMixEntry = {
  planName: string;
  fillCount: number;
  revenue: number;
  percentage: number;
};

const columns: Column<PayerMixEntry>[] = [
  {
    key: "planName",
    header: "Plan Name",
    render: (row) => (
      <span style={{ fontWeight: 500 }}>{row.planName}</span>
    ),
  },
  {
    key: "fillCount",
    header: "Fill Count",
    align: "right",
  },
  {
    key: "revenue",
    header: "Revenue",
    align: "right",
    render: (row) => `$${row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  },
  {
    key: "percentage",
    header: "% of Total",
    align: "right",
    render: (row) => (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
        <div style={{ width: "60px", height: "6px", borderRadius: "3px", backgroundColor: "var(--border, #D4C9B8)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(row.percentage, 100)}%`,
              borderRadius: "3px",
              backgroundColor: "var(--green-700, #40721D)",
            }}
          />
        </div>
        <span>{row.percentage}%</span>
      </div>
    ),
  },
];

export default function PayerMixTable({ data }: { data: PayerMixEntry[] }) {
  return (
    <DataTable
      columns={columns as Column<Record<string, unknown>>[]}
      data={data as unknown as Record<string, unknown>[]}
      emptyMessage="No payer mix data available for this period"
    />
  );
}
