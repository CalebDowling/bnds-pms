import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QueueBar from "@/components/dashboard/QueueBar";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import RealtimeProvider from "@/components/providers/RealtimeProvider";
import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import SessionTimeoutProvider from "@/components/providers/SessionTimeoutProvider";
import ToastContainer from "@/components/ui/ToastContainer";
import ToastProvider from "@/components/providers/ToastProvider";
import ShadowModeBanner from "@/components/dashboard/ShadowModeBanner";
import CommandPalette from "@/components/ui/CommandPalette";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
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
      <ToastProvider>
        <KeyboardShortcutsProvider>
          <SessionTimeoutProvider>
            <div className="min-h-screen bg-[var(--page-bg)]">
              <ShadowModeBanner />
              <DashboardHeader />
              <QueueBar />
              <DashboardSearch />
              <CommandPalette />
              <Breadcrumbs />
              <main id="main-content" className="p-0" role="main">
                <RealtimeProvider>{children}</RealtimeProvider>
              </main>
              <div aria-live="polite" aria-atomic="true">
                <ToastContainer />
              </div>
            </div>
          </SessionTimeoutProvider>
        </KeyboardShortcutsProvider>
      </ToastProvider>
    </PermissionsProvider>
  );
}
