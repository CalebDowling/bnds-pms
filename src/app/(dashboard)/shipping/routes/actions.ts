"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  optimizeRoute,
  type RouteStop,
  type OptimizedRoute,
} from "@/lib/delivery/route-optimizer";

// ── Types ──────────────────────────────────────────────────────

export interface TodayDelivery {
  shipmentId: string;
  patientName: string;
  patientMrn: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  items: string[];
  status: string;
  carrier: string;
  requiresSignature: boolean;
  requiresColdChain: boolean;
}

export interface RouteRecord {
  id: string;
  routeName: string;
  routeDate: string;
  driverName: string | null;
  driverId: string | null;
  status: string;
  stopCount: number;
  deliveredCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DriverOption {
  id: string;
  name: string;
}

// ── Server Actions ─────────────────────────────────────────────

/**
 * Fetch all pending/packed/shipped shipments for today's delivery.
 * These are shipments that need to go out today.
 */
export async function getTodayDeliveries(): Promise<TodayDelivery[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get shipments that are pending, packed, or shipped (not yet delivered)
  const shipments = await prisma.shipment.findMany({
    where: {
      status: { in: ["pending", "packed", "shipped", "in_transit"] },
    },
    include: {
      patient: {
        select: { firstName: true, lastName: true, mrn: true },
      },
      address: {
        select: { line1: true, city: true, state: true, zip: true },
      },
      packingList: {
        include: {
          items: {
            include: {
              fill: {
                include: {
                  prescription: {
                    select: {
                      item: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return shipments.map((s) => ({
    shipmentId: s.id,
    patientName: `${s.patient.lastName}, ${s.patient.firstName}`,
    patientMrn: s.patient.mrn,
    address: s.address
      ? {
          line1: s.address.line1,
          city: s.address.city,
          state: s.address.state,
          zip: s.address.zip,
        }
      : null,
    items:
      s.packingList?.items.map(
        (item) => item.fill.prescription.item?.name ?? "Compound"
      ) ?? [],
    status: s.status,
    carrier: s.carrier,
    requiresSignature: s.requiresSignature,
    requiresColdChain: s.requiresColdChain,
  }));
}

/**
 * Run route optimization on a set of shipment IDs.
 */
export async function optimizeDeliveryRoute(
  shipmentIds: string[]
): Promise<OptimizedRoute> {
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds } },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
      packingList: {
        include: {
          items: {
            include: {
              fill: {
                include: {
                  prescription: {
                    select: { item: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const stops: RouteStop[] = shipments
    .filter((s) => s.address) // skip shipments without address
    .map((s, idx) => ({
      id: s.id,
      patientName: `${s.patient.lastName}, ${s.patient.firstName}`,
      address: `${s.address!.line1}, ${s.address!.city}, ${s.address!.state} ${s.address!.zip}`,
      line1: s.address!.line1,
      city: s.address!.city,
      state: s.address!.state,
      zip: s.address!.zip,
      items:
        s.packingList?.items.map(
          (item) => item.fill.prescription.item?.name ?? "Compound"
        ) ?? [],
      sortOrder: idx + 1,
      status: "pending" as const,
    }));

  return optimizeRoute(stops);
}

/**
 * Create or update a DeliveryRoute in the database.
 */
export async function saveRoute(
  routeName: string,
  stops: RouteStop[],
  driverId?: string
): Promise<string> {
  const route = await prisma.deliveryRoute.create({
    data: {
      routeName,
      routeDate: new Date(),
      driverId: driverId || null,
      status: "planned",
    },
  });

  // Create delivery records for each stop
  for (const stop of stops) {
    // Look up the shipment to get patient and address IDs
    const shipment = await prisma.shipment.findUnique({
      where: { id: stop.id },
      select: { patientId: true, addressId: true },
    });

    if (shipment && shipment.addressId) {
      await prisma.delivery.create({
        data: {
          routeId: route.id,
          patientId: shipment.patientId,
          addressId: shipment.addressId,
          status: "pending",
          driverId: driverId || null,
          sortOrder: stop.sortOrder,
        },
      });
    }
  }

  revalidatePath("/shipping/routes");
  return route.id;
}

/**
 * Assign a driver to a route.
 */
export async function assignDriver(
  routeId: string,
  driverId: string
): Promise<void> {
  await prisma.deliveryRoute.update({
    where: { id: routeId },
    data: { driverId },
  });

  // Also update all deliveries on the route
  await prisma.delivery.updateMany({
    where: { routeId },
    data: { driverId },
  });

  revalidatePath("/shipping/routes");
}

/**
 * Start a route -- mark it as active with a start timestamp.
 */
export async function startRoute(routeId: string): Promise<void> {
  await prisma.deliveryRoute.update({
    where: { id: routeId },
    data: {
      status: "active",
      startedAt: new Date(),
    },
  });

  revalidatePath("/shipping/routes");
}

/**
 * Get route history -- past completed and active routes.
 */
export async function getRouteHistory(): Promise<RouteRecord[]> {
  const routes = await prisma.deliveryRoute.findMany({
    include: {
      driver: { select: { firstName: true, lastName: true } },
      deliveries: { select: { status: true } },
    },
    orderBy: { routeDate: "desc" },
    take: 50,
  });

  return routes.map((r) => ({
    id: r.id,
    routeName: r.routeName,
    routeDate: r.routeDate.toISOString(),
    driverName: r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : null,
    driverId: r.driverId,
    status: r.status,
    stopCount: r.deliveries.length,
    deliveredCount: r.deliveries.filter((d) => d.status === "delivered").length,
    startedAt: r.startedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

/**
 * Get available drivers (active users with delivery capability).
 */
export async function getDrivers(): Promise<DriverOption[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
  }));
}

/**
 * Store an optimized route as a StoreSetting (JSON) so it persists
 * across page reloads during the planning session.
 */
export async function saveRoutePlan(
  route: OptimizedRoute
): Promise<void> {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) return;

  await prisma.storeSetting.upsert({
    where: {
      storeId_settingKey: {
        storeId: store.id,
        settingKey: "current_route_plan",
      },
    },
    update: {
      settingValue: JSON.stringify(route),
      updatedAt: new Date(),
    },
    create: {
      storeId: store.id,
      settingKey: "current_route_plan",
      settingValue: JSON.stringify(route),
      settingType: "json",
    },
  });
}

/**
 * Load the current route plan from StoreSetting.
 */
export async function loadRoutePlan(): Promise<OptimizedRoute | null> {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) return null;

  const setting = await prisma.storeSetting.findUnique({
    where: {
      storeId_settingKey: {
        storeId: store.id,
        settingKey: "current_route_plan",
      },
    },
  });

  if (!setting) return null;
  return JSON.parse(setting.settingValue) as OptimizedRoute;
}
