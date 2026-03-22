import { Suspense } from "react";
import BlockedNumbersClient from "./client";
import { getBlockedNumbers } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

async function BlockedNumbersContent() {
  const numbers = await getBlockedNumbers();

  return <BlockedNumbersClient initialNumbers={numbers} />;
}

export default function BlockedNumbersPage() {
  return (
    <PermissionGuard resource="billing" action="admin">
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <BlockedNumbersContent />
      </Suspense>
    </PermissionGuard>
  );
}
