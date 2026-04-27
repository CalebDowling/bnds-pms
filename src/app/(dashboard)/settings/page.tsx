"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, Users, Shield, Printer, Cpu, Bell, Link2, QrCode, CreditCard,
  ClipboardList, Phone, Mail, ChevronRight, Key,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";

// BNDS PMS Redesign — Settings A two-pane (sidebar + content)
// Heritage palette: forest active, paper sidebar, hairline borders

// ─── Section definitions ──────────────────────────────────────────

const SECTIONS = [
  { id: "pharmacy", label: "Pharmacy Info", icon: Building2, href: null },
  { id: "system", label: "System Config", icon: Cpu, href: null },
  { id: "users", label: "Users & Roles", icon: Users, href: "/users" },
  { id: "security", label: "Security", icon: Shield, href: "/settings/security" },
  { id: "api-keys", label: "API Keys", icon: Key, href: "/settings/api-keys" },
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

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h2 className="font-serif" style={{ fontSize: 22, color: "#0f2e1f", fontWeight: 600, marginBottom: 4 }}>
        {title}
      </h2>
      <p className="text-xs mb-5" style={{ color: "#7a8a78" }}>{subtitle}</p>
    </>
  );
}

function PharmacyInfoSection() {
  return (
    <div>
      <SectionHeader title="Pharmacy Information" subtitle="Store details and contact information" />
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
          <div key={item.label} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #ede6d6" }}>
            <dt className="text-sm" style={{ color: "#7a8a78" }}>{item.label}</dt>
            <dd
              className="text-sm font-medium"
              style={{
                color: "#0f2e1f",
                fontFamily: item.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
                fontSize: item.mono ? 12 : undefined,
              }}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SystemConfigSection() {
  return (
    <div>
      <SectionHeader title="System Configuration" subtitle="Numbering formats, defaults, and system settings" />
      <div className="space-y-0">
        {[
          { label: "MRN Format", desc: "Patient MRN prefix and numbering", value: "BNDS-XXXXXXX" },
          { label: "Rx Number Start", desc: "Starting prescription number", value: "100001" },
          { label: "Batch Number Format", desc: "Compounding batch numbering", value: "BYYYYMMDD-###" },
          { label: "Default BUD Days", desc: "Non-sterile compounds", value: "180 days" },
          { label: "Time Zone", desc: "System time zone", value: "America/Chicago (CST)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #ede6d6" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "#0f2e1f" }}>{item.label}</p>
              <p className="text-xs" style={{ color: "#7a8a78" }}>{item.desc}</p>
            </div>
            <span className="text-sm" style={{ color: "#3a4a3c", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersSection() {
  const roles = [
    { role: "Pharmacist (RPh)", desc: "Full system access, verification, clinical decisions", color: "#5a4a78", bg: "rgba(120,80,160,0.12)" },
    { role: "Pharmacy Tech", desc: "Fill prescriptions, compound, manage inventory", color: "#2c5e7a", bg: "rgba(56,109,140,0.12)" },
    { role: "Shipping Clerk", desc: "Pack and ship orders, manage deliveries", color: "#2c5e7a", bg: "rgba(56,109,140,0.18)" },
    { role: "Billing Specialist", desc: "Claims processing, payments, insurance", color: "#1f5a3a", bg: "rgba(31,90,58,0.14)" },
    { role: "Cashier", desc: "POS transactions, patient pickup", color: "#8a5a17", bg: "rgba(212,138,40,0.14)" },
    { role: "Admin", desc: "System configuration, user management", color: "#9a2c1f", bg: "rgba(184,58,47,0.10)" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: "#0f2e1f", fontWeight: 600 }}>
            Users & Roles
          </h2>
          <p className="text-xs" style={{ color: "#7a8a78" }}>Manage staff accounts, roles, and permissions</p>
        </div>
        <Link
          href="/users"
          className="inline-flex items-center gap-1 rounded-md font-semibold no-underline transition-colors"
          style={{
            backgroundColor: "#1f5a3a",
            color: "#ffffff",
            border: "1px solid #1f5a3a",
            padding: "5px 11px",
            fontSize: 12,
          }}
        >
          Manage Users <ChevronRight size={14} />
        </Link>
      </div>
      <div className="space-y-0">
        {roles.map((r) => (
          <div key={r.role} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid #ede6d6" }}>
            <span
              className="inline-flex items-center"
              style={{
                backgroundColor: r.bg,
                color: r.color,
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: 999,
              }}
            >
              {r.role}
            </span>
            <span className="text-xs" style={{ color: "#5a6b58" }}>{r.desc}</span>
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
      eyebrow="Administration"
      title="Settings"
      subtitle="Pharmacy configuration, users, and system settings"
    >
      {/* Sidebar + Content */}
      <div
        className="flex gap-0 rounded-lg overflow-hidden"
        style={{ border: "1px solid #e3ddd1", minHeight: "calc(100vh - 240px)", backgroundColor: "#ffffff" }}
      >
        {/* Sidebar */}
        <nav
          className="w-56 flex-shrink-0 p-2"
          style={{ backgroundColor: "#faf8f4", borderRight: "1px solid #e3ddd1" }}
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active && !s.href;
            return (
              <button
                key={s.id}
                onClick={() => handleSectionClick(s)}
                className="w-full flex items-center gap-2.5 rounded-md text-left transition-all mb-0.5"
                style={{
                  backgroundColor: isActive ? "#1f5a3a" : "transparent",
                  color: isActive ? "#ffffff" : "#3a4a3c",
                  fontWeight: isActive ? 600 : 500,
                  padding: "8px 11px",
                  fontSize: 13,
                }}
              >
                <Icon size={15} style={{ opacity: isActive ? 1 : 0.75 }} />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 p-6" style={{ backgroundColor: "#ffffff" }}>
          {renderContent()}
        </div>
      </div>
    </PageShell>
  );
}
