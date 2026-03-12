"use client";

import { useState, useEffect, useRef } from "react";

export default function DashboardSearch() {
  const [focused, setFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("patients");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const input = wrapperRef.current?.querySelector("input");
        input?.focus();
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const tabs = [
    { id: "patients", label: "Patients" },
    { id: "doctors", label: "Doctors" },
    { id: "items", label: "Items" },
  ];

  return (
    <div className="flex items-center justify-between bg-[var(--card-bg)] px-6 py-2.5 border-b border-[var(--border)]">
      <div ref={wrapperRef} className="flex-1 max-w-[600px] relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          className="w-full py-[9px] px-[14px] pl-9 border border-[var(--border)] rounded-md text-[13px] text-[var(--text-secondary)] bg-[var(--green-50)] font-[Inter,sans-serif] focus:outline-none focus:border-[var(--green-700)] focus:shadow-[0_0_0_3px_rgba(26,127,55,.12)] focus:bg-white"
          placeholder="Search patients, doctors, or items..."
          autoComplete="off"
          onFocus={() => setFocused(true)}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] bg-[var(--green-100)] px-1.5 py-0.5 rounded border border-[var(--border)] font-medium">
          Ctrl+K
        </span>
        {focused && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[var(--border)] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,.1)] z-[100] overflow-hidden">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-3.5 pt-2.5 pb-1.5">Recent Searches</div>
            {[
              { icon: "Pt", name: "Destini Broussard", type: "Patient" },
              { icon: "Pt", name: "Mary Johnson", type: "Patient" },
              { icon: "Rx", name: "Rx# 714367", type: "Prescription" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-[var(--green-50)] transition-colors text-[13px] text-[var(--text-primary)]">
                <div className="w-7 h-7 rounded-full bg-[var(--green-100)] text-[var(--green-700)] flex items-center justify-center text-xs font-bold">{item.icon}</div>
                <div>{item.name}</div>
                <div className="text-[11px] text-[var(--text-muted)] ml-auto">{item.type}</div>
              </div>
            ))}
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-3.5 pt-2.5 pb-1.5 border-t border-[var(--border-light)]">Frequent</div>
            {[
              { icon: "Dr", name: "Dr. Smith, John", type: "Doctor" },
              { icon: "It", name: "Progesterone USP", type: "Item" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-[var(--green-50)] transition-colors text-[13px] text-[var(--text-primary)]">
                <div className="w-7 h-7 rounded-full bg-[var(--green-100)] text-[var(--green-700)] flex items-center justify-center text-xs font-bold">{item.icon}</div>
                <div>{item.name}</div>
                <div className="text-[11px] text-[var(--text-muted)] ml-auto">{item.type}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-[7px] border-none rounded-md text-[13px] font-medium cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--green-700)] text-white"
                : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--green-50)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
