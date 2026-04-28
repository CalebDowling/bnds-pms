"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Detect Next.js's "Server Action <hash> was not found on the server"
  // error. This fires when the build hash changes (a deploy landed)
  // while a tab was already open — the cached server-action IDs in the
  // page no longer resolve on the new build. The raw framework message
  // and link to nextjs.org are hostile to a pharmacist; what they
  // actually need is "refresh the page and try again." reset() doesn't
  // help here because it just retries the same stale action ID.
  const message = error?.message ?? "";
  const isStaleAction =
    /Server Action.*was not found on the server/i.test(message) ||
    /failed-to-find-server-action/i.test(message);

  useEffect(() => {
    // Log the error to Sentry. Stale-action errors are still worth
    // tracking because a high rate suggests deploy frequency is
    // hurting users.
    Sentry.captureException(error);
  }, [error]);

  if (isStaleAction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Page is out of date
            </h1>
            <p className="text-gray-600 mb-6">
              The app was updated while this tab was open. Please refresh
              to load the latest version, then try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#40721d] hover:bg-[#2f5517] text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
              Refresh now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
            An error occurred while loading this page. Our team has been
            notified.
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 p-2 rounded">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => reset()}
              className="flex-1 bg-[#40721d] hover:bg-[#2f5517] text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
