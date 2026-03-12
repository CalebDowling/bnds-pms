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
  icon: React.ReactNode;
  badgeLabel: string;
  badgeAlert?: boolean;
  primaryAction?: { href: string; label: string };
  secondaryActions: { href: string; label: string; icon: React.ReactNode }[];
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const MergeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><path d="M9 15a6 6 0 0 1 6-6m6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0m0 6a6 6 0 0 0-6-6"/></svg>
);

const DocIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const TrendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8 10 1 17"/><polyline points="17 6 23 6 23 12"/></svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
);

const GearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24"/></svg>
);

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/><path d="M1 12c0-1 .895-2 2-2h16c1.105 0 2 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-5z"/></svg>
);

const InteractionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24"/></svg>
);

export default function CardGrid({ data }: { data: DashboardData }) {

  // Card-level SVG icons (outline style, consistent green)
  const PatientCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );

  const RxCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
  );

  const ItemCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M9 2h6"/><line x1="6" y1="6" x2="18" y2="6"/></svg>
  );

  const DoctorCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 0 12 0A6 6 0 0 0 6 8z"/><line x1="12" y1="5" x2="12" y2="11"/><line x1="9" y1="8" x2="15" y2="8"/></svg>
  );

  const CompoundCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3v4m6-4v4"/><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 11h6m-6 4h6"/></svg>
  );

  const InventoryCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 12H17a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h1.5M7 4h10v4H7z"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
  );

  const SaleCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  );

  const ClaimCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
  );

  const SystemCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  );

  const cards: CardConfig[] = [
    {
      id: "patient",
      title: "Patient",
      icon: <PatientCardIcon />,
      badgeLabel: `+${data.patientsToday} today`,
      primaryAction: { href: "/patients/new", label: "New Patient" },
      secondaryActions: [
        { href: "/patients", label: "Find Patient", icon: <SearchIcon /> },
        { href: "/patients/merge", label: "Merge Records", icon: <MergeIcon /> },
      ],
    },
    {
      id: "prescription",
      title: "Prescription",
      icon: <RxCardIcon />,
      badgeLabel: `+${data.rxToday} today`,
      primaryAction: { href: "/prescriptions/new", label: "New Prescription" },
      secondaryActions: [
        { href: "/prescriptions", label: "Find Prescription", icon: <SearchIcon /> },
        { href: "/prescriptions/sig-codes", label: "Sig Codes", icon: <PlusIcon /> },
        { href: "/prescriptions/deliveries", label: "Deliveries", icon: <TruckIcon /> },
        { href: "/prescriptions/batch-refills", label: "Batch Refills", icon: <TrendIcon /> },
      ],
    },
    {
      id: "item",
      title: "Item",
      icon: <ItemCardIcon />,
      badgeLabel: `${data.activeItems} active`,
      secondaryActions: [
        { href: "/inventory/items", label: "Manage Items", icon: <PlusIcon /> },
        { href: "/inventory/items/find", label: "Find Item", icon: <SearchIcon /> },
        { href: "/inventory/purchase-order", label: "Purchase Order", icon: <DocIcon /> },
        { href: "/inventory/items/import", label: "Import Items", icon: <UploadIcon /> },
        { href: "/inventory/interaction-checker", label: "Interaction Checker", icon: <InteractionIcon /> },
        { href: "/inventory/price-quote", label: "Price Quote", icon: <DollarIcon /> },
      ],
    },
    {
      id: "doctor",
      title: "Doctor",
      icon: <DoctorCardIcon />,
      badgeLabel: `${data.doctorsOnFile} on file`,
      primaryAction: { href: "/doctors/new", label: "New Prescriber" },
      secondaryActions: [
        { href: "/doctors", label: "Find Prescriber", icon: <SearchIcon /> },
        { href: "/doctors/merge", label: "Merge Records", icon: <MergeIcon /> },
      ],
    },
    {
      id: "compounding",
      title: "Compounding",
      icon: <CompoundCardIcon />,
      badgeLabel: `${data.pendingBatches} pending`,
      primaryAction: { href: "/compounding/batches", label: "Batch Manager" },
      secondaryActions: [
        { href: "/compounding/formulas/new", label: "New Formula", icon: <PlusIcon /> },
        { href: "/compounding/formulas", label: "Find Formula", icon: <SearchIcon /> },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      icon: <InventoryCardIcon />,
      badgeLabel: `${data.lowStockItems} low stock`,
      badgeAlert: true,
      secondaryActions: [
        { href: "/inventory/manual-count", label: "Manual Inventory", icon: <DocIcon /> },
        { href: "/inventory/supplier-feeds", label: "Supplier Data Feeds", icon: <UploadIcon /> },
        { href: "/inventory/fast-count", label: "Fast Count", icon: <TrendIcon /> },
        { href: "/inventory/check-in", label: "Check-In New", icon: <CheckIcon /> },
      ],
    },
    {
      id: "sale",
      title: "Sale",
      icon: <SaleCardIcon />,
      badgeLabel: `${data.salesToday} today`,
      primaryAction: { href: "/pos", label: "Point of Sale" },
      secondaryActions: [
        { href: "/sales", label: "Find Sale", icon: <SearchIcon /> },
      ],
    },
    {
      id: "claims",
      title: "Insurance & Claims",
      icon: <ClaimCardIcon />,
      badgeLabel: `${data.rejectedClaims} rejects`,
      badgeAlert: true,
      secondaryActions: [
        { href: "/claims", label: "Find Claim", icon: <SearchIcon /> },
        { href: "/claims/overrides", label: "Overrides", icon: <PlusIcon /> },
        { href: "/claims/custom-rejects", label: "Custom Rejects", icon: <DocIcon /> },
      ],
    },
    {
      id: "system",
      title: "System",
      icon: <SystemCardIcon />,
      badgeLabel: "Admin",
      secondaryActions: [
        { href: "/admin/employees", label: "Employees", icon: <UsersIcon /> },
        { href: "/admin/reports", label: "Reports", icon: <GridIcon /> },
        { href: "/admin/financial-reports", label: "Financial Reports", icon: <DollarIcon /> },
        { href: "/settings", label: "Settings", icon: <GearIcon /> },
        { href: "/admin/shipping", label: "Shipping", icon: <TruckIcon /> },
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
              <div className="w-[44px] h-[44px] rounded-lg bg-[var(--green-50)] border border-[var(--border-light)] flex items-center justify-center flex-shrink-0">
                {card.icon}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{card.title}</div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                  card.badgeAlert
                    ? "bg-[var(--red-100)] text-[var(--red-600)]"
                    : "bg-[var(--green-100)] text-[var(--green-700)]"
                }`}>
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
                className="flex items-center justify-center gap-1.5 w-full px-3 py-[7px] rounded-md text-xs font-semibold text-white bg-[var(--green-700)] hover:bg-[var(--green-900)] cursor-pointer transition-all no-underline border-none mb-2"
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
