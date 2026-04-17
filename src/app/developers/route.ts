import { ApiReference } from "@scalar/nextjs-api-reference";

/**
 * /developers — Scalar-rendered API reference for third-party integrators.
 *
 * Pulls the OpenAPI spec from /api/openapi.json and renders a beautiful,
 * interactive docs site with try-it console, code samples (cURL / JS /
 * Python / Go / Ruby), search, and category navigation.
 *
 * Public page — no auth required to view documentation.
 */

export const GET = ApiReference({
  theme: "default",
  layout: "modern",
  pageTitle: "BNDS API Reference",
  metaData: {
    title: "BNDS API Reference — Boudreaux's New Drug Store",
    description:
      "Public REST API for third-party integrations with Boudreaux's Pharmacy Management System.",
  },
  // Scalar fetches this URL client-side to render the spec
  url: "/api/openapi.json",
  // Custom theme CSS to match the BNDS sage palette
  customCss: `
    :root {
      --scalar-color-1: #0f260b;
      --scalar-color-2: #415c43;
      --scalar-color-3: #5d7a64;
      --scalar-color-accent: #415c43;
      --scalar-background-1: #cbddd1;
      --scalar-background-2: #e2ede6;
      --scalar-background-3: #d6e5da;
      --scalar-background-accent: #415c4315;
      --scalar-border-color: #b8cfc0;
      --scalar-sidebar-background-1: #e2ede6;
      --scalar-sidebar-item-hover-background: #d6e5da;
      --scalar-sidebar-item-active-background: #415c43;
      --scalar-sidebar-color-1: #0f260b;
      --scalar-sidebar-color-2: #415c43;
      --scalar-sidebar-color-active: #ffffff;
      --scalar-sidebar-search-background: #ffffff;
      --scalar-sidebar-search-border-color: #b8cfc0;
      --scalar-button-1-color: #ffffff;
      --scalar-button-1: #415c43;
      --scalar-button-1-hover: #0f260b;
      --scalar-radius: 6px;
      --scalar-radius-lg: 10px;
      --scalar-font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .dark-mode {
      --scalar-color-1: #e2ede6;
      --scalar-color-2: #b8cfc0;
      --scalar-color-3: #719776;
      --scalar-color-accent: #719776;
      --scalar-background-1: #0f1a12;
      --scalar-background-2: #15241a;
      --scalar-background-3: #1c3022;
      --scalar-border-color: #2d4734;
      --scalar-sidebar-background-1: #15241a;
    }
  `,
  hideDownloadButton: false,
  searchHotKey: "k",
  defaultOpenAllTags: false,
});
