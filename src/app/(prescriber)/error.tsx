"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

export default function PrescriberError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="antialiased">
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-[#40721D]/10 mb-4">
                <svg
                  className="h-7 w-7 text-[#40721D]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9.303-6.552a3 3 0 00-4.243-4.243m0 0L9.757 2.757m4.243 4.243L9.757 2.757m0 4.243a3 3 0 00-4.243 4.243m4.243-4.243l4.243 4.243"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We&apos;ve been notified of this issue and our team is working
                to fix it.
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mb-6 font-mono bg-gray-50 p-3 rounded border border-gray-200">
                  Error ID: {error.digest}
                </p>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => reset()}
                  className="w-full bg-[#40721D] hover:bg-[#2f5517] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200"
                >
                  Try Again
                </button>
                <Link
                  href="/portal/dashboard"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
