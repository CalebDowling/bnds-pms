"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QueueBar from "@/components/dashboard/QueueBar";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import RealtimeProvider from "@/components/providers/RealtimeProvider";
import ToastContainer from "@/components/ui/ToastContainer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <DashboardHeader />
      <QueueBar />
      <DashboardSearch />
      <main className="p-0">
        <RealtimeProvider>{children}</RealtimeProvider>
      </main>
      <ToastContainer />
    </div>
  );
}
