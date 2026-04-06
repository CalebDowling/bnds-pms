import React from "react";

export const metadata = {
  title: "Prescriber Portal | Boudreaux's Pharmacy",
  description:
    "Submit compound prescription orders to Boudreaux's Compounding Pharmacy",
};

export const dynamic = "force-dynamic";

export default function PrescriberRootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return <>{children}</>;
}
