"use server";

import { PrescriptionFill } from "@prisma/client";

const PAGE_SIZE = 20;

interface PickupData {
  signatureBase64: string;
  checklistVerified: {
    idVerified: boolean;
    counselingOffered: boolean;
    allergiesReviewed: boolean;
  };
  pickupPerson?: {
    name: string;
    relationship: string;
    idType: string;
    idNumber?: string;
  };
  completedAt: string;
  completedBy: string;
}

export async function getReadyForPickup(
  search?: string,
  page: number = 1
): Promise<{
  fills: Array<
    PrescriptionFill & {
      prescription: {
        rxNumber: string;
        patient: {
          id: string;
          firstName: string;
          lastName: string;
          mrn: string;
        };
        item: {
          id: string;
          name: string;
        } | null;
      };
    }
  >;
  total: number;
  pages: number;
}> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const offset = (page - 1) * PAGE_SIZE;

  // Build where clause
  let where: any = {
    status: {
      in: ["ready", "verified", "completed"],
    },
  };

  if (search) {
    where = {
      ...where,
      OR: [
        {
          prescription: {
            rxNumber: {
              ilike: `%${search}%`,
            },
          },
        },
        {
          prescription: {
            patient: {
              firstName: {
                ilike: `%${search}%`,
              },
            },
          },
        },
        {
          prescription: {
            patient: {
              lastName: {
                ilike: `%${search}%`,
              },
            },
          },
        },
        {
          prescription: {
            patient: {
              mrn: {
                ilike: `%${search}%`,
              },
            },
          },
        },
      ],
    };
  }

  const [fills, total] = await Promise.all([
    prisma.prescriptionFill.findMany({
      where,
      include: {
        prescription: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: PAGE_SIZE,
    }),
    prisma.prescriptionFill.count({ where }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  return { fills: fills as any, total, pages };
}

export async function getPickupFill(fillId: string): Promise<
  PrescriptionFill & {
    prescription: {
      rxNumber: string;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        mrn: string;
        dateOfBirth: Date;
      };
      item: {
        id: string;
        name: string;
      } | null;
      prescriber: {
        id: string;
        firstName: string;
        lastName: string;
        npi?: string;
      } | null;
    };
  }
> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
            },
          },
          prescriber: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              npi: true,
            },
          },
        },
      },
    },
  });

  if (!fill) throw new Error("Fill not found");

  return fill as any;
}

export async function completePickup(
  fillId: string,
  data: PickupData
): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
  });

  if (!fill) throw new Error("Fill not found");

  // Update the fill with pickup data in metadata
  await prisma.prescriptionFill.update({
    where: { id: fillId },
    data: {
      status: "dispensed",
      dispensedAt: new Date(),
      metadata: {
        ...(fill.metadata as any),
        pickupRecord: {
          signatureBase64: data.signatureBase64,
          checklist: data.checklistVerified,
          pickupPerson: data.pickupPerson,
          completedAt: data.completedAt,
          completedBy: data.completedBy,
        },
      },
    },
  });

  // Log the status change
  await prisma.prescriptionStatusLog.create({
    data: {
      prescriptionId: fill.prescriptionId,
      fromStatus: fill.status,
      toStatus: "dispensed",
      changedBy: user.id,
      notes: "Patient pickup completed with signature capture",
      changedAt: new Date(),
    },
  });
}

export async function getPickupHistory(
  search?: string,
  page: number = 1
): Promise<{
  fills: Array<
    PrescriptionFill & {
      prescription: {
        rxNumber: string;
        patient: {
          id: string;
          firstName: string;
          lastName: string;
          mrn: string;
        };
        item: {
          id: string;
          name: string;
        } | null;
      };
    }
  >;
  total: number;
  pages: number;
}> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const offset = (page - 1) * PAGE_SIZE;

  // Build where clause
  let where: any = {
    status: "dispensed",
    metadata: {
      path: ["pickupRecord"],
      not: null,
    },
  };

  if (search) {
    where = {
      ...where,
      OR: [
        {
          prescription: {
            rxNumber: {
              ilike: `%${search}%`,
            },
          },
        },
        {
          prescription: {
            patient: {
              firstName: {
                ilike: `%${search}%`,
              },
            },
          },
        },
        {
          prescription: {
            patient: {
              lastName: {
                ilike: `%${search}%`,
              },
            },
          },
        },
      ],
    };
  }

  const [fills, total] = await Promise.all([
    prisma.prescriptionFill.findMany({
      where,
      include: {
        prescription: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        dispensedAt: "desc",
      },
      skip: offset,
      take: PAGE_SIZE,
    }),
    prisma.prescriptionFill.count({ where }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  return { fills: fills as any, total, pages };
}
