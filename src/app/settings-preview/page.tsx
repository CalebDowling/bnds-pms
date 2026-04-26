"use client";

import { useState } from "react";
import {
  Building2, Users, Shield, Printer, Cpu, Bell, Link2, QrCode, CreditCard,
  ClipboardList, Phone, ChevronDown, ChevronRight, Settings, FileText,
  AlertTriangle, Database, Wifi, Mail,
} from "lucide-react";

const SECTIONS = [
  { id: "pharmacy", label: "Pharmacy Info", icon: Building2, description: "Store details, NPI, DEA, address, contact" },
  { id: "users", label: "Users & Roles", icon: Users, description: "Staff accounts, permissions, role management" },
  { id: "security", label: "Security", icon: Shield, description: "2FA, IP allowlist, session settings" },
  { id: "print", label: "Print Templates", icon: Printer, description: "Rx labels, batch records, shipping labels" },
  { id: "hardware", label: "Hardware", icon: Cpu, description: "Scanners, scales, label printers, terminals" },
  { id: "alerts", label: "Alerts", icon: Bell, description: "Low stock, expiring lots, claim rejections" },
  { id: "integrations", label: "Integrations", icon: Link2, description: "SureScripts, Change Healthcare, Keragon" },
  { id: "widget", label: "Web Widget", icon: QrCode, description: "Embeddable refill widget, API keys" },
  { id: "fsa", label: "FSA / HSA", icon: CreditCard, description: "Item eligibility, IIAS compliance, MCC" },
  { id: "audit", label: "Audit Log", icon: ClipboardList, description: "System activity, user actions, PHI access" },
  { id: "blocked", label: "Blocked Numbers", icon: Phone, description: "Phone screening, unwanted callers" },
  { id: "notifications", label: "Notifications", icon: Mail, description: "Email, SMS, in-app notification preferences" },
];

const SAMPLE_FIELDS = [
  { label: "Pharmacy Name", value: "Boudreaux's Compounding Pharmacy" },
  { label: "NPI", value: "1234567890" },
  { label: "NCPDP", value: "1234567" },
  { label: "DEA", value: "BN1234567" },
  { label: "State License", value: "PH-12345 (Louisiana)" },
  { label: "Phone", value: "(337) 555-1234" },
  { label: "Fax", value: "(337) 555-5678" },
  { label: "Address", value: "123 Main Street, Lake Charles, LA 70601" },
];

