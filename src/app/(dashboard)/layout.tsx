import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayoutShell from "@/components/layout/SidebarLayoutShell";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import RealtimeProvider from "@/components/providers/RealtimeProvider";
import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import SessionTimeoutProvider from "@/components/providers/SessionTimeoutProvider";
import ToastContainer from "@/components/ui/ToastContainer";
import ToastProvider from "@/components/providers/ToastProvider";
// import ShadowModeBanner from "@/components/dashboard/ShadowModeBanner"; // Hidden while DRX sync is off (2026-04-17)
import CommandPalette from "@/components/ui/CommandPalette";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import PageTransition from "@/components/ui/PageTransition";
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
          <SessionTimeoutProvider timeoutMinutes={120} warningMinutes={5}>
            <div className="min-h-screen bg-[var(--page-bg)]">
              {/* <ShadowModeBanner /> — hidden while DRX sync is off (2026-04-17) */}
              <SidebarLayoutShell>
                <DashboardSearch />
                <CommandPalette />
                <Breadcrumbs />
                <main id="main-content" className="p-0" role="main">
                  <RealtimeProvider>
                    <PageTransition>{children}</PageTransition>
                  </RealtimeProvider>
                </main>
                <FloatingActionButton />
                <div aria-live="polite" aria-atomic="true">
                  <ToastContainer />
                </div>
              </SidebarLayoutShell>
              <MobileBottomNav />
            </div>
          </SessionTimeoutProvider>
        </KeyboardShortcutsProvider>
      </ToastProvider>
    </PermissionsProvider>
  );
}
