import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getClientIP,
  isIPAllowed,
  parseIPAllowlist,
} from "@/lib/security/ip-allowlist";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    // Return early if not admin
    if (!user || !user.isAdmin) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: "Not an admin user",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get client IP
    const clientIP = getClientIP(request);

    // Get full user record to access storeId
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { storeId: true },
    });

    // Get IP allowlist from store settings
    const store = await prisma.store.findFirst({
      where: fullUser?.storeId ? { id: fullUser.storeId } : {},
    });

    if (!store) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: "Store not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const setting = await prisma.storeSetting.findUnique({
      where: {
        storeId_settingKey: {
          storeId: store.id,
          settingKey: "ip_allowlist",
        },
      },
    });

    const { ips, enabled } = parseIPAllowlist(setting?.settingValue || "{}");

    // If allowlist is disabled, allow access
    if (!enabled) {
      return new Response(
        JSON.stringify({
          allowed: true,
          reason: "IP allowlist is disabled",
          ip: clientIP,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if IP is allowed
    const allowed = isIPAllowed(clientIP, ips);

    return new Response(
      JSON.stringify({
        allowed,
        reason: allowed
          ? "IP is in allowlist"
          : "IP is not in allowlist",
        ip: clientIP,
      }),
      {
        status: allowed ? 200 : 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("IP check error:", error);
    return new Response(
      JSON.stringify({
        allowed: false,
        reason: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
