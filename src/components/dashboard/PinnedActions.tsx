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
    <div className="px-6 mb-1 flex items-center gap-3 overflow-x-auto mobile-scroll-x">
      <style>{`
        .kbd-badge {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
      `}</style>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mr-1 whitespace-nowrap flex-shrink-0">
        Pinned
      </div>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          title={`${action.label} (${action.shortcut})`}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#40721d] ${
            action.primary
              ? "bg-gradient-to-br from-[#40721d] to-[#5a9f2a] text-white hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 shadow-sm hover:shadow-md"
          }`}
        >
          {getIcon(action.label)}
          <span>{action.label}</span>
          <span className={`kbd-badge px-1.5 py-0.5 rounded ${
            action.primary
              ? "bg-white/20 text-white"
              : "bg-gray-200 text-gray-600"
          }`}>
            {action.shortcut}
          </span>
        </Link>
      ))}
      <span className="hidden sm:inline text-[11px] text-[var(--text-muted)] cursor-pointer px-2 py-1 rounded hover:bg-gray-100 hover:text-gray-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40721d] flex-shrink-0">
        Customize
      </span>
    </div>
  );
}
