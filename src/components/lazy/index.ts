"use client";

import dynamic from "next/dynamic";
import React from "react";

/**
 * Lazy-loaded versions of heavy dashboard components.
 * These components are loaded on-demand rather than bundled with the main app.
 * This improves initial page load time and reduces bundle size.
 */

// Phone Dialer - Heavy interactive component used in dashboard
export const LazyPhoneDialer = dynamic(
  () =>
    import("@/components/dashboard/PhoneDialer").then(
      (mod) => mod.default
    ),
  {
    ssr: false,
    loading: () =>
      React.createElement("div", {
        className:
          "animate-pulse bg-gray-100 rounded-xl h-[400px] w-full",
      }),
  }
);

// Barcode Scanner - Requires camera/media access, heavy library
export const LazyBarcodeScanner = dynamic(
  () =>
    import("@/components/ui/BarcodeScanner").then(
      (mod) => mod.BarcodeScanner
    ),
  {
    ssr: false,
    loading: () =>
      React.createElement("div", {
        className:
          "animate-pulse bg-gray-100 rounded-xl h-[300px] w-full",
      }),
  }
);

// Shortcuts Modal - Rarely used, heavy component with many event listeners
export const LazyShortcutsModal = dynamic(
  () =>
    import("@/components/ui/ShortcutsModal"),
  {
    ssr: false,
  }
);

// Optional: Add more lazy-loaded components here as needed
// export const LazyReportsExport = dynamic(
//   () =>
//     import("@/components/dashboard/ReportsExportButton").then(
//       (mod) => mod.default
//     ),
//   {
//     ssr: false,
//     loading: () =>
//       React.createElement("div", {
//         className: "animate-pulse bg-gray-100 rounded-xl h-12 w-32",
//       }),
//   }
// );
