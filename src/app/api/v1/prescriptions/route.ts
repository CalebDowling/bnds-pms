import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiAuth, apiOk, apiError } from "@/lib/api/with-api-auth";

export const dynamic = "force-dynamic";

const ListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const GET = withApiAuth({ resource: "prescriptions", action: "read" }, async (req) => {
  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return apiError("invalid_query", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }
  const { search, status, page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { rxNumber: { contains: s, mode: "insensitive" } },
      { patient: { firstName: { contains: s, mode: "insensitive" } } },
      { patient: { lastName: { contains: s, mode: "insensitive" } } },
      { patient: { mrn: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true } },
        prescriber: { select: { firstName: true, lastName: true, suffix: true } },
        item: { select: { name: true, ndc: true, strength: true } },
        formula: { select: { name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.prescription.count({ where }),
  ]);

  const data = rows.map((rx) => ({
    id: rx.id,
    rxNumber: rx.rxNumber,
    patientId: rx.patient.id,
    prescriberName: [
      rx.prescriber.firstName,
      rx.prescriber.lastName,
      rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : "",
    ]
      .join(" ")
      .trim(),
    medicationName: rx.item?.name ?? rx.formula?.name ?? "—",
    ndc: rx.item?.ndc ?? null,
    sig: rx.directions ?? "",
    quantity: Number(rx.quantityPrescribed ?? 0),
    daysSupply: Number(rx.daysSupply ?? 0),
    refillsRemaining: Number(rx.refillsRemaining ?? 0),
    status: rx.status,
    createdAt: rx.createdAt.toISOString(),
  }));

  return apiOk(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});
