import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiAuth, apiOk, apiError } from "@/lib/api/with-api-auth";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ListQuerySchema = z.object({
  status: z.string().optional(),
  patientId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const GET = withApiAuth({ resource: "fills", action: "read" }, async (req) => {
  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return apiError("invalid_query", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }
  const { status, patientId, page, pageSize } = parsed.data;
  if (patientId && !UUID_REGEX.test(patientId)) {
    return apiError("invalid_query", "patientId must be a UUID.", 400);
  }

  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (patientId) where.prescription = { patientId };

  const [rows, total] = await Promise.all([
    prisma.prescriptionFill.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.prescriptionFill.count({ where }),
  ]);

  const data = rows.map((f) => ({
    id: f.id,
    prescriptionId: f.prescriptionId,
    fillNumber: f.fillNumber ?? 1,
    status: f.status,
    quantityFilled: Number(f.quantity ?? 0),
    filledAt: f.filledAt?.toISOString() ?? null,
    verifiedAt: f.verifiedAt?.toISOString() ?? null,
    binLocation: f.binLocation ?? null,
    copay: f.copayAmount ? Number(f.copayAmount) : null,
  }));

  return apiOk(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});
