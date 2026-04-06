"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  storeDeliveryProof,
  requiresControlledSubstanceVerification,
  type DeliveryProof,
  type GpsCoordinates,
  type IdVerification,
} from "@/lib/delivery/signature-capture";

// ── Types ──────────────────────────────────────────────────────

export interface DeliveryDetail {
  id: string;
  patientName: string;
  patientMrn: string;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zip: string;
  } | null;
  carrier: string;
  trackingNumber: string | null;
  requiresSignature: boolean;
  requiresColdChain: boolean;
  requiresIdVerification: boolean;
  items: Array<{
    rxNumber: string;
    drugName: string;
    strength: string | null;
    quantity: string;
    directions: string | null;
    isControlled: boolean;
  }>;
  status: string;
  notes: string | null;
}

export interface ConfirmDeliveryData {
  signatureBase64: string;
  gpsCoordinates: GpsCoordinates | null;
  photoBase64: string | null;
  notes: string | null;
  deliveredTo: string | null;
  idVerification: IdVerification | null;
}

// ── Server Actions ─────────────────────────────────────────────

/**
 * Fetch shipment details for the driver delivery screen.
 */
export async function getDeliveryDetail(
  shipmentId: string
): Promise<DeliveryDetail | null> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      patient: {
        select: { firstName: true, lastName: true, mrn: true },
      },
      address: {
        select: { line1: true, line2: true, city: true, state: true, zip: true },
      },
      packingList: {
        include: {
          items: {
            include: {
              fill: {
                include: {
                  prescription: {
                    select: {
                      rxNumber: true,
                      directions: true,
                      quantityDispensed: true,
                      item: {
                        select: { name: true, strength: true, isControlled: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!shipment) return null;

  const requiresId = await requiresControlledSubstanceVerification(shipmentId);

  const items =
    shipment.packingList?.items.map((plItem) => ({
      rxNumber: plItem.fill.prescription.rxNumber,
      drugName: plItem.fill.prescription.item?.name ?? "Compound",
      strength: plItem.fill.prescription.item?.strength ?? null,
      quantity: plItem.fill.prescription.quantityDispensed?.toString() ?? "—",
      directions: plItem.fill.prescription.directions ?? null,
      isControlled: plItem.fill.prescription.item?.isControlled ?? false,
    })) ?? [];

  return {
    id: shipment.id,
    patientName: `${shipment.patient.firstName} ${shipment.patient.lastName}`,
    patientMrn: shipment.patient.mrn,
    address: shipment.address
      ? {
          line1: shipment.address.line1,
          line2: shipment.address.line2,
          city: shipment.address.city,
          state: shipment.address.state,
          zip: shipment.address.zip,
        }
      : null,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    requiresSignature: shipment.requiresSignature,
    requiresColdChain: shipment.requiresColdChain,
    requiresIdVerification: requiresId,
    items,
    status: shipment.status,
    notes: null,
  };
}

/**
 * Confirm delivery: save signature, GPS, photo, timestamp,
 * and update shipment status to "delivered".
 */
export async function confirmDelivery(
  shipmentId: string,
  data: ConfirmDeliveryData
): Promise<{ success: boolean; error?: string }> {
  // Validate required fields
  if (!data.signatureBase64) {
    return { success: false, error: "Signature is required" };
  }

  // Check if controlled substance ID verification is needed
  const requiresId = await requiresControlledSubstanceVerification(shipmentId);
  if (requiresId && !data.idVerification) {
    return {
      success: false,
      error: "ID verification is required for controlled substance deliveries",
    };
  }

  const proof: DeliveryProof = {
    shipmentId,
    signatureBase64: data.signatureBase64,
    gpsCoordinates: data.gpsCoordinates,
    photoBase64: data.photoBase64,
    timestamp: new Date().toISOString(),
    notes: data.notes,
    idVerification: data.idVerification,
    deliveredTo: data.deliveredTo,
  };

  const result = await storeDeliveryProof(proof);

  if (result.success) {
    revalidatePath("/shipping");
    revalidatePath(`/shipping/${shipmentId}`);
    revalidatePath(`/shipping/deliver/${shipmentId}`);
  }

  return result;
}
