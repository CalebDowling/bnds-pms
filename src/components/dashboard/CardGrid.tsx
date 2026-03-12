"use client";

import Link from "next/link";

export interface DashboardData {
  patientsToday: number;
  rxToday: number;
  activeItems: number;
  doctorsOnFile: number;
  pendingBatches: number;
  lowStockItems: number;
  salesToday: number;
  rejectedClaims: number;
}

interface CardConfig {
  id: string;
  title: string;
  accentColor: string;
  iconBg: string;
  iconText: string;
  badgeLabel: string;
  badgeColor: string;
  badgeAlert?: boolean;
  primaryAction?: { href: string; label: string };
  secondaryActions: { href: string; label: string; icon: React.ReactNode }[];
}

export default function CardGrid({ data }: { data: DashboardData }) {

  const PatientIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );

  const RxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
  );

  const ItemIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M9 2h6"/><line x1="6" y1="6" x2="18" y2="6"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="15" y1="10" x2="15" y2="14"/></svg>
  );

  const DoctorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 0 12 0A6 6 0 0 0 6 8z"/><line x1="12" y1="5" x2="12" y2="11"/><line x1="9" y1="8" x2="15" y2="8"/></svg>
  );

  const CompoundIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m16-6h-4a2 2 0 0 1 2 2v4M9 3v4m6-4v4M9 7h6m-6 6h6m-6 4h6"/><rect x="3" y="13" width="18" height="8" rx="2"/></svg>
  );

  const InventoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 12H17a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h1.5M7 4h10v4H7z"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
  );

  const SaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><path d="M8 5h14v2H8z"/></svg>
  );

  const ClaimIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
  );

  const SystemIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24"/></svg>
  );

  const cards: CardConfig[] = [
    {
      id: "patient",
      title: "Patient",
      accentColor: "var(--green-700)",
      iconBg: "bg-[#dcfce7]",
      iconText: "Pa",
      badgeLabel: `+${data.patientsToday} today`,
      badgeColor: "bg-[var(--green-100)] text-[var(--green-700)]",
      primaryAction: { href: "/patients/new", label: "New Patient" },
      secondaryActions: [
        { href: "/patients", label: "Find Patient", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
        { href: "/patients/merge", label: "Merge Records", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><path d="M9 15a6 6 0 0 1 6-6m6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0m0 6a6 6 0 0 0-6-6"/></svg> },
      ],
    },
    {
      id: "prescription",
      title: "Prescription",
      accentColor: "#2563eb",
      iconBg: "bg-[#dbeafe]",
      iconText: "Rx",
      badgeLabel: `+${data.rxToday} today`,
      badgeColor: "bg-[#dbeafe] text-[#2563eb]",
      primaryAction: { href: "/prescriptions/new", label: "New Prescription" },
      secondaryActions: [
        { href: "/prescriptions", label: "Find Prescription", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
        { href: "/prescriptions/sig-codes", label: "Sig Codes", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> },
        { href: "/prescriptions/deliveries", label: "Deliveries", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/><path d="M1 12c0-1 .895-2 2-2h16c1.105 0 2 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-5z"/></svg> },
        { href: "/prescriptions/batch-refills", label: "Batch Refills", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8 10 1 17"/><polyline points="17 6 23 6 23 12"/></svg> },
      ],
    },
    {
      id: "item",
      title: "Item",
      accentColor: "#9333ea",
      iconBg: "bg-[#f3e8ff]",
      iconText: "It",
      badgeLabel: `${data.activeItems} active`,
      badgeColor: "bg-[#f3e8ff] text-[#9333ea]",
      secondaryActions: [
        { href: "/inventory/items", label: "Manage Items", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
        { href: "/inventory/items/find", label: "Find Item", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
        { href: "/inventory/purchase-order", label: "Purchase Order", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
        { href: "/inventory/items/import", label: "Import Items", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
        { href: "/inventory/interaction-checker", label: "Interaction Checker", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24"/></svg> },
        { href: "/inventory/price-quote", label: "Price Quote", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
      ],
    },
    {
      id: "doctor",
      title: "Doctor",
      accentColor: "#0891b2",
      iconBg: "bg-[#cffafe]",
      iconText: "Dr",
      badgeLabel: `${data.doctorsOnFile} on file`,
      badgeColor: "bg-[#cffafe] text-[#0891b2]",
      primaryAction: { href: "/doctors/new", label: "New Prescriber" },
      secondaryActions: [
        { href: "/doctors", label: "Find Prescriber", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
        { href: "/doctors/merge", label: "Merge Records", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><path d="M9 15a6 6 0 0 1 6-6m6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0m0 6a6 6 0 0 0-6-6"/></svg> },
      ],
    },
    {
      id: "compounding",
      title: "Compounding",
      accentColor: "#ea580c",
      iconBg: "bg-[#ffedd5]",
      iconText: "Co",
      badgeLabel: `${data.pendingBatches} pending`,
      badgeColor: "bg-[#ffedd5] text-[#ea580c]",
      primaryAction: { href: "/compounding/batches", label: "Batch Manager" },
      secondaryActions: [
        { href: "/compounding/formulas/new", label: "New Formula", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
        { href: "/compounding/formulas", label: "Find Formula", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      accentColor: "#dc2626",
      iconBg: "bg-[#fee2e2]",
      iconText: "In",
      badgeLabel: `${data.lowStockItems} low stock`,
      badgeColor: "bg-[#fee2e2] text-[#dc2626]",
      badgeAlert: true,
      secondaryActions: [
        { href: "/inventory/manual-count", label: "Manual Inventory", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M9 2h6"/></svg> },
        { href: "/inventory/supplier-feeds", label: "Supplier Data Feeds", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
        { href: "/inventory/fast-count", label: "Fast Count", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8 10 1 17"/><polyline points="17 6 23 6 23 12"/></svg> },
        { href: "/inventory/check-in", label: "Check-In New", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
      ],
    },
    {
      id: "sale",
      title: "Sale",
      accentColor: "#16a34a",
      iconBg: "bg-[#dcfce7]",
      iconText: "Sa",
      badgeLabel: `${data.salesToday} today`,
      badgeColor: "bg-[#dcfce7] text-[#16a34a]",
      primaryAction: { href: "/pos", label: "Point of Sale" },
      secondaryActions: [
        { href: "/sales", label: "Find Sale", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
      ],
    },
    {
      id: "claims",
      title: "Insurance & Claims",
      accentColor: "#9333ea",
      iconBg: "bg-[#f3e8ff]",
      iconText: "Cl",
      badgeLabel: `${data.rejectedClaims} rejects`,
      badgeColor: "bg-[#fee2e2] text-[#dc2626]",
      badgeAlert: true,
      secondaryActions: [
        { href: "/claims", label: "Find Claim", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
        { href: "/claims/overrides", label: "Overrides", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20m10-10H2"/></svg> },
        { href: "/claims/custom-rejects", label: "Custom Rejects", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
      ],
    },
    {
      id: "system",
      title: "System",
      accentColor: "#64748b",
      iconBg: "bg-[#f1f5f9]",
      iconText: "Sy",
      badgeLabel: "Admin",
      badgeColor: "bg-[#f1f5f9] text-[#64748b]",
      secondaryActions: [
        { href: "/admin/employees", label: "Employees", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        { href: "/admin/reports", label: "Reports", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg> },
        { href: "/admin/financial-reports", label: "Financial Reports", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
        { href: "/settings", label: "Settings", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24"/></svg> },
        { href: "/admin/shipping", label: "Shipping", icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/><path d="M1 12c0-1 .895-2 2-2h16c1.105 0 2 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-5z"/></svg> },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-[0_4px_12px_rgba(0,0,0,.08)] hover:-translate-y-px transition-all overflow-hidden"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between p-4 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-3">
              <div
                className={`${card.iconBg} w-[44px] h-[44px] rounded-lg flex items-center justify-center text-xs font-bold text-[var(--text-primary)] flex-shrink-0`}
                style={{ color: card.accentColor }}
              >
                {card.iconText}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{card.title}</div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${card.badgeColor}`}>
                  {card.badgeLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Card Body - Actions */}
          <div className="p-3">
            {card.primaryAction && (
              <Link
                href={card.primaryAction.href}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-[7px] rounded-md text-xs font-semibold text-white cursor-pointer transition-all no-underline border-none mb-2"
                style={{ backgroundColor: card.accentColor }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {card.primaryAction.label}
              </Link>
            )}
            {card.secondaryActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 px-3 py-[7px] text-xs text-[var(--text-secondary)] cursor-pointer rounded hover:bg-[var(--green-50)] hover:text-[var(--green-700)] transition-colors no-underline w-full"
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
