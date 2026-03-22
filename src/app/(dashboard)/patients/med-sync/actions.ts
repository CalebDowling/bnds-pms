'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface PatientMedSync {
  enrolled: boolean;
  syncDay: number;
  medications: string[];
}

export async function getMedSyncPatients() {
  try {
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
