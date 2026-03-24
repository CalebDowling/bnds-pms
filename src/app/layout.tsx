import type { Metadata } from "next";
import "./globals.css";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";

export const metadata: Metadata = {
  title: "BNDS Pharmacy Management System",
  description: "Boudreaux's Compounding Pharmacy - Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <SentryErrorBoundary>{children}</SentryErrorBoundary>
      </body>
    </html>
  );
}
