import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiAuth, apiOk, apiError } from "@/lib/api/with-api-auth";

export const dynamic = "force-dynamic";

const ListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("active"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const GET = withApiAuth({ resource: "patients", action: "read" }, async (req) => {
  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return apiError("invalid_query", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }
  const { search, status, page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { firstName: { contains: s, mode: "insensitive" } },
      { lastName: { contains: s, mode: "insensitive" } },
      { mrn: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        phoneNumbers: { where: { isPrimary: true }, take: 1 },
        allergies: true,
      },
      skip,
      take: pageSize,
      orderBy: { lastName: "asc" },
    }),
    prisma.patient.count({ where }),
  ]);

  const data = rows.map((p) => ({
    id: p.id,
    mrn: p.mrn,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().split("T")[0],
    gender: p.gender ?? null,
    email: p.email ?? null,
    phone: p.phoneNumbers[0]?.number ?? null,
    status: p.status,
    allergies: p.allergies.map((a) => ({
      allergen: a.allergen,
      severity: a.severity ?? null,
    })),
    createdAt: p.createdAt.toISOString(),
  }));

  return apiOk(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});
