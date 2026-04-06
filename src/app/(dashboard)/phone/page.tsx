"use client";

import { useState } from "react";
import PhoneDialer from "@/components/dashboard/PhoneDialer";
import { PageCard, PageHeader } from "@/components/ui/PageCard";

export const dynamic = "force-dynamic";

interface CallHistory {
  id: string;
  name: string;
  number: string;
  duration: number;
  timestamp: Date;
  direction: "inbound" | "outbound";
}

interface Contact {
  id: string;
  name: string;
  number: string;
  department?: string;
}

// Mock data for call history
const MOCK_CALL_HISTORY: CallHistory[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    number: "(555) 123-4567",
    duration: 245,
    timestamp: new Date(Date.now() - 3600000),
    direction: "inbound"
  },
  {
    id: "2",
    name: "Patient: Michael Smith",
    number: "(555) 234-5678",
    duration: 480,
    timestamp: new Date(Date.now() - 7200000),
    direction: "outbound"
  },
  {
    id: "3",
    name: "Insurance: BCBS",
    number: "(555) 345-6789",
    duration: 360,
    timestamp: new Date(Date.now() - 14400000),
    direction: "inbound"
  },
  {
    id: "4",
    name: "Dr. Robert Chen",
    number: "(555) 456-7890",
    duration: 120,
    timestamp: new Date(Date.now() - 21600000),
    direction: "inbound"
  },
  {
    id: "5",
    name: "Patient: Jennifer Lee",
    number: "(555) 567-8901",
    duration: 600,
    timestamp: new Date(Date.now() - 86400000),
    direction: "outbound"
  }
];

// Mock quick contacts
const QUICK_CONTACTS: Contact[] = [
  { id: "1", name: "Front Desk", number: "(555) 900-0001", department: "Main" },
  { id: "2", name: "Pharmacy Manager", number: "(555) 900-0002", department: "Operations" },
  { id: "3", name: "Dr. Reference Line", number: "(555) 900-0003", department: "Prescribers" },
  { id: "4", name: "Insurance Line", number: "(555) 900-0004", department: "Billing" },
  { id: "5", name: "Compounding Lab", number: "(555) 900-0005", department: "Compound" }
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function PhonePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = QUICK_CONTACTS.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.number.includes(searchQuery)
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Phone"
        description="Call management and contact directory"
      />

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Phone Dialer */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <PhoneDialer />
          </div>
        </div>

        {/* Right Column - Call History and Contacts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Call History */}
          <PageCard className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Recent Calls</h2>
              <p className="text-sm text-gray-500 mt-1">Last 5 calls</p>
            </div>

            <div className="space-y-3">
              {MOCK_CALL_HISTORY.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        call.direction === "inbound" ? "bg-blue-500" : "bg-green-500"
                      }`}
                    >
                      {call.direction === "inbound" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 12 14.01 0 4"/><path d="M11 10L0 1h22"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{call.name}</p>
                      <p className="text-xs text-gray-500">{call.number}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-mono text-gray-600">{formatDuration(call.duration)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(call.timestamp)}</p>
                    </div>
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-[#40721d] hover:text-[#40721d]"
                      title="Call"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </PageCard>

          {/* Quick Contacts */}
          <PageCard className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Quick Contacts</h2>
              <p className="text-sm text-gray-500 mt-1">Frequently used numbers</p>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#40721d] focus:border-transparent"
              />
            </div>

            {/* Contacts List */}
            <div className="space-y-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-500">
                        {contact.number}
                        {contact.department && ` • ${contact.department}`}
                      </p>
                    </div>
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-[#40721d]"
                      title="Call"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No contacts found</p>
                </div>
              )}
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