function SectionContent({ section }: { section: typeof SECTIONS[0] }) {
  const Icon = section.icon;
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: "#40721D" }}>
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#1a1a1a" }}>{section.label}</h2>
          <p className="text-xs" style={{ color: "#6b6b6b" }}>{section.description}</p>
        </div>
      </div>
      <div className="space-y-3">
        {SAMPLE_FIELDS.map((f) => (
          <div key={f.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#e8e0d4" }}>
            <span className="text-sm font-medium" style={{ color: "#4a4a4a" }}>{f.label}</span>
            <span className="text-sm" style={{ color: "#1a1a1a" }}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Layout A: Sidebar Navigation ──────────────────────────────────
function LayoutSidebar() {
  const [active, setActive] = useState("pharmacy");
  const section = SECTIONS.find((s) => s.id === active)!;
  return (
    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#d0c8b8", minHeight: 500 }}>
      <div className="w-56 flex-shrink-0 border-r p-2" style={{ backgroundColor: "#F5F0E8", borderColor: "#d0c8b8" }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === active;
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all mb-0.5"
              style={{
                backgroundColor: isActive ? "#40721D" : "transparent",
                color: isActive ? "#fff" : "#4a4a4a",
                fontWeight: isActive ? 600 : 400,
              }}>
              <Icon size={16} />
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 p-6" style={{ backgroundColor: "#fff" }}>
        <SectionContent section={section} />
      </div>
    </div>
  );
}

// ─── Layout B: Tabbed Sections ─────────────────────────────────────
function LayoutTabs() {
  const [active, setActive] = useState("pharmacy");
  const section = SECTIONS.find((s) => s.id === active)!;
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#d0c8b8", minHeight: 500 }}>
      <div className="flex overflow-x-auto border-b px-2 pt-2" style={{ backgroundColor: "#F5F0E8", borderColor: "#d0c8b8" }}>
        {SECTIONS.map((s) => {
          const isActive = s.id === active;
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              className="px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-all flex-shrink-0"
              style={{
                backgroundColor: isActive ? "#fff" : "transparent",
                color: isActive ? "#40721D" : "#6b6b6b",
                borderBottom: isActive ? "2px solid #40721D" : "2px solid transparent",
                fontWeight: isActive ? 700 : 400,
              }}>
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="p-6" style={{ backgroundColor: "#fff" }}>
        <SectionContent section={section} />
      </div>
    </div>
  );
}

// ─── Layout C: Category Cards ──────────────────────────────────────
function LayoutCards() {
  const [selected, setSelected] = useState<string | null>(null);
  if (selected) {
    const section = SECTIONS.find((s) => s.id === selected)!;
    return (
      <div className="rounded-xl border p-6" style={{ borderColor: "#d0c8b8", backgroundColor: "#fff", minHeight: 500 }}>
        <button onClick={() => setSelected(null)} className="text-sm mb-4 flex items-center gap-1" style={{ color: "#40721D" }}>
          <ChevronRight size={14} className="rotate-180" /> Back to Settings
        </button>
        <SectionContent section={section} />
      </div>
    );
  }
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: "#d0c8b8", backgroundColor: "#F5F0E8", minHeight: 500 }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: "#1a1a1a" }}>Settings</h2>
      <div className="grid grid-cols-3 gap-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSelected(s.id)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all hover:shadow-md"
              style={{ backgroundColor: "#fff", borderColor: "#d0c8b8" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "#40721D" }}>
                <Icon size={20} />
              </div>
              <span className="text-xs font-semibold" style={{ color: "#1a1a1a" }}>{s.label}</span>
              <span className="text-[10px] leading-tight" style={{ color: "#6b6b6b" }}>{s.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Layout D: Accordion ───────────────────────────────────────────
function LayoutAccordion() {
  const [open, setOpen] = useState<Set<string>>(new Set(["pharmacy"]));
  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#d0c8b8", backgroundColor: "#fff", minHeight: 500 }}>
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isOpen = open.has(s.id);
        return (
          <div key={s.id} className="border-b" style={{ borderColor: "#e8e0d4" }}>
            <button onClick={() => toggle(s.id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left transition-all"
              style={{ backgroundColor: isOpen ? "#F5F0E8" : "#fff" }}>
              <Icon size={18} style={{ color: "#40721D" }} />
              <span className="flex-1 text-sm font-semibold" style={{ color: "#1a1a1a" }}>{s.label}</span>
              <span className="text-[10px]" style={{ color: "#6b6b6b" }}>{s.description}</span>
              <ChevronDown size={16} style={{ color: "#6b6b6b", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
            </button>
            {isOpen && (
              <div className="px-5 pb-4 pt-2">
                <div className="space-y-2">
                  {SAMPLE_FIELDS.map((f) => (
                    <div key={f.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "#f0ebe3" }}>
                      <span className="text-xs font-medium" style={{ color: "#4a4a4a" }}>{f.label}</span>
                      <span className="text-xs" style={{ color: "#1a1a1a" }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function SettingsPreviewPage() {
  const [layout, setLayout] = useState<"sidebar" | "tabs" | "cards" | "accordion">("sidebar");

  return (
    <div style={{ backgroundColor: "#E8DFD0", minHeight: "100vh", padding: "24px" }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#1a1a1a" }}>Settings Layout Preview</h1>
        <p className="text-sm mb-6" style={{ color: "#6b6b6b" }}>Click each option to see how it looks with the Boudreaux&apos;s theme.</p>

        <div className="flex gap-2 mb-6">
          {[
            { id: "sidebar" as const, label: "A: Sidebar Navigation" },
            { id: "tabs" as const, label: "B: Tabbed Sections" },
            { id: "cards" as const, label: "C: Category Cards" },
            { id: "accordion" as const, label: "D: Accordion" },
          ].map((opt) => (
            <button key={opt.id} onClick={() => setLayout(opt.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: layout === opt.id ? "#40721D" : "#fff",
                color: layout === opt.id ? "#fff" : "#4a4a4a",
                border: `1px solid ${layout === opt.id ? "#40721D" : "#d0c8b8"}`,
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {layout === "sidebar" && <LayoutSidebar />}
        {layout === "tabs" && <LayoutTabs />}
        {layout === "cards" && <LayoutCards />}
        {layout === "accordion" && <LayoutAccordion />}
      </div>
    </div>
  );
}
