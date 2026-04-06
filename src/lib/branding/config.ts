/**
 * Central brand configuration for Boudreaux's New Drug Store
 * Used across all communication templates, UI, and print materials
 */

export const BRAND = {
  name: "Boudreaux's New Drug Store",
  shortName: "BNDS",
  tagline: "Your Trusted Compounding Pharmacy",
  logoUrl: "/logo.webp",
  publicLogoUrl: "https://www.bndsrxportal.com/logo.webp",

  colors: {
    primary: "#40721d",
    primaryLight: "#5a9f2a",
    primaryDark: "#2d5114",
    accent: "#14b8a6",
    danger: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
    info: "#3b82f6",
    lightBg: "#f0f5e6",
    lightBorder: "#e5edda",
    textPrimary: "#333333",
    textSecondary: "#666666",
    textLight: "#999999",
  },

  contact: {
    phone: "(337) 234-5678",
    fax: "(337) 234-5679",
    email: "info@boudreauxsnewdrug.com",
    website: "https://boudreauxsnewdrug.com",
    portalUrl: "https://www.bndsrxportal.com",
    address: {
      street: "1234 Main Street",
      city: "Lafayette",
      state: "LA",
      zip: "70501",
    },
    fullAddress: "1234 Main Street, Lafayette, LA 70501",
  },

  hours: {
    weekday: "Mon-Fri: 9:00 AM - 6:00 PM",
    saturday: "Sat: 9:00 AM - 1:00 PM",
    sunday: "Sun: Closed",
  },

  social: {
    facebook: "https://facebook.com/boudreauxsnewdrug",
  },

  legal: {
    npi: "1234567890",
    licenseNumber: "PH-12345",
    deaNumber: "AB1234567",
  },

  typography: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontFamilyMono: "'Courier New', monospace",
  },
} as const;

/**
 * Helper function to get full address string
 */
export function getFullAddress(): string {
  const { street, city, state, zip } = BRAND.contact.address;
  return `${street}, ${city}, ${state} ${zip}`;
}

/**
 * Helper function to get pharmacy hours summary
 */
export function getPharmacyHours(): string {
  return `${BRAND.hours.weekday}\n${BRAND.hours.saturday}\n${BRAND.hours.sunday}`;
}
