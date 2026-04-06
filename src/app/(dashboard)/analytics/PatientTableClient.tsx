"use client";

import DataTable, { type Column } from "./components/DataTable";

type PatientRow = {
  name: string;
  rxCount: number;
};

const columns: Column<PatientRow>[] = [
  {
    key: "rank",
    header: "#",
    width: "40px",
    sortable: false,
    render: (_row, i) => (
      <span style={{
        width: "22px",
        height: "22px",
        borderRadius: "6px",
        backgroundColor: i < 3 ? "var(--green-700, #40721D)" : "var(--card-bg, #F5F0E8)",
        color: i < 3 ? "#fff" : "var(--text-secondary, #5C4F3C)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 700,
      }}>
        {i + 1}
      </span>
    ),
  },
  {
    key: "name",
    header: "Patient Name",
    render: (row) => (
      <span style={{ fontWeight: 500 }}>{row.name}</span>
    ),
  },
  {
    key: "rxCount",
    header: "Rx Count",
    align: "right",
  },
];

export default function PatientTable({ data }: { data: PatientRow[] }) {
  return (
    <DataTable
      columns={columns as Column<Record<string, unknown>>[]}
      data={data as unknown as Record<string, unknown>[]}
      emptyMessage="No patient data available for this period"
    />
  );
}
