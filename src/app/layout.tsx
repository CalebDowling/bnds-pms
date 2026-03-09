import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
