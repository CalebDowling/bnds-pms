"use client";

/**
 * Passthrough wrapper — realtime functionality removed.
 * This file exists solely to prevent webpack module resolution errors
 * from Vercel build cache referencing the old import.
 */
export default function IntakeRealtimeWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
  
}
