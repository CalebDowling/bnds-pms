"use client";

import Link from "next/link";

export interface DashboardData {
  patientsToday: number;
  rxToday: number;
  rxYesterday: number;
  activeItems: number;
  doctorsOnFile: number;
  pendingBatches: number;
  lowStockItems: number;
  salesToday: number;
  revenueToday: number;
  pendingRefills: number;
  expiringLots: number;
  rejectedClaims: number;
}

interface CardConfig {
  id: string;
  title: string;
  statValue?: number;
  statLabel?: string;
  badgeLabel: string;
  badgeAlert?: boolean;
  accentColor: string;
  gradientColors: [string, string];
  icon: React.ReactNode;
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

const TrendUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8 10 1 17"/><polyline points="17 6 23 6 23 12"/></svg>
);

const TrendDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8 14 1 7"/><polyline points="17 18 23 18 23 12"/></svg>
);

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function calculateTrend(current: number, previous: number): { percent: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { percent: 0, direction: current > 0 ? 'up' : 'neutral' };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { percent: Math.abs(percent), direction: current > previous ? 'up' : current < previous ? 'down' : 'neutral' };
}

export default function CardGrid({ data }: { data: DashboardData }) {

  // Gradient icon components (white stroke on gradient background)
  const PatientIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );

  const PillIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
  );

  const PackageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
  );

  const MedicalCrossIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
  );

  const FlaskIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v17.5A2.5 2.5 0 0 0 11.5 22h1a2.5 2.5 0 0 0 2.5-2.5V2"/><path d="M7 10h10"/><path d="M8 6h8"/></svg>
  );

  const AlertTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  );

  const DollarSignIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  );

  const ClipboardCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>
  );

  const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  );

  const rxTrend = calculateTrend(data.rxToday, data.rxYesterday);

  const cards: CardConfig[] = [
    {
      id: "patient",
      title: "Patient",
      statValue: data.patientsToday,
      statLabel: "TODAY",
      icon: <PatientIcon />,
      accentColor: "#10b981",
      gradientColors: ["#10b981", "#06b6d4"],
      badgeLabel: `+${formatNumber(data.patientsToday)} today`,
      primaryAction: { href: "/patients/new", label: "New Patient" },
      secondaryActions: [
        { href: "/patients", label: "Find Patient", icon: <SearchIcon /> },
        { href: "/patients/merge", label: "Merge Records", icon: <MergeIcon /> },
      ],
    },
    {
      id: "prescription",
      title: "Prescription",
      statValue: data.rxToday,
      statLabel: "TODAY",
      icon: <PillIcon />,
      accentColor: "#3b82f6",
      gradientColors: ["#3b82f6", "#6366f1"],
      badgeLabel: `+${formatNumber(data.rxToday)} today`,
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
      statValue: data.activeItems,
      statLabel: "ACTIVE",
      icon: <PackageIcon />,
      accentColor: "#a855f7",
      gradientColors: ["#a855f7", "#8b5cf6"],
      badgeLabel: `${formatNumber(data.activeItems)} active`,
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
      statValue: data.doctorsOnFile,
      statLabel: "ON FILE",
      icon: <MedicalCrossIcon />,
      accentColor: "#f97316",
      gradientColors: ["#f97316", "#f87171"],
      badgeLabel: `${formatNumber(data.doctorsOnFile)} on file`,
      primaryAction: { href: "/doctors/new", label: "New Prescriber" },
      secondaryActions: [
        { href: "/doctors", label: "Find Prescriber", icon: <SearchIcon /> },
        { href: "/doctors/merge", label: "Merge Records", icon: <MergeIcon /> },
      ],
    },
    {
      id: "compounding",
      title: "Compounding",
      statValue: data.pendingBatches,
      statLabel: "PENDING",
      icon: <FlaskIcon />,
      accentColor: "#f43f5e",
      gradientColors: ["#f43f5e", "#ec4899"],
      badgeLabel: `${formatNumber(data.pendingBatches)} pending`,
      primaryAction: { href: "/compounding/batches", label: "Batch Manager" },
      secondaryActions: [
        { href: "/compounding/formulas/new", label: "New Formula", icon: <PlusIcon /> },
        { href: "/compounding/formulas", label: "Find Formula", icon: <SearchIcon /> },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      statValue: data.lowStockItems,
      statLabel: "LOW STOCK",
      icon: <AlertTriangleIcon />,
      accentColor: "#f59e0b",
      gradientColors: ["#f59e0b", "#eab308"],
      badgeLabel: `${formatNumber(data.lowStockItems)} low stock`,
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
      statValue: data.salesToday,
      statLabel: "TODAY",
      icon: <DollarSignIcon />,
      accentColor: "#40721d",
      gradientColors: ["#40721d", "#65a30d"],
      badgeLabel: `${formatNumber(data.salesToday)} today`,
      primaryAction: { href: "/pos", label: "Point of Sale" },
      secondaryActions: [
        { href: "/sales", label: "Find Sale", icon: <SearchIcon /> },
      ],
    },
    {
      id: "claims",
      title: "Insurance & Claims",
      statValue: data.rejectedClaims,
      statLabel: "REJECTED",
      icon: <ClipboardCheckIcon />,
      accentColor: "#6366f1",
      gradientColors: ["#6366f1", "#8b5cf6"],
      badgeLabel: `${formatNumber(data.rejectedClaims)} rejects`,
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
      icon: <SettingsIcon />,
      accentColor: "#14b8a6",
      gradientColors: ["#14b8a6", "#06b6d4"],
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
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="card-gradient-border bg-[var(--card-bg)] rounded-[10px] card-hover transition-all overflow-hidden"
          style={{
            "--card-accent": card.accentColor,
            animation: `float-in 0.3s ease forwards`,
            animationDelay: `${index * 0.05}s`,
          } as React.CSSProperties}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between p-4 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-3 flex-1">
              {/* Gradient Icon Circle */}
              <div
                className="w-[44px] h-[44px] rounded-lg icon-gradient flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${card.gradientColors[0]}, ${card.gradientColors[1]})`,
                }}
              >
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{card.title}</div>
                {card.statValue !== undefined && card.statLabel && (
                  <div className="flex items-baseline gap-1 mt-1">
                    <div className="text-2xl font-extrabold" style={{ color: card.accentColor }}>
                      {formatNumber(card.statValue)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {card.statLabel}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Body - Actions */}
          <div className="p-3">
            {card.primaryAction && (
              <Link
                href={card.primaryAction.href}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-[7px] rounded-lg text-sm font-medium text-white cursor-pointer transition-all no-underline border-none mb-2"
                style={{
                  background: `linear-gradient(135deg, #40721d, #5a9f2a)`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {card.primaryAction.label}
              </Link>
            )}
            {card.secondaryActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 px-3 py-[7px] text-sm text-gray-600 cursor-pointer rounded transition-colors no-underline w-full"
                style={{
                  color: "rgb(75, 85, 99)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = card.accentColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "rgb(75, 85, 99)";
                }}
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
