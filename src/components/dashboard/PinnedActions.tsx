"use client";

import Link from "next/link";

const actions = [
  { href: "/patients/new", label: "New Patient", shortcut: "P", primary: true },
  { href: "/prescriptions/new", label: "New Rx", shortcut: "N", primary: true },
  { href: "/compounding/batches", label: "Batch Manager", shortcut: "B", primary: false },
  { href: "/pos", label: "Point of Sale", shortcut: "S", primary: false },
  { href: "/patients", label: "Find Patient", shortcut: "F", primary: false },
];

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const GearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

function getIcon(label: string) {
  if (label.startsWith("New")) return <PlusIcon />;
  if (label === "Batch Manager") return <GearIcon />;
  if (label === "Point of Sale") return <DollarIcon />;
  if (label === "Find Patient") return <SearchIcon />;
  return null;
}

export default function PinnedActions() {
  return (
    <div className="px-6 mb-1 flex items-center gap-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mr-1 whitespace-nowrap">
        Pinned
      </div>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          title={`${action.label} (${action.shortcut})`}
          className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-xs font-semibold cursor-pointer transition-all no-underline border group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--green-600)] ${
            action.primary
              ? "bg-[var(--green-700)] text-white border-[var(--green-700)] hover:bg-[var(--green-900)] active:scale-95"
              : "bg-[var(--green-50)] text-[var(--green-900)] border-[var(--border)] hover:border-[var(--green-600)] hover:bg-[var(--green-100)] active:scale-95"
          }`}
        >
          {getIcon(action.label)}
          <span>{action.label}</span>
          <span className={`text-[9px] font-normal ml-0.5 px-1 py-0.5 rounded ${
            action.primary
              ? "bg-[var(--green-800)] text-[var(--green-100)] opacity-75"
              : "bg-[var(--text-muted)] text-white opacity-50 group-hover:opacity-70"
          }`}>
            {action.shortcut}
          </span>
        </Link>
      ))}
      <span className="ml-auto text-[11px] text-[var(--text-muted)] cursor-pointer px-2 py-1 rounded hover:bg-[var(--green-100)] hover:text-[var(--green-700)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-600)]">
        Customize
      </span>
    </div>
  );
}
