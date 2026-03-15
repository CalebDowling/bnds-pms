import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Prescriber Portal | Boudreaux's Pharmacy",
  description: "Submit compound prescription orders to Boudreaux's Pharmacy",
};

export default function PrescriberLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#40721D] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Boudreaux's Pharmacy
              </h1>
              <p className="text-sm text-gray-600">Prescriber Portal</p>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("prescriber_token");
              localStorage.removeItem("prescriber_name");
              window.location.href = "/portal";
            }}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-600">
          <p>
            Boudreaux's New Drug Store Pharmacy | Prescriber Portal
          </p>
          <p className="mt-2 text-xs text-gray-500">
            For support, contact us at (555) 123-4567
          </p>
        </div>
      </footer>
    </div>
  );
}
