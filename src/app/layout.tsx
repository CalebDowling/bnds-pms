import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";

// Self-hosted Inter via next/font — eliminates FOUT and loads from our origin
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

// Monospace for Rx numbers, NDCs, timers — paired with Inter
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

// Heritage serif for headings — pairs with Inter for the BNDS PMS redesign
// (forest + leaf greens, warm paper background — see globals.css)
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BNDS Pharmacy Management System",
  description: "Boudreaux's Compounding Pharmacy - Management System",
  manifest: "/manifest.json",
  themeColor: "#1f5a3a",
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`}>
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
