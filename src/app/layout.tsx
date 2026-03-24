import type { Metadata } from "next";
import "./globals.css";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";

export const metadata: Metadata = {
  title: "BNDS Pharmacy Management System",
  description: "Boudreaux's Compounding Pharmacy - Management System",
  manifest: "/manifest.json",
  themeColor: "#40721D",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BNDS PMS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/logo.webp" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <SentryErrorBoundary>{children}</SentryErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
