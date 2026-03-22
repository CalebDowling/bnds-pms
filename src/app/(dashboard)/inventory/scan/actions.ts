'use server';

export async function lookupByNDC(ndc: string) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const item = await prisma.item.findFirst({
      where: { ndc },
      select: {
        id: true,
        ndc: true,
        name: true,
        strength: true,
        manufacturer: true,
        dosageForm: true,
        packageSize: true,
      },
    });

    return item;
  } catch (error) {
    console.error('NDC lookup error:', error);
    throw error;
  }
}

export async function checkInItem(
  itemId: string,
  quantity: number,
  lotNumber?: string,
  expirationDate?: string
) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return {
        success: false,
        message: 'Item not found',
      };
    }

    // Create or update item lot
    const lot = await prisma.itemLot.create({
      data: {
        itemId,
        lotNumber: lotNumber || `AUTO-${Date.now()}`,
        quantityReceived: quantity,
        quantityOnHand: quantity,
        unit: item.unitOfMeasure || 'unit',
        expirationDate: expirationDate
          ? new Date(expirationDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
        dateReceived: new Date(),
        status: 'available',
      },
    });

    // Create inventory transaction
    await prisma.inventoryTransaction.create({
      data: {
        itemLotId: lot.id,
        transactionType: 'receipt',
        quantity,
        performedBy: user.id,
        notes: `Barcode check-in: ${lotNumber || 'Auto-generated lot'}`,
      },
    });

    return {
      success: true,
      message: `Checked in ${quantity} units of ${item.name}`,
      data: { lotId: lot.id },
    };
  } catch (error) {
    console.error('Check-in error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Check-in failed',
    };
  }
}

export async function verifyDispensing(fillId: string, scannedNDC: string) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const fill = await prisma.prescriptionFill.findUnique({
      where: { id: fillId },
      include: {
        prescription: {
          include: {
            item: true,
            formula: true,
          },
        },
        item: true,
      },
    });

    if (!fill) {
      return {
        success: false,
        message: 'Fill not found',
      };
    }

    // For non-compound fills, check NDC match
    if (!fill.prescription.isCompound && fill.prescription.item) {
      const expectedNDC = fill.prescription.item.ndc;
      const matches = expectedNDC === scannedNDC;

      return {
        success: matches,
        message: matches
          ? `✓ Correct drug: ${fill.prescription.item.name}`
          : `✗ Mismatch! Expected: ${expectedNDC}, Scanned: ${scannedNDC}`,
        data: {
          matches,
          expectedNDC,
          scannedNDC,
          drugName: fill.prescription.item.name,
        },
      };
    }

    // For compound fills, verify against batch
    if (fill.batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: fill.batchId },
        include: {
          formulaVersion: {
            include: {
              ingredients: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      });

      if (batch) {
        const ingredients = batch.formulaVersion.ingredients;
        const hasNDC = ingredients.some((ing) => ing.item.ndc === scannedNDC);

        return {
          success: hasNDC,
          message: hasNDC
            ? `✓ Ingredient verified in batch ${batch.batchNumber}`
            : `✗ NDC not found in batch ingredients`,
          data: { hasNDC, batchNumber: batch.batchNumber },
        };
      }
    }

    return {
      success: false,
      message: 'Unable to verify: no match criteria',
    };
  } catch (error) {
    console.error('Verify dispensing error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}
