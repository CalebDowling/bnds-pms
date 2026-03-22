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
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#40721d] text-white rounded-lg text-sm font-medium hover:bg-[#2f5419] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// SVG Illustrations

const PatientIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Head */}
    <circle cx="32" cy="18" r="8" />
    {/* Body */}
    <path d="M 32 26 L 32 40" />
    {/* Left arm */}
    <path d="M 32 28 L 20 36" />
    {/* Right arm */}
    <path d="M 32 28 L 44 36" />
    {/* Left leg */}
    <path d="M 32 40 L 24 52" />
    {/* Right leg */}
    <path d="M 32 40 L 40 52" />
    {/* Plus sign on chest */}
    <line x1="32" y1="32" x2="32" y2="38" />
    <line x1="29" y1="35" x2="35" y2="35" />
  </svg>
);

const PrescriptionIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Document */}
    <rect x="16" y="8" width="32" height="48" rx="2" />
    {/* Top line */}
    <line x1="22" y1="16" x2="42" y2="16" />
    {/* Middle lines */}
    <line x1="22" y1="24" x2="42" y2="24" />
    <line x1="22" y1="28" x2="35" y2="28" />
    {/* Bottom lines */}
    <line x1="22" y1="36" x2="42" y2="36" />
    <line x1="22" y1="40" x2="42" y2="40" />
    <line x1="22" y1="44" x2="35" y2="44" />
  </svg>
);

const InventoryIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Box 1 */}
    <rect x="12" y="24" width="16" height="20" rx="1" />
    <line x1="12" y1="28" x2="28" y2="28" />
    {/* Box 2 */}
    <rect x="36" y="24" width="16" height="20" rx="1" />
    <line x1="36" y1="28" x2="52" y2="28" />
    {/* Shelves */}
    <line x1="8" y1="48" x2="56" y2="48" />
    <line x1="8" y1="54" x2="56" y2="54" />
  </svg>
);

const SearchIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Magnifying glass circle */}
    <circle cx="24" cy="24" r="12" />
    {/* Handle */}
    <line x1="34" y1="34" x2="48" y2="48" />
    {/* X in center */}
    <line x1="20" y1="20" x2="28" y2="28" />
    <line x1="28" y1="20" x2="20" y2="28" />
  </svg>
);

const OrderIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Shopping cart */}
    <path d="M 16 16 L 20 40 Q 20 44 24 44 L 48 44 Q 52 44 52 40 L 52 20" />
    <line x1="20" y1="16" x2="52" y2="16" />
    {/* Items in cart */}
    <rect x="24" y="28" width="8" height="10" rx="1" />
    <rect x="36" y="28" width="8" height="10" rx="1" />
  </svg>
);

const CheckmarkIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    {/* Circle */}
    <circle cx="32" cy="32" r="24" />
    {/* Checkmark */}
    <polyline points="22 32 28 38 42 26" />
  </svg>
);

const ReportIllustration = () => (
  <svg
    className="w-16 h-16"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Document */}
    <rect x="16" y="8" width="32" height="48" rx="2" />
    {/* Chart bars */}
    <rect x="22" y="32" width="4" height="12" />
    <rect x="30" y="28" width="4" height="16" />
    <rect x="38" y="24" width="4" height="20" />
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
