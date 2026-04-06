import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateMAR, type MARRequest } from "@/lib/ltc/mar-generator";
import { onMARGenerated } from "@/lib/integrations/keragon-events";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/ltc/mar?facilityId=...&startDate=...&endDate=...&wingId=...&patientId=...
 * Generate a MAR PDF for a facility (or wing, or single patient).
 *
 * Query params:
 *   facilityId  (required) — facility UUID
 *   startDate   (required) — YYYY-MM-DD start of MAR period
 *   endDate     (required) — YYYY-MM-DD end of MAR period
 *   wingId      (optional) — filter to specific wing
 *   patientId   (optional) — filter to single patient
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const facilityId = params.get("facilityId");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const wingId = params.get("wingId") || undefined;
  const patientId = params.get("patientId") || undefined;

  if (!facilityId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required params: facilityId, startDate, endDate" },
      { status: 400 }
    );
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (end < start) {
    return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
  }

  // Max 31-day range
  const daySpan = (end.getTime() - start.getTime()) / 86400000;
  if (daySpan > 31) {
    return NextResponse.json({ error: "Date range cannot exceed 31 days" }, { status: 400 });
  }

  try {
    const marRequest: MARRequest = {
      facilityId,
      wingId,
      patientId,
      startDate: start,
      endDate: end,
      generatedBy: user.id,
    };

    const result = await generateMAR(marRequest);

    // Audit log
    await logAudit({
      userId: user.id,
      action: "EXPORT",
      resource: "mar",
      resourceId: facilityId,
      newValues: {
        facilityName: result.facilityName,
        wingName: result.wingName,
        patientCount: result.patientCount,
        medicationCount: result.medicationCount,
        startDate: result.startDate,
        endDate: result.endDate,
      },
    }).catch(() => {});

    // Fire Keragon event (async, fire-and-forget)
    onMARGenerated({
      facilityId,
      facilityName: result.facilityName,
      wingId,
      wingName: result.wingName,
      patientCount: result.patientCount,
      medicationCount: result.medicationCount,
      periodStart: startDate,
      periodEnd: endDate,
      generatedBy: user.id,
    }).catch(() => {});

    // Return PDF
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="MAR_${result.facilityName.replace(/\s+/g, "_")}_${startDate}_${endDate}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("MAR generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate MAR", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ltc/mar
 * Same as GET but accepts a JSON body. Useful for more complex requests.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { facilityId, startDate, endDate, wingId, patientId } = body;

  if (!facilityId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required fields: facilityId, startDate, endDate" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  try {
    const result = await generateMAR({
      facilityId,
      wingId,
      patientId,
      startDate: start,
      endDate: end,
      generatedBy: user.id,
    });

    // Audit + Keragon (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "EXPORT",
      resource: "mar",
      resourceId: facilityId,
      newValues: {
        facilityName: result.facilityName,
        patientCount: result.patientCount,
        medicationCount: result.medicationCount,
      },
    }).catch(() => {});

    onMARGenerated({
      facilityId,
      facilityName: result.facilityName,
      wingId,
      wingName: result.wingName,
      patientCount: result.patientCount,
      medicationCount: result.medicationCount,
      periodStart: startDate,
      periodEnd: endDate,
      generatedBy: user.id,
    }).catch(() => {});

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="MAR_${result.facilityName.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("MAR generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate MAR", details: err.message },
      { status: 500 }
    );
  }
}
