"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ShipmentFormData = {
  patientId: string;
  carrier: string;
  serviceLevel?: string;
  trackingNumber?: string;
  shippingCost?: number;
  weightOz?: number;
  estimatedDelivery?: string;
  requiresColdChain: boolean;
  requiresSignature: boolean;
  addressId?: string;
};

export async function getShipments({
  search = "",
  status = "all",
  page = 1,
  limit = 25,
}: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.ShipmentWhereInput = {};

  if (status && status !== "all") where.status = status;

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { patient: { lastName: { contains: search, mode: "insensitive" } } },
      { patient: { firstName: { contains: search, mode: "insensitive" } } },
      { patient: { mrn: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        address: { select: { line1: true, city: true, state: true, zip: true } },
        shipper: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.shipment.count({ where }),
  ]);

  return { shipments, total, pages: Math.ceil(total / limit), page };
}

export async function getShipment(id: string) {
  return prisma.shipment.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          phoneNumbers: { where: { isPrimary: true }, take: 1 },
          addresses: true,
        },
      },
      address: true,
      shipper: { select: { firstName: true, lastName: true } },
      packingList: {
        include: {
          items: {
            include: {
              fill: {
                include: {
                  prescription: {
                    select: { rxNumber: true, directions: true, item: { select: { name: true, strength: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function createShipment(data: ShipmentFormData) {
  const shipment = await prisma.shipment.create({
    data: {
      patientId: data.patientId,
      carrier: data.carrier,
      serviceLevel: data.serviceLevel || null,
      trackingNumber: data.trackingNumber?.trim() || null,
      shippingCost: data.shippingCost || null,
      weightOz: data.weightOz || null,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : null,
      requiresColdChain: data.requiresColdChain,
      requiresSignature: data.requiresSignature,
      addressId: data.addressId || null,
      status: "pending",
    },
  });

  revalidatePath("/shipping");
  return shipment;
}

export async function updateShipmentStatus(
  id: string,
  status: string,
  userId?: string,
  trackingNumber?: string
) {
  const updateData: Prisma.ShipmentUpdateInput = { status };

  if (status === "shipped") {
    updateData.shipDate = new Date();
    if (userId) updateData.shipper = { connect: { id: userId } };
    if (trackingNumber) updateData.trackingNumber = trackingNumber.trim();
  } else if (status === "delivered") {
    updateData.actualDelivery = new Date();
  }

  const shipment = await prisma.shipment.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/shipping");
  revalidatePath(`/shipping/${id}`);
  return shipment;
}

export async function getShippingStats() {
  const [pending, shipped, delivered, today] = await Promise.all([
    prisma.shipment.count({ where: { status: "pending" } }),
    prisma.shipment.count({ where: { status: "shipped" } }),
    prisma.shipment.count({ where: { status: "delivered" } }),
    prisma.shipment.count({
      where: {
        shipDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return { pending, shipped, delivered, shippedToday: today };
}

export async function createShipmentFromFill(
  fillId: string,
  carrier: string,
  trackingNumber?: string,
  userId?: string
) {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        include: { patient: true },
      },
    },
  });

  if (!fill?.prescription?.patient) {
    throw new Error("Fill or patient not found");
  }

  const patientAddress = await prisma.patientAddress.findFirst({
    where: { patientId: fill.prescription.patientId, isDefault: true },
  });

  const shipment = await prisma.shipment.create({
    data: {
      patientId: fill.prescription.patientId,
      carrier,
      trackingNumber: trackingNumber?.trim() || null,
      status: "pending",
      addressId: patientAddress?.id || null,
      shippedBy: userId || null,
    },
  });

  if (fill.metadata && typeof fill.metadata === "object") {
    const metadata = fill.metadata as Record<string, unknown>;
    await prisma.prescriptionFill.update({
      where: { id: fillId },
      data: {
        metadata: { ...metadata, shipmentId: shipment.id },
      },
    });
  } else {
    await prisma.prescriptionFill.update({
      where: { id: fillId },
      data: {
        metadata: { shipmentId: shipment.id },
      },
    });
  }

  revalidatePath("/shipping");
  return shipment;
}

export async function updateShipmentStatusFromFill(
  fillId: string,
  status: string
) {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
  });

  if (!fill) throw new Error("Fill not found");

  const metadata = fill.metadata as Record<string, unknown> | null;
  const shipmentId = metadata?.shipmentId as string | undefined;

  if (!shipmentId) throw new Error("No shipment associated with this fill");

  const updateData: Prisma.ShipmentUpdateInput = { status };

  if (status === "shipped") {
    updateData.shipDate = new Date();
  } else if (status === "delivered") {
    updateData.actualDelivery = new Date();
  }

  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: updateData,
  });

  revalidatePath("/shipping");
  return shipment;
}
