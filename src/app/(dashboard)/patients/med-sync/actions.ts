'use server';

interface PatientMedSync {
  enrolled: boolean;
  syncDay: number;
  medications: string[];
}

export async function getMedSyncPatients() {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const patients = await prisma.patient.findMany({
      where: {
        metadata: {
          path: ['medSync', 'enrolled'],
          equals: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mrn: true,
        metadata: true,
      },
    });

    return patients;
  } catch (error) {
    console.error('Error fetching med sync patients:', error);
    throw error;
  }
}

export async function enrollPatient(
  patientId: string,
  syncDay: number,
  medicationIds: string[]
) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const medSyncData: PatientMedSync = {
      enrolled: true,
      syncDay,
      medications: medicationIds,
    };

    const metadata = (patient.metadata as any) || {};

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        metadata: {
          ...metadata,
          medSync: medSyncData,
        },
      },
    });

    return {
      success: true,
      message: `Enrolled ${patient.firstName} ${patient.lastName} in med sync`,
      data: updated,
    };
  } catch (error) {
    console.error('Enrollment error:', error);
    throw error;
  }
}

export async function unenrollPatient(patientId: string) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const metadata = (patient.metadata as any) || {};
    const medSync = metadata.medSync || {};

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        metadata: {
          ...metadata,
          medSync: {
            ...medSync,
            enrolled: false,
          },
        },
      },
    });

    return {
      success: true,
      message: `Unenrolled from med sync`,
      data: updated,
    };
  } catch (error) {
    console.error('Unenrollment error:', error);
    throw error;
  }
}

export async function generateSyncBatch(date: Date) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const dayOfMonth = date.getDate();

    // Get all patients due for sync today
    const patients = await prisma.patient.findMany({
      where: {
        metadata: {
          path: ['medSync', 'enrolled'],
          equals: true,
        },
      },
      include: {
        syncLists: {
          include: {
            prescription: true,
          },
        },
      },
    });

    let fillsCreated = 0;

    for (const patient of patients) {
      const medSyncData = (patient.metadata as any)?.medSync;
      if (!medSyncData || medSyncData.syncDay !== dayOfMonth) {
        continue;
      }

      // Get active sync prescriptions for this patient
      const syncPrescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patient.id,
          isActive: true,
          syncLists: {
            some: {
              isActive: true,
            },
          },
        },
      });

      // Create a fill for each synced medication
      for (const prescription of syncPrescriptions) {
        const lastFill = await prisma.prescriptionFill.findFirst({
          where: { prescriptionId: prescription.id },
          orderBy: { fillNumber: 'desc' },
        });

        const nextFillNumber = (lastFill?.fillNumber || 0) + 1;

        await prisma.prescriptionFill.create({
          data: {
            prescriptionId: prescription.id,
            fillNumber: nextFillNumber,
            quantity: prescription.quantityPrescribed || 30,
            status: 'pending',
            itemId: prescription.itemId,
          },
        });

        fillsCreated++;
      }
    }

    return {
      success: true,
      message: `Generated ${fillsCreated} fills for med sync batch`,
      fillsCreated,
    };
  } catch (error) {
    console.error('Generate batch error:', error);
    throw error;
  }
}

export async function getMedSyncStats() {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    // Get enrolled patient count
    const enrolledCount = await prisma.patient.count({
      where: {
        metadata: {
          path: ['medSync', 'enrolled'],
          equals: true,
        },
      },
    });

    // Get next sync batch date (next occurrence of most common sync day)
    const patientsWithDates = await prisma.patient.findMany({
      where: {
        metadata: {
          path: ['medSync', 'enrolled'],
          equals: true,
        },
      },
      select: {
        metadata: true,
      },
    });

    let nextBatchDate: Date | null = null;

    if (patientsWithDates.length > 0) {
      const syncDays = patientsWithDates
        .map((p) => (p.metadata as any)?.medSync?.syncDay)
        .filter((d) => d);

      if (syncDays.length > 0) {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const mostCommonDay = Math.max(...syncDays);

        if (mostCommonDay > dayOfMonth) {
          nextBatchDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            mostCommonDay
          );
        } else {
          nextBatchDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            mostCommonDay
          );
        }
      }
    }

    // Calculate average meds per patient
    const totalMeds = patientsWithDates.reduce((sum, p) => {
      const medications = (p.metadata as any)?.medSync?.medications || [];
      return sum + (Array.isArray(medications) ? medications.length : 0);
    }, 0);

    const avgMedsPerPatient =
      enrolledCount > 0 ? totalMeds / enrolledCount : 0;

    return {
      enrolledCount,
      nextBatchDate: nextBatchDate?.toISOString() || null,
      avgMedsPerPatient,
    };
  } catch (error) {
    console.error('Error getting med sync stats:', error);
    throw error;
  }
}

export async function getPatientPrescriptions(patientId: string) {
  // Get active prescriptions for enrollment selection
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  return prisma.prescription.findMany({
    where: { patientId, isActive: true },
    include: { item: { select: { name: true, genericName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function searchPatientsForSync(query: string) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  if (!query || query.length < 2) return [];

  return prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { mrn: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, mrn: true, metadata: true },
    take: 10,
  });
}

export async function getSyncCalendar() {
  // Returns data for a monthly calendar view showing which days have sync batches
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const patients = await prisma.patient.findMany({
    where: {
      metadata: { path: ['medSync', 'enrolled'], equals: true },
    },
    select: { id: true, firstName: true, lastName: true, metadata: true },
  });

  // Build a map of day-of-month -> patients
  const calendarData: Record<number, { patientId: string; name: string; medCount: number }[]> = {};

  for (const patient of patients) {
    const medSync = (patient.metadata as any)?.medSync;
    if (!medSync?.syncDay) continue;
    const day = medSync.syncDay;
    if (!calendarData[day]) calendarData[day] = [];
    calendarData[day].push({
      patientId: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      medCount: medSync.medications?.length || 0,
    });
  }

  return calendarData;
}

export async function getAdherenceData() {
  // Get adherence metrics for enrolled patients
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const patients = await prisma.patient.findMany({
    where: {
      metadata: { path: ['medSync', 'enrolled'], equals: true },
    },
    include: {
      prescriptions: {
        where: { isActive: true },
        include: {
          fills: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      },
    },
  });

  let totalPatients = patients.length;
  let adherentPatients = 0;
  let totalMeds = 0;
  let onTimeFills = 0;

  for (const patient of patients) {
    const medSync = (patient.metadata as any)?.medSync;
    if (!medSync) continue;

    let patientAdherent = true;
    for (const rx of patient.prescriptions) {
      totalMeds++;
      const lastFill = rx.fills[0];
      if (lastFill) {
        const daysSinceFill = Math.floor((Date.now() - new Date(lastFill.createdAt).getTime()) / 86400000);
        const daysSupply = (rx as any).daysSupply || 30;
        if (daysSinceFill <= daysSupply + 7) {
          onTimeFills++;
        } else {
          patientAdherent = false;
        }
      } else {
        patientAdherent = false;
      }
    }
    if (patientAdherent) adherentPatients++;
  }

  return {
    totalPatients,
    adherentPatients,
    adherenceRate: totalPatients > 0 ? Math.round((adherentPatients / totalPatients) * 100) : 0,
    totalMeds,
    onTimeFills,
    fillRate: totalMeds > 0 ? Math.round((onTimeFills / totalMeds) * 100) : 0,
  };
}
