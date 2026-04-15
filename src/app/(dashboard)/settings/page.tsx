"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, Users, Shield, Printer, Cpu, Bell, Link2, QrCode, CreditCard,
  ClipboardList, Phone, Mail, ChevronRight,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";

// ─── Section definitions ──────────────────────────────────────────

const SECTIONS = [
  { id: "pharmacy", label: "Pharmacy Info", icon: Building2, href: null },
  { id: "system", label: "System Config", icon: Cpu, href: null },
  { id: "users", label: "Users & Roles", icon: Users, href: "/users" },
  { id: "security", label: "Security", icon: Shield, href: "/settings/security" },
  { id: "print", label: "Print Templates", icon: Printer, href: "/settings/print-templates" },
  { id: "hardware", label: "Hardware", icon: Cpu, href: "/settings/hardware" },
  { id: "alerts", label: "Alerts", icon: Bell, href: "/settings/alerts" },
  { id: "integrations", label: "Integrations", icon: Link2, href: "/settings/integrations" },
  { id: "widget", label: "Web Widget", icon: QrCode, href: "/settings/widget" },
  { id: "fsa", label: "FSA / HSA", icon: CreditCard, href: "/settings/fsa-hsa" },
  { id: "audit", label: "Audit Log", icon: ClipboardList, href: "/settings/audit-log" },
  { id: "blocked", label: "Blocked Numbers", icon: Phone, href: "/settings/blocked-numbers" },
  { id: "notifications", label: "Notifications", icon: Mail, href: "/settings/notifications" },
] as const;

// ─── Inline section content ───────────────────────────────────────

function PharmacyInfoSection() {
  return (
    <div>
      <h2 className="mb-1">Pharmacy Information</h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Store details and contact information</p>
      <dl className="space-y-0">
        {[
          { label: "Name", value: "Boudreaux's Compounding Pharmacy" },
          { label: "NPI", value: "1234567890", mono: true },
          { label: "NCPDP", value: "—", mono: true },
          { label: "DEA", value: "—", mono: true },
          { label: "State License", value: "LA" },
          { label: "Phone", value: "(337) 000-0000" },
          { label: "Fax", value: "(337) 000-0001" },
          { label: "Address", value: "404 E Prien Lake Rd, Lake Charles, LA 70601" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <dt className="text-sm" style={{ color: "var(--text-muted)" }}>{item.label}</dt>
            <dd className={`text-sm font-medium ${item.mono ? "font-mono" : ""}`} style={{ color: "var(--text-primary)" }}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SystemConfigSection() {
  return (
    <div>
      <h2 className="mb-1">System Configuration</h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Numbering formats, defaults, and system settings</p>
      <div className="space-y-0">
        {[
          { label: "MRN Format", desc: "Patient MRN prefix and numbering", value: "BNDS-XXXXXXX" },
          { label: "Rx Number Start", desc: "Starting prescription number", value: "100001" },
          { label: "Batch Number Format", desc: "Compounding batch numbering", value: "BYYYYMMDD-###" },
          { label: "Default BUD Days", desc: "Non-sterile compounds", value: "180 days" },
          { label: "Time Zone", desc: "System time zone", value: "America/Chicago (CST)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
            </div>
            <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedSection({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <div>
      <h2 className="mb-1">{title}</h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>{description}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white no-underline transition-colors"
        style={{ backgroundColor: "var(--color-primary, #40721D)" }}
      >
        Open {title} <ChevronRight size={16} />
      </Link>
    </div>
  );
}

function UsersSection() {
  const roles = [
    { role: "Pharmacist (RPh)", desc: "Full system access, verification, clinical decisions", color: "#7c3aed", bg: "#ede9fe" },
    { role: "Pharmacy Tech", desc: "Fill prescriptions, compound, manage inventory", color: "#2563eb", bg: "#dbeafe" },
    { role: "Shipping Clerk", desc: "Pack and ship orders, manage deliveries", color: "#0891b2", bg: "#cffafe" },
    { role: "Billing Specialist", desc: "Claims processing, payments, insurance", color: "#16a34a", bg: "#dcfce7" },
    { role: "Cashier", desc: "POS transactions, patient pickup", color: "#ea580c", bg: "#fff7ed" },
    { role: "Admin", desc: "System configuration, user management", color: "#dc2626", bg: "#fef2f2" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2>Users & Roles</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Manage staff accounts, roles, and permissions</p>
        </div>
        <Link
          href="/users"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white no-underline"
          style={{ backgroundColor: "var(--color-primary, #40721D)" }}
        >
          Manage Users <ChevronRight size={14} />
        </Link>
      </div>
      <div className="space-y-0">
        {roles.map((r) => (
          <div key={r.role} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: r.bg, color: r.color }}
            >
              {r.role}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main settings page ───────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState("pharmacy");
  const router = useRouter();

  const handleSectionClick = (section: typeof SECTIONS[number]) => {
    // Sections with their own page navigate directly
    if (section.href) {
      router.push(section.href);
      return;
    }
    // Inline sections show content in the right panel
    setActive(section.id);
  };

  const renderContent = () => {
    switch (active) {
      case "pharmacy":
        return <PharmacyInfoSection />;
      case "system":
        return <SystemConfigSection />;
      case "users":
        return <UsersSection />;
      default:
        return <PharmacyInfoSection />;
    }
  };

  return (
    <PageShell
      title="Settings"
      subtitle="Pharmacy configuration, users, and system settings"
    >
      {/* Sidebar + Content */}
      <div
        className="flex gap-0 rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", minHeight: "calc(100vh - 240px)" }}
      >
        {/* Sidebar */}
        <nav
          className="w-56 flex-shrink-0 p-2"
          style={{ backgroundColor: "var(--card-bg)", borderRight: "1px solid var(--border)" }}
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active && !s.href;
            return (
              <button
                key={s.id}
                onClick={() => handleSectionClick(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all mb-0.5"
                style={{
                  backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon size={16} style={{ opacity: isActive ? 1 : 0.7 }} />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 p-6" style={{ backgroundColor: "var(--page-bg)" }}>
          {renderContent()}
        </div>
      </div>
    </PageShell>
  );
}
