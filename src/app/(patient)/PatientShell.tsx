"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PatientShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/patient");
          return;
        }

        // Get user metadata
        const user = session.user;
        const firstName = user.user_metadata?.firstName || user.email?.split("@")[0] || "Patient";
        setUserName(firstName);
      } catch (error) {
        console.error("Session check error:", error);
        router.push("/patient");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/patient");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin mx-auto text-[#40721D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.webp" alt="Boudreaux's Pharmacy" className="h-9 sm:h-10 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-gray-900">
                Boudreaux&apos;s Pharmacy
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Patient Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600 hidden sm:block">
              Welcome, <span className="font-semibold">{userName}</span>
            </p>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/50 backdrop-blur-sm sticky top-[60px] sm:top-[68px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
            <Link
              href="/patient/dashboard"
              className="py-4 px-2 sm:px-1 border-b-2 border-transparent text-xs sm:text-sm font-medium text-gray-600 hover:text-[#40721D] hover:border-[#40721D] transition-colors whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link
              href="/patient/prescriptions"
              className="py-4 px-2 sm:px-1 border-b-2 border-transparent text-xs sm:text-sm font-medium text-gray-600 hover:text-[#40721D] hover:border-[#40721D] transition-colors whitespace-nowrap"
            >
              Prescriptions
            </Link>
            <Link
              href="/patient/refills"
              className="py-4 px-2 sm:px-1 border-b-2 border-transparent text-xs sm:text-sm font-medium text-gray-600 hover:text-[#40721D] hover:border-[#40721D] transition-colors whitespace-nowrap"
            >
              Refills
            </Link>
            <Link
              href="/patient/messages"
              className="py-4 px-2 sm:px-1 border-b-2 border-transparent text-xs sm:text-sm font-medium text-gray-600 hover:text-[#40721D] hover:border-[#40721D] transition-colors whitespace-nowrap"
            >
              Messages
            </Link>
            <Link
              href="/patient/profile"
              className="py-4 px-2 sm:px-1 border-b-2 border-transparent text-xs sm:text-sm font-medium text-gray-600 hover:text-[#40721D] hover:border-[#40721D] transition-colors whitespace-nowrap"
            >
              Profile
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-600">
          <p className="font-medium">
            Boudreaux&apos;s New Drug Store Pharmacy | Patient Portal
          </p>
          <p className="mt-2 text-xs text-gray-500">
            For support, contact us at (337) 233-8468
          </p>
        </div>
      </footer>
    </div>
  );
}
