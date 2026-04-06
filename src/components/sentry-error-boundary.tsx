"use client";

import * as Sentry from "@sentry/nextjs";
import { ReactNode } from "react";

const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
  },
  {
    fallback: (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 1.788a.75.75 0 100 1.5A6.75 6.75 0 1012 3a.75.75 0 00-.75.75v13.5a.75.75 0 001.5 0V16.5"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We've been notified of this issue and are working to fix it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#40721d] hover:bg-[#2f5517] text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    ),
    showDialog: false,
  }
);

export { SentryErrorBoundary };
