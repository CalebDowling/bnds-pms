"use client";

import DataTable, { type Column } from "./components/DataTable";

type TopDrug = {
  name: string;
  ndc: string;
  fillCount: number;
  revenue: number;
  percentOfTotal: number;
};

const columns: Column<TopDrug>[] = [
  {
    key: "name",
    header: "Drug Name",
    render: (row) => (
      <span style={{ fontWeight: 500 }}>{row.name}</span>
    ),
  },
  {
    key: "ndc",
    header: "NDC",
    render: (row) => (
      <span style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--text-secondary, #5C4F3C)" }}>
        {row.ndc}
      </span>
    ),
  },
  {
    key: "fillCount",
    header: "Fills",
    align: "right",
  },
  {
    key: "revenue",
    header: "Revenue",
    align: "right",
    render: (row) => `$${row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  },
  {
    key: "percentOfTotal",
    header: "% of Total",
    align: "right",
    render: (row) => (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
        <div style={{ width: "60px", height: "6px", borderRadius: "3px", backgroundColor: "var(--border, #D4C9B8)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(row.percentOfTotal, 100)}%`,
              borderRadius: "3px",
              backgroundColor: "var(--green-700, #40721D)",
            }}
          />
        </div>
        <span>{row.percentOfTotal}%</span>
      </div>
    ),
  },
];

export default function TopDrugsTable({ data }: { data: TopDrug[] }) {
  return (
    <DataTable
      columns={columns as Column<Record<string, unknown>>[]}
      data={data as unknown as Record<string, unknown>[]}
      emptyMessage="No drug dispensing data available for this period"
    />
  );
}
