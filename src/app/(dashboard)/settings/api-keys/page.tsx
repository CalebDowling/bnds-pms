import { listApiKeys } from "./actions";
import ApiKeysClient from "./ApiKeysClient";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const keys = await listApiKeys();

  return (
    <PermissionGuard resource="settings" action="write">
      <ApiKeysClient initialKeys={keys} />
    </PermissionGuard>
  );
}
