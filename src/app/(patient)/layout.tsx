import React from "react";
import PatientShell from "./PatientShell";

export const metadata = {
  title: "Patient Portal | Boudreaux's Pharmacy",
  description: "Manage your prescriptions and health information",
};

export const dynamic = "force-dynamic";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return <PatientShell>{children}</PatientShell>;
}
