import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Patient Portal | Boudreaux's Pharmacy",
  description: "Manage your prescriptions and health information",
};

export const dynamic = "force-dynamic";

export default function PatientLayout({
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
              <p className="text-sm text-gray-600">Patient Portal</p>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("patient_token");
              localStorage.removeItem("patient_name");
              window.location.href = "/patient";
            }}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <Link
              href="/patient/dashboard"
              className="py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/patient/prescriptions"
              className="py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors text-sm font-medium"
            >
              My Prescriptions
            </Link>
            <Link
              href="/patient/refills"
              className="py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors text-sm font-medium"
            >
              Refill Request
            </Link>
            <Link
              href="/patient/messages"
              className="py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors text-sm font-medium"
            >
              Messages
            </Link>
            <Link
              href="/patient/profile"
              className="py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors text-sm font-medium"
            >
              My Profile
            </Link>
          </div>
        </div>
      </nav>

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
            Boudreaux's New Drug Store Pharmacy | Patient Portal
          </p>
          <p className="mt-2 text-xs text-gray-500">
            For support, contact us at (555) 123-4567
          </p>
        </div>
      </footer>
    </div>
  );
}
