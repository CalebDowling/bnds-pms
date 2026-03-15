import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QueueBar from "@/components/dashboard/QueueBar";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import RealtimeProvider from "@/components/providers/RealtimeProvider";
import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import ToastContainer from "@/components/ui/ToastContainer";
import { PermissionsMap } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user permissions server-side
  let userPermissions: Record<string, string[]> = {};

  try {
    const user = await getCurrentUser();
    if (user) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });

      // Merge all role permissions
      const mergedPerms: Record<string, string[]> = {};
      for (const ur of userRoles) {
        const rolePerms = (ur.role.permissions as PermissionsMap) || {};
        for (const [resource, actions] of Object.entries(rolePerms)) {
          if (!mergedPerms[resource]) {
            mergedPerms[resource] = [];
          }
          mergedPerms[resource] = [
            ...new Set([...mergedPerms[resource], ...(actions || [])]),
          ];
        }
      }
      userPermissions = mergedPerms;
    }
  } catch {
    // If permission fetch fails, continue with empty permissions
    // PermissionGuard will handle access denial
  }

  return (
    <PermissionsProvider permissions={userPermissions}>
      <div className="min-h-screen bg-[var(--page-bg)]">
        <DashboardHeader />
        <QueueBar />
        <DashboardSearch />
        <main className="p-0">
          <RealtimeProvider>{children}</RealtimeProvider>
        </main>
        <ToastContainer />
      </div>
    </PermissionsProvider>
  );
}
