"use client";

import { ToastProvider as Provider } from "@/components/ui/Toast";
import { ReactNode } from "react";

export default function ToastProvider({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}
