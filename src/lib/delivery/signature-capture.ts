/**
 * Delivery Proof Utilities
 *
 * Stores delivery proof (signature, GPS, photo, timestamp),
 * generates delivery confirmation summaries, and provides
 * types for the delivery proof workflow.
 */

// ── Types ──────────────────────────────────────────────────────

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // metres
}

export interface IdVerification {
  idType: "driver_license" | "passport" | "state_id" | "military_id" | "other";
  idNumber: string;
  idExpiration?: string;
  verifiedByDriver: boolean;
}

export interface DeliveryProof {
  shipmentId: string;
  signatureBase64: string;
  gpsCoordinates: GpsCoordinates | null;
  photoBase64: string | null;
  timestamp: string; // ISO 8601
  notes: string | null;
  idVerification: IdVerification | null;
  deliveredTo: string | null; // name of person who accepted
}

export interface DeliveryConfirmation {
  shipmentId: string;
  patientName: string;
  address: string;
  deliveredAt: string;
  gpsCoordinates: GpsCoordinates | null;
  hasSignature: boolean;
  hasPhoto: boolean;
  hasIdVerification: boolean;
  driverName: string | null;
  notes: string | null;
}

// ── Storage ────────────────────────────────────────────────────

/**
 * Persist delivery proof to the database via Prisma.
 * Stores the signature as a base64 data-url in the Delivery record,
 * GPS + photo + ID verification in StoreSetting JSON keyed by shipment.
 */
export async function storeDeliveryProof(
  proof: DeliveryProof
): Promise<{ success: boolean; error?: string }> {
  try {
    const { prisma } = await import("@/lib/prisma");

    // Find the shipment
    const shipment = await prisma.shipment.findUnique({
      where: { id: proof.shipmentId },
      include: { patient: true, address: true },
    });

    if (!shipment) {
      return { success: false, error: "Shipment not found" };
    }

    // Update shipment status to delivered
    await prisma.shipment.update({
      where: { id: proof.shipmentId },
      data: {
        status: "delivered",
        actualDelivery: new Date(proof.timestamp),
      },
    });

    // Store extended delivery proof in store settings as JSON
    const store = await prisma.store.findFirst({ where: { isActive: true } });
    if (store) {
      const proofData = {
        signatureBase64: proof.signatureBase64,
        gpsCoordinates: proof.gpsCoordinates,
        photoBase64: proof.photoBase64,
        timestamp: proof.timestamp,
        notes: proof.notes,
        idVerification: proof.idVerification,
        deliveredTo: proof.deliveredTo,
      };

      await prisma.storeSetting.upsert({
        where: {
          storeId_settingKey: {
            storeId: store.id,
            settingKey: `delivery_proof_${proof.shipmentId}`,
          },
        },
        update: {
          settingValue: JSON.stringify(proofData),
          updatedAt: new Date(),
        },
        create: {
          storeId: store.id,
          settingKey: `delivery_proof_${proof.shipmentId}`,
          settingValue: JSON.stringify(proofData),
          settingType: "json",
        },
      });
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ── Confirmation Generation ────────────────────────────────────

/**
 * Generate a delivery confirmation summary object.
 * This can be used to display confirmation to the driver,
 * send to the pharmacy, or generate a printable PDF.
 */
export async function generateDeliveryConfirmation(
  shipmentId: string
): Promise<DeliveryConfirmation | null> {
  try {
    const { prisma } = await import("@/lib/prisma");

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        patient: true,
        address: true,
        shipper: { select: { firstName: true, lastName: true } },
      },
    });

    if (!shipment) return null;

    // Retrieve stored proof
    const store = await prisma.store.findFirst({ where: { isActive: true } });
    let proofData: Record<string, unknown> | null = null;

    if (store) {
      const setting = await prisma.storeSetting.findUnique({
        where: {
          storeId_settingKey: {
            storeId: store.id,
            settingKey: `delivery_proof_${shipmentId}`,
          },
        },
      });
      if (setting) {
        proofData = JSON.parse(setting.settingValue) as Record<string, unknown>;
      }
    }

    const addressStr = shipment.address
      ? `${shipment.address.line1}, ${shipment.address.city}, ${shipment.address.state} ${shipment.address.zip}`
      : "No address on file";

    return {
      shipmentId,
      patientName: `${shipment.patient.firstName} ${shipment.patient.lastName}`,
      address: addressStr,
      deliveredAt: shipment.actualDelivery?.toISOString() ?? new Date().toISOString(),
      gpsCoordinates: (proofData?.gpsCoordinates as GpsCoordinates) ?? null,
      hasSignature: !!proofData?.signatureBase64,
      hasPhoto: !!proofData?.photoBase64,
      hasIdVerification: !!proofData?.idVerification,
      driverName: shipment.shipper
        ? `${shipment.shipper.firstName} ${shipment.shipper.lastName}`
        : null,
      notes: (proofData?.notes as string) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Check whether a shipment requires controlled-substance ID verification.
 * Checks if any packing-list item is a schedule II-V drug.
 */
export async function requiresControlledSubstanceVerification(
  shipmentId: string
): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/prisma");

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        packingList: {
          include: {
            items: {
              include: {
                fill: {
                  include: {
                    prescription: {
                      select: {
                        item: { select: { isControlled: true, deaSchedule: true } },
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

    if (!shipment?.packingList?.items) return false;

    return shipment.packingList.items.some((item) => {
      const rx = item.fill?.prescription;
      if (!rx?.item) return false;
      return rx.item.isControlled || (rx.item.deaSchedule && ["2", "3", "4", "5", "II", "III", "IV", "V"].includes(rx.item.deaSchedule));
    });
  } catch {
    return false;
  }
}
