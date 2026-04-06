"use client";

import Link from "next/link";
import {
  Users,
  Pill,
  Package,
  Cross,
  FlaskConical,
  AlertTriangle,
  DollarSign,
  ClipboardCheck,
  Settings,
  Search,
  Plus,
  GitMerge,
  FileText,
  Upload,
  TrendingUp,
  Check,
  UserCog,
  LayoutGrid,
  Truck,
  Monitor,
  Zap,
  TrendingDown,
  Minus,
} from "lucide-react";

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
  const rxTrend = calculateTrend(data.rxToday, data.rxYesterday);

  const cards: CardConfig[] = [
    {
      id: "patient",
      title: "Patient",
      statValue: data.patientsToday,
      statLabel: "TODAY",
      icon: <Users size={22} />,
      accentColor: "#10b981",
      gradientColors: ["#10b981", "#06b6d4"],
      badgeLabel: `+${formatNumber(data.patientsToday)} today`,
      primaryAction: { href: "/patients/new", label: "New Patient" },
      secondaryActions: [
        { href: "/patients", label: "Find Patient", icon: <Search size={13} /> },
        { href: "/patients/merge", label: "Merge Records", icon: <GitMerge size={13} /> },
      ],
    },
    {
      id: "prescription",
      title: "Prescription",
      statValue: data.rxToday,
      statLabel: "TODAY",
      icon: <Pill size={22} />,
      accentColor: "#3b82f6",
      gradientColors: ["#3b82f6", "#6366f1"],
      badgeLabel: `+${formatNumber(data.rxToday)} today`,
      primaryAction: { href: "/prescriptions/new", label: "New Prescription" },
      secondaryActions: [
        { href: "/prescriptions", label: "Find Prescription", icon: <Search size={13} /> },
        { href: "/prescriptions/sig-codes", label: "Sig Codes", icon: <Plus size={13} /> },
        { href: "/prescriptions/deliveries", label: "Deliveries", icon: <Truck size={13} /> },
        { href: "/prescriptions/batch-refills", label: "Batch Refills", icon: <TrendingUp size={13} /> },
      ],
    },
    {
      id: "item",
      title: "Item",
      statValue: data.activeItems,
      statLabel: "ACTIVE",
      icon: <Package size={22} />,
      accentColor: "#a855f7",
      gradientColors: ["#a855f7", "#8b5cf6"],
      badgeLabel: `${formatNumber(data.activeItems)} active`,
      secondaryActions: [
        { href: "/inventory", label: "Manage Items", icon: <Plus size={13} /> },
        { href: "/inventory", label: "Find Item", icon: <Search size={13} /> },
        { href: "/inventory/reorder", label: "Purchase Order", icon: <FileText size={13} /> },
        { href: "/inventory/new", label: "Add New Item", icon: <Upload size={13} /> },
        { href: "/inventory/scan", label: "Scan Inventory", icon: <Zap size={13} /> },
      ],
    },
    {
      id: "doctor",
      title: "Doctor",
      statValue: data.doctorsOnFile,
      statLabel: "ON FILE",
      icon: <Cross size={22} />,
      accentColor: "#f97316",
      gradientColors: ["#f97316", "#f87171"],
      badgeLabel: `${formatNumber(data.doctorsOnFile)} on file`,
      primaryAction: { href: "/prescriptions/prescribers/new", label: "New Prescriber" },
      secondaryActions: [
        { href: "/prescriptions", label: "Find Prescriber", icon: <Search size={13} /> },
      ],
    },
    {
      id: "compounding",
      title: "Compounding",
      statValue: data.pendingBatches,
      statLabel: "PENDING",
      icon: <FlaskConical size={22} />,
      accentColor: "#f43f5e",
      gradientColors: ["#f43f5e", "#ec4899"],
      badgeLabel: `${formatNumber(data.pendingBatches)} pending`,
      primaryAction: { href: "/compounding/batches", label: "Batch Manager" },
      secondaryActions: [
        { href: "/compounding/formulas/new", label: "New Formula", icon: <Plus size={13} /> },
        { href: "/compounding", label: "Find Formula", icon: <Search size={13} /> },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      statValue: data.lowStockItems,
      statLabel: "LOW STOCK",
      icon: <AlertTriangle size={22} />,
      accentColor: "#f59e0b",
      gradientColors: ["#f59e0b", "#eab308"],
      badgeLabel: `${formatNumber(data.lowStockItems)} low stock`,
      badgeAlert: true,
      secondaryActions: [
        { href: "/inventory", label: "Manual Inventory", icon: <FileText size={13} /> },
        { href: "/inventory/reorder", label: "Reorder", icon: <Upload size={13} /> },
        { href: "/inventory/scan", label: "Fast Count", icon: <TrendingUp size={13} /> },
        { href: "/inventory/new", label: "Check-In New", icon: <Check size={13} /> },
      ],
    },
    {
      id: "sale",
      title: "Sale",
      statValue: data.salesToday,
      statLabel: "TODAY",
      icon: <DollarSign size={22} />,
      accentColor: "#40721d",
      gradientColors: ["#40721d", "#65a30d"],
      badgeLabel: `${formatNumber(data.salesToday)} today`,
      primaryAction: { href: "/pos", label: "Point of Sale" },
      secondaryActions: [
        { href: "/pos", label: "Find Sale", icon: <Search size={13} /> },
      ],
    },
    {
      id: "claims",
      title: "Insurance & Claims",
      statValue: data.rejectedClaims,
      statLabel: "REJECTED",
      icon: <ClipboardCheck size={22} />,
      accentColor: "#6366f1",
      gradientColors: ["#6366f1", "#8b5cf6"],
      badgeLabel: `${formatNumber(data.rejectedClaims)} rejects`,
      badgeAlert: true,
      secondaryActions: [
        { href: "/billing/claims", label: "Find Claim", icon: <Search size={13} /> },
        { href: "/billing/claims", label: "Overrides", icon: <Plus size={13} /> },
        { href: "/billing/claims", label: "Custom Rejects", icon: <FileText size={13} /> },
      ],
    },
    {
      id: "system",
      title: "System",
      icon: <Settings size={22} />,
      accentColor: "#14b8a6",
      gradientColors: ["#14b8a6", "#06b6d4"],
      badgeLabel: "Admin",
      secondaryActions: [
        { href: "/users", label: "Employees", icon: <UserCog size={13} /> },
        { href: "/reports", label: "Reports", icon: <LayoutGrid size={13} /> },
        { href: "/billing", label: "Financial Reports", icon: <DollarSign size={13} /> },
        { href: "/settings", label: "Settings", icon: <Settings size={13} /> },
        { href: "/settings/hardware", label: "Hardware", icon: <Monitor size={13} /> },
        { href: "/shipping", label: "Shipping", icon: <Truck size={13} /> },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 mobile-stack">
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="glass-card rounded-[10px] overflow-hidden relative"
          style={{
            "--card-accent": card.accentColor,
            animation: `float-in 0.3s ease forwards`,
            animationDelay: `${index * 0.05}s`,
          } as React.CSSProperties}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between p-4 border-b border-[var(--border-light)] relative z-[1]">
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
          <div className="p-3 relative z-[1]">
            {card.primaryAction && (
              <Link
                href={card.primaryAction.href}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-[7px] rounded-lg text-sm font-medium text-white cursor-pointer transition-all no-underline border-none mb-2"
                style={{
                  background: `linear-gradient(135deg, var(--theme-accent, #40721d), var(--theme-accent-light, #5a9a2f))`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                <Plus size={12} strokeWidth={2.5} />
                {card.primaryAction.label}
              </Link>
            )}
            {card.secondaryActions.map((action) => (
              <Link
                key={action.href + action.label}
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
