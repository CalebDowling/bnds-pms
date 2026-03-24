"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Pill,
  Package,
  Stethoscope,
  FlaskConical,
  DollarSign,
  ShieldCheck,
  Settings,
  BarChart3,
  Phone,
  Plus,
  FileText,
  Truck,
  ArrowRight,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  category: string;
  keywords: string[];
}

const commands: CommandItem[] = [
  // Navigation
  { id: "nav-dashboard", label: "Go to Dashboard", icon: <BarChart3 size={16} />, href: "/dashboard", category: "Navigation", keywords: ["home", "workflow", "main"] },
  { id: "nav-phone", label: "Go to Phone", icon: <Phone size={16} />, href: "/phone", category: "Navigation", keywords: ["call", "dialer"] },
  { id: "nav-reports", label: "Go to Reports", icon: <BarChart3 size={16} />, href: "/reports", category: "Navigation", keywords: ["analytics", "stats"] },
  { id: "nav-settings", label: "Go to Settings", icon: <Settings size={16} />, href: "/settings", category: "Navigation", keywords: ["config", "preferences"] },

  // Patient actions
  { id: "patient-new", label: "New Patient", description: "Create a new patient record", icon: <Plus size={16} />, href: "/patients/new", category: "Patient", keywords: ["add", "create", "register"] },
  { id: "patient-find", label: "Find Patient", description: "Search patient records", icon: <Users size={16} />, href: "/patients", category: "Patient", keywords: ["search", "lookup"] },

  // Prescription actions
  { id: "rx-new", label: "New Prescription", description: "Create a new prescription", icon: <Plus size={16} />, href: "/prescriptions/new", category: "Prescription", keywords: ["add", "create", "rx"] },
  { id: "rx-find", label: "Find Prescription", description: "Search prescriptions", icon: <Pill size={16} />, href: "/prescriptions", category: "Prescription", keywords: ["search", "lookup", "rx"] },
  { id: "rx-deliveries", label: "Deliveries", description: "Manage deliveries", icon: <Truck size={16} />, href: "/prescriptions/deliveries", category: "Prescription", keywords: ["ship", "deliver"] },
  { id: "rx-sig-codes", label: "Sig Codes", icon: <FileText size={16} />, href: "/prescriptions/sig-codes", category: "Prescription", keywords: ["directions"] },

  // Inventory actions
  { id: "inv-manage", label: "Manage Inventory", description: "View and manage items", icon: <Package size={16} />, href: "/inventory", category: "Inventory", keywords: ["items", "stock"] },
  { id: "inv-reorder", label: "Purchase Order / Reorder", description: "Create purchase orders", icon: <FileText size={16} />, href: "/inventory/reorder", category: "Inventory", keywords: ["order", "buy"] },
  { id: "inv-new", label: "Add New Item", icon: <Plus size={16} />, href: "/inventory/new", category: "Inventory", keywords: ["create", "add"] },

  // Compounding
  { id: "cpd-batches", label: "Batch Manager", description: "Manage compounding batches", icon: <FlaskConical size={16} />, href: "/compounding/batches", category: "Compounding", keywords: ["compound", "formula"] },
  { id: "cpd-new", label: "New Formula", icon: <Plus size={16} />, href: "/compounding/formulas/new", category: "Compounding", keywords: ["create", "add"] },

  // Billing
  { id: "billing-claims", label: "Find Claim", description: "Search insurance claims", icon: <ShieldCheck size={16} />, href: "/billing/claims", category: "Billing", keywords: ["insurance", "reject"] },

  // Doctor
  { id: "doc-new", label: "New Prescriber", description: "Add a new prescriber", icon: <Stethoscope size={16} />, href: "/prescriptions/prescribers/new", category: "Doctor", keywords: ["physician", "provider"] },

  // POS
  { id: "pos", label: "Point of Sale", description: "Open POS register", icon: <DollarSign size={16} />, href: "/pos", category: "Sale", keywords: ["register", "checkout", "payment"] },

  // Queue shortcuts
  { id: "queue-intake", label: "Intake Queue", icon: <ArrowRight size={16} />, href: "/queue?status=intake", category: "Queues", keywords: ["workflow"] },
  { id: "queue-verify", label: "Verification Queue", icon: <ArrowRight size={16} />, href: "/queue?status=verify", category: "Queues", keywords: ["check"] },
  { id: "queue-print", label: "Print Queue", icon: <ArrowRight size={16} />, href: "/queue?status=print", category: "Queues", keywords: ["label"] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Open/close with Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter commands
  const filtered = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          cmd.keywords.some((kw) => kw.includes(q))
        );
      })
    : commands;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatList = Object.values(grouped).flat();

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatList[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatList[selectedIndex]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="command-palette-backdrop"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[560px] bg-[var(--card-bg)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{ animation: "page-enter var(--duration-fast) var(--ease-spring)" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-light)]">
          <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-[var(--text-primary)] text-sm outline-none placeholder:text-[var(--text-muted)]"
            aria-label="Search commands"
            autoComplete="off"
          />
          <kbd className="kbd-badge bg-gray-100 text-gray-500 text-[10px]">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2" role="listbox">
          {flatList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  {category}
                </div>
                {items.map((item) => {
                  const globalIdx = flatList.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={globalIdx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-[var(--green-50)] text-[var(--color-primary)]"
                          : "text-[var(--text-primary)] hover:bg-gray-50"
                      }`}
                    >
                      <span className={`flex-shrink-0 ${isSelected ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"}`}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-[var(--text-muted)] truncate">{item.description}</div>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight size={14} className="flex-shrink-0 text-[var(--color-primary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border-light)] text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <kbd className="kbd-badge bg-gray-100 text-gray-500">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd-badge bg-gray-100 text-gray-500">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd-badge bg-gray-100 text-gray-500">esc</kbd> close
          </span>
        </div>
      </div>
    </>
  );
}
