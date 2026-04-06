"use client";

import { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center animate-float-in ${className}`}
    >
      {icon && (
        <div className="mb-6">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--theme-accent, #40721d)" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// SVG Illustrations

const PatientIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#10b981" opacity="0.08" />
    <circle cx="48" cy="48" r="28" fill="#10b981" opacity="0.06" />
    <circle cx="48" cy="34" r="10" stroke="#10b981" strokeWidth="2" fill="white" />
    <path d="M30 60a18 18 0 0 1 36 0" stroke="#10b981" strokeWidth="2" fill="#10b981" fillOpacity="0.1" strokeLinecap="round" />
    <circle cx="62" cy="36" r="8" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="1.5" />
    <line x1="62" y1="33" x2="62" y2="39" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="59" y1="36" x2="65" y2="36" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PrescriptionIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#3b82f6" opacity="0.08" />
    <rect x="28" y="18" width="40" height="56" rx="4" stroke="#3b82f6" strokeWidth="2" fill="white" />
    <rect x="36" y="14" width="24" height="8" rx="2" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
    <line x1="36" y1="34" x2="60" y2="34" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    <line x1="36" y1="42" x2="56" y2="42" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <line x1="36" y1="50" x2="52" y2="50" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
    <path d="M36 60 l4 4 l8-8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InventoryIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#a855f7" opacity="0.08" />
    <rect x="24" y="30" width="24" height="24" rx="3" stroke="#a855f7" strokeWidth="2" fill="#a855f7" fillOpacity="0.08" />
    <line x1="24" y1="36" x2="48" y2="36" stroke="#a855f7" strokeWidth="1.5" />
    <line x1="36" y1="30" x2="36" y2="36" stroke="#a855f7" strokeWidth="1.5" />
    <rect x="52" y="38" width="20" height="20" rx="3" stroke="#8b5cf6" strokeWidth="2" fill="#8b5cf6" fillOpacity="0.08" />
    <line x1="52" y1="44" x2="72" y2="44" stroke="#8b5cf6" strokeWidth="1.5" />
    <line x1="62" y1="38" x2="62" y2="44" stroke="#8b5cf6" strokeWidth="1.5" />
    <line x1="20" y1="62" x2="76" y2="62" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    <line x1="20" y1="68" x2="76" y2="68" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
  </svg>
);

const SearchIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#f59e0b" opacity="0.08" />
    <circle cx="42" cy="40" r="18" stroke="#f59e0b" strokeWidth="2" fill="white" />
    <circle cx="42" cy="40" r="12" stroke="#f59e0b" strokeWidth="1.5" opacity="0.2" strokeDasharray="3 3" />
    <line x1="56" y1="54" x2="68" y2="66" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
    <path d="M38 40h8M42 36v8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
  </svg>
);

const OrderIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#40721d" opacity="0.08" />
    <path d="M28 28l4 30a4 4 0 004 4h28a4 4 0 004-4l2-24H32" stroke="#40721d" strokeWidth="2" fill="#40721d" fillOpacity="0.05" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="40" cy="68" r="3" fill="#40721d" opacity="0.4" />
    <circle cx="58" cy="68" r="3" fill="#40721d" opacity="0.4" />
    <rect x="40" y="38" width="8" height="14" rx="2" fill="#65a30d" fillOpacity="0.2" stroke="#65a30d" strokeWidth="1.5" />
    <rect x="52" y="42" width="8" height="10" rx="2" fill="#40721d" fillOpacity="0.2" stroke="#40721d" strokeWidth="1.5" />
  </svg>
);

const CheckmarkIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#10b981" opacity="0.08" />
    <circle cx="48" cy="48" r="24" stroke="#10b981" strokeWidth="2" fill="#10b981" fillOpacity="0.06" />
    <path d="M36 48l6 6 14-14" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ReportIllustration = () => (
  <svg className="w-24 h-24" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" fill="#6366f1" opacity="0.08" />
    <rect x="24" y="20" width="48" height="56" rx="4" stroke="#6366f1" strokeWidth="2" fill="white" />
    <rect x="34" y="50" width="6" height="16" rx="1" fill="#6366f1" fillOpacity="0.3" />
    <rect x="44" y="42" width="6" height="24" rx="1" fill="#6366f1" fillOpacity="0.5" />
    <rect x="54" y="34" width="6" height="32" rx="1" fill="#6366f1" fillOpacity="0.7" />
    <line x1="32" y1="30" x2="62" y2="30" stroke="#6366f1" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
  </svg>
);

// Pre-built variants

export function EmptyPatients(props?: {
  onAddClick?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<PatientIllustration />}
      title="No patients found"
      description="Get started by adding your first patient"
      action={
        props?.onAddClick
          ? { label: "Add your first patient", onClick: props.onAddClick }
          : undefined
      }
      className={props?.className}
    />
  );
}

export function EmptyPrescriptions(props?: {
  onNewClick?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<PrescriptionIllustration />}
      title="No prescriptions yet"
      description="Create your first prescription to get started"
      action={
        props?.onNewClick
          ? { label: "New Prescription", onClick: props.onNewClick }
          : undefined
      }
      className={props?.className}
    />
  );
}

export function EmptyInventory(props?: {
  onImportClick?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<InventoryIllustration />}
      title="Inventory is empty"
      description="Import items to manage your stock"
      action={
        props?.onImportClick
          ? { label: "Import Items", onClick: props.onImportClick }
          : undefined
      }
      className={props?.className}
    />
  );
}

export function EmptyResults(props?: {
  className?: string;
}) {
  return (
    <EmptyState
      icon={<SearchIllustration />}
      title="No results found"
      description="Try a different search or adjust your filters"
      className={props?.className}
    />
  );
}

export function EmptyOrders(props?: {
  onNewClick?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<OrderIllustration />}
      title="No orders yet"
      description="Start placing orders to see them here"
      action={
        props?.onNewClick
          ? { label: "New Order", onClick: props.onNewClick }
          : undefined
      }
      className={props?.className}
    />
  );
}

export function EmptyNotifications(props?: {
  className?: string;
}) {
  return (
    <EmptyState
      icon={<CheckmarkIllustration />}
      title="All caught up!"
      description="You have no new notifications"
      className={props?.className}
    />
  );
}

export function EmptyReports(props?: {
  className?: string;
}) {
  return (
    <EmptyState
      icon={<ReportIllustration />}
      title="Select a report to get started"
      description="Choose a report type to view insights"
      className={props?.className}
    />
  );
}
