import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryPDMP, analyzePDMPResults } from "@/lib/integrations/pdmp";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: parsed.data.patientId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      ssnLastFour: true,
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const result = await queryPDMP({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth.toISOString().split("T")[0],
    ssnLastFour: patient.ssnLastFour || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const analysis = analyzePDMPResults(result.dispensations);

  // Log the PDMP query for audit
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PDMP_QUERY",
        tableName: "patients",
        recordId: parsed.data.patientId,
        newValues: JSON.stringify({
          queryId: result.queryId,
          dispensationCount: result.dispensations.length,
          riskLevel: analysis.riskLevel,
        }),
      },
    });
  } catch {
    // Non-critical
  }

  return NextResponse.json({
    success: true,
    patientMatch: result.patientMatch,
    dispensations: result.dispensations,
    alerts: result.alerts,
    analysis,
    queryId: result.queryId,
  });
}
