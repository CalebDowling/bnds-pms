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
    <div className="flex items-center justify-between bg-[var(--card-bg)] px-6 py-2.5 border-b border-[var(--border-light)]">
      <div ref={wrapperRef} className="flex-1 max-w-[600px] relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          className="search-animated w-full py-[9px] px-[14px] pl-9 border border-gray-200 rounded-xl text-[13px] text-[var(--text-secondary)] bg-white font-[Inter,sans-serif] focus:outline-none focus:border-[#40721d]"
          placeholder="Search patients, doctors, or items..."
          autoComplete="off"
          onFocus={() => setFocused(true)}
        />
        <span className="kbd-badge absolute right-2.5 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-400 border border-gray-200">
          Ctrl+K
        </span>
        {focused && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.1)] z-[100] overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500 px-3.5 pt-2.5 pb-1.5">Recent Searches</div>
            {[
              { icon: "Pt", name: "Destini Broussard", type: "Patient" },
              { icon: "Pt", name: "Mary Johnson", type: "Patient" },
              { icon: "Rx", name: "Rx# 714367", type: "Prescription" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-gray-50 transition-colors text-[13px] text-[var(--text-primary)]">
                <div className="w-7 h-7 rounded-full bg-[#40721d] text-white flex items-center justify-center text-xs font-bold">{item.icon}</div>
                <div>{item.name}</div>
                <div className="text-[11px] text-gray-400 ml-auto">{item.type}</div>
              </div>
            ))}
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500 px-3.5 pt-2.5 pb-1.5 border-t border-gray-200">Frequent</div>
            {[
              { icon: "Dr", name: "Dr. Smith, John", type: "Doctor" },
              { icon: "It", name: "Progesterone USP", type: "Item" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-gray-50 transition-colors text-[13px] text-[var(--text-primary)]">
                <div className="w-7 h-7 rounded-full bg-[#40721d] text-white flex items-center justify-center text-xs font-bold">{item.icon}</div>
                <div>{item.name}</div>
                <div className="text-[11px] text-gray-400 ml-auto">{item.type}</div>
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
            className={`px-3 py-1.5 border-none rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-[#40721d] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
